import type { Expr, Env } from './types';
import { builtinMeta } from './eval';
import { parseExpr } from './parser';

/**
 * A small, honest type checker for the LearnFP DSL.
 *
 * It is a *checker*, not a full inferencer: it uses the concrete value domains
 * the language actually has (num, bool, str, list, adt, Maybe, Either, IO,
 * stream, fn). It catches the mistakes learners actually make — applying a
 * non-function, a wrong argument count for a builtin, an arithmetic operator
 * on a list, `and`/`not` on a non-boolean, an undefined name — without a
 * Hindley–Milner unifier.
 *
 * Unknowns are tracked as `unknown` and never flagged, so the checker is
 * conservative: it does not report an error for anything the evaluator would
 * accept, and it reports errors for the common cases the evaluator would
 * reject at runtime.
 */

export type FpType =
  | 'num'
  | 'bool'
  | 'str'
  | 'list'
  | 'adt'
  | 'Maybe'
  | 'Either'
  | 'IO'
  | 'stream'
  | 'fn'
  | 'unknown';

export interface TypeErr {
  message: string;
}

interface Ctx {
  errors: TypeErr[];
  fns: Record<string, number>; // name -> arity
  vals: Set<string>; // names bound to a value (type unknown but defined)
  ctors: Record<string, string>; // constructor name -> tag
  add(message: string): void;
}

function makeCtx(): Ctx {
  const errors: TypeErr[] = [];
  return {
    errors,
    fns: {},
    vals: new Set<string>(),
    ctors: { Nil: 'Nil', Cons: 'Cons', Just: 'Just', None: 'None', Right: 'Right', Left: 'Left' },
    add: (message) => errors.push({ message }),
  };
}

const NUM_OPS = new Set(['+', '-', '*', '/', '%']);
const CMP_OPS = new Set(['>', '<', '>=', '<=']);

const label = (t: FpType): string => (t === 'unknown' ? '?' : t);

/**
 * Check an expression, threading the in-scope parameter types. Returns the
 * inferred base type of the expression (best-effort; `unknown` when the value
 * is opaque, e.g. the result of an application).
 */
function checkExpr(e: Expr, ctx: Ctx, params: Map<string, FpType>): FpType {
  switch (e.t) {
    case 'num':
      return 'num';
    case 'bool':
      return 'bool';
    case 'str':
      return 'str';
    case 'list': {
      for (const it of e.items) checkExpr(it, ctx, params);
      return 'list';
    }
    case 'fn': {
      const dup = e.params.find((p, i) => e.params.indexOf(p) !== i);
      if (dup) ctx.add(`function has duplicate parameter '${dup}'`);
      const next = new Map(params);
      for (const p of e.params) if (!next.has(p)) next.set(p, 'unknown');
      return checkExpr(e.body, ctx, next);
    }
    case 'cons': {
      if (!ctx.ctors[e.name]) ctx.add(`unknown constructor '${e.name}' — define the type first`);
      for (const a of e.args) checkExpr(a, ctx, params);
      return 'adt';
    }
    case 'app': {
      const fnT = checkExpr(e.fn, ctx, params);
      const scalar = fnT === 'num' || fnT === 'bool' || fnT === 'str' || fnT === 'list' || fnT === 'adt';
      if (scalar) {
        ctx.add(`cannot apply a value of type ${label(fnT)} — it is not a function`);
        return 'unknown';
      }
      const metaName = e.fn.t === 'ident' ? e.fn.name : null;
      const meta = metaName ? builtinMeta(metaName) : null;
      if (meta && !meta.value && meta.arity >= 0 && e.args.length > meta.arity) {
        ctx.add(`${metaName} takes ${meta.arity} argument${meta.arity === 1 ? '' : 's'}, got ${e.args.length}`);
      }
      for (const a of e.args) checkExpr(a, ctx, params);
      return 'unknown';
    }
    case 'bin': {
      const lt = checkExpr(e.l, ctx, params);
      const rt = checkExpr(e.r, ctx, params);
      if (NUM_OPS.has(e.op) && e.op !== '+') {
        if ((lt !== 'num' && lt !== 'unknown') || (rt !== 'num' && rt !== 'unknown')) {
          ctx.add(`operator '${e.op}' needs numbers (got ${label(lt)} and ${label(rt)})`);
        }
      } else if (e.op === '+') {
        // '+' overloads over num / list / str; flag only an obviously wrong side.
        const bad = [lt, rt].some((t) => t === 'bool' || t === 'fn' || t === 'Maybe' || t === 'Either' || t === 'IO');
        if (bad) ctx.add(`'+' cannot combine ${label(lt)} and ${label(rt)}`);
      } else if (CMP_OPS.has(e.op) && ((lt !== 'num' && lt !== 'unknown') || (rt !== 'num' && rt !== 'unknown'))) {
        ctx.add(`operator '${e.op}' needs numbers (got ${label(lt)} and ${label(rt)})`);
      } else if ((e.op === 'and' || e.op === 'or') && ((lt !== 'bool' && lt !== 'unknown') || (rt !== 'bool' && rt !== 'unknown'))) {
        ctx.add(`'${e.op}' needs booleans (got ${label(lt)} and ${label(rt)})`);
      }
      return CMP_OPS.has(e.op) || e.op === '==' || e.op === '!=' || e.op === 'and' || e.op === 'or' ? 'bool' : NUM_OPS.has(e.op) ? 'num' : 'unknown';
    }
    case 'un': {
      const et = checkExpr(e.e, ctx, params);
      if (e.op === '-' && et !== 'num' && et !== 'unknown') ctx.add(`unary '-' needs a number (got ${label(et)})`);
      if (e.op === 'not' && et !== 'bool' && et !== 'unknown') ctx.add(`'not' needs a boolean (got ${label(et)})`);
      return e.op === 'not' ? 'bool' : et;
    }
    case 'if': {
      const ct = checkExpr(e.cond, ctx, params);
      if (ct !== 'bool' && ct !== 'unknown') ctx.add(`'if' condition must be a boolean (got ${label(ct)})`);
      const a = checkExpr(e.then, ctx, params);
      const b = checkExpr(e.else, ctx, params);
      return a === b ? a : 'unknown';
    }
    case 'let': {
      const vt = checkExpr(e.value, ctx, params);
      const next = new Map(params);
      next.set(e.name, vt);
      return checkExpr(e.in, ctx, next);
    }
    case 'match': {
      checkExpr(e.scrutinee, ctx, params);
      let result: FpType = 'unknown';
      for (const c of e.cases) {
        // The pattern's bound names are in scope for the case body.
        const bodyParams = new Map(params);
        for (const v of c.vars) if (!bodyParams.has(v)) bodyParams.set(v, 'unknown');
        const bodyT = checkExpr(c.body, ctx, bodyParams);
        result = result === 'unknown' ? bodyT : result !== bodyT ? 'unknown' : result;
      }
      if (e.cases.length === 0) ctx.add('match needs at least one case');
      return result;
    }
    case 'ident': {
      const meta = builtinMeta(e.name);
      if (meta) return meta.value ? valueBuiltinType(e.name) : 'fn';
      if (e.name in ctx.fns) return 'fn';
      if (params.has(e.name)) return params.get(e.name)!;
      if (ctx.ctors[e.name]) return 'adt';
      if (ctx.vals.has(e.name)) return 'unknown'; // defined, but type not tracked
      ctx.add(`undefined name '${e.name}'`);
      return 'unknown';
    }
    default:
      return 'unknown';
  }
}

function valueBuiltinType(name: string): FpType {
  if (name === 'nothing' || name === 'none') return 'Maybe';
  return 'unknown';
}

function initCtx(env: Env): Ctx {
  const ctx = makeCtx();
  for (const [name, f] of Object.entries(env.fns)) ctx.fns[name] = f.arity ?? f.params.length;
  for (const name of Object.keys(env.values)) ctx.vals.add(name);
  for (const variants of Object.values(env.adts)) for (const v of variants) ctx.ctors[v] = v;
  return ctx;
}

/**
 * Check a full command line. Returns a list of type errors (empty when the
 * command type-checks). Parse errors are left to the parser's own message —
 * a command that does not parse is not a *type* problem.
 */
export function checkCommand(cmd: string, env: Env): TypeErr[] {
  const s = cmd.trim();
  if (!s) return [];
  if (/^type\s/.test(s)) return []; // constructors are validated by the parser/commands layer

  const letM = s.match(/^let\s+[A-Za-z_]\w*\s*=\s*([\s\S]+)$/);
  const defM = s.match(/^def\s+[A-Za-z_]\w*\s*=\s*([\s\S]+)$/);
  const runM = s.match(/^run\s+([\s\S]+)$/);
  const exprSrc = letM ? letM[1] : defM ? defM[1] : runM ? runM[1] : null;
  if (!exprSrc) return [];

  let e: Expr;
  try {
    e = parseExpr(exprSrc);
  } catch {
    return []; // let the parser report the syntax error
  }

  const ctx = initCtx(env);
  if (defM) {
    if (e.t !== 'fn') {
      ctx.add('def needs a function, e.g. `def f = fn (n) -> n * 2`');
      return ctx.errors;
    }
    // Register the name before checking the body so self-recursion
    // (`def f = fn (…) -> … f …`) resolves — recursion is a core FP idiom.
    const defName = s.match(/^def\s+([A-Za-z_]\w*)\s*=/)?.[1];
    if (defName) ctx.fns[defName] = e.params.length;
    checkExpr(e, ctx, new Map());
    return ctx.errors;
  }
  if (letM && e.t === 'fn') {
    ctx.add(`'let' binds a value, but this is a function — use \`def\``);
  }
  checkExpr(e, ctx, new Map());
  return ctx.errors;
}
