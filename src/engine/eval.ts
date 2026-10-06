import type { Expr, Env, FpValue, FpFunction, FpLazyList, ProgramState, MatchCase } from './types';
import { isFn, isList, isAdt, isEither, isMaybe, isLazy, reprOf, strOf, lazyNext } from './value';

export class EvalError extends Error {}

/** Built-ins whose use inside a body marks a function as impure. */
const IMPURE_BUILTINS = new Set(['io', 'run', 'print', 'read', 'random', 'now', 'bump', 'count']);

/** Zero-arity builtins that are *values* (auto-evaluated on a bare reference)
 * rather than functions: `let m = nothing` binds the None value, not a function.
 * (`bump`/`count` stay functions — they are called as `bump()`.) */
const VALUE_BUILTINS = new Set(['nothing', 'none']);

/** Walk an expression and report whether it touches an impure built-in. */
export function isImpureExpr(e: Expr): boolean {
  switch (e.t) {
    case 'ident':
      return IMPURE_BUILTINS.has(e.name);
    case 'app':
      return isImpureExpr(e.fn) || e.args.some(isImpureExpr);
    case 'bin':
      return isImpureExpr(e.l) || isImpureExpr(e.r);
    case 'un':
      return isImpureExpr(e.e);
    case 'list':
      return e.items.some(isImpureExpr);
    case 'if':
      return isImpureExpr(e.cond) || isImpureExpr(e.then) || isImpureExpr(e.else);
    case 'fn':
      return isImpureExpr(e.body);
    case 'let':
      return isImpureExpr(e.value) || isImpureExpr(e.in);
    case 'match':
      return e.cases.some((c) => isImpureExpr(c.body));
    case 'cons':
      return e.args.some(isImpureExpr);
    default:
      return false;
  }
}

interface Builtin {
  arity: number | -1;
  run: (args: FpValue[], env: Env, state: ProgramState) => FpValue;
}

function asFn(v: FpValue, what: string): FpFunction {
  if (!isFn(v)) throw new EvalError(`${what} expects a function, got ${reprOf(v)}`);
  return v;
}
function asList(v: FpValue, what: string): FpValue[] {
  if (!isList(v)) throw new EvalError(`${what} expects a list, got ${reprOf(v)}`);
  return v.items;
}
function asNum(v: FpValue, what: string): number {
  if (typeof v !== 'number') throw new EvalError(`${what} expects a number, got ${reprOf(v)}`);
  return v;
}
function isTruthy(v: FpValue): boolean {
  return v === true;
}
function valuesEqual(a: FpValue, b: FpValue): boolean {
  if (typeof a === 'number' && typeof b === 'number') return a === b;
  if (typeof a === 'boolean' && typeof b === 'boolean') return a === b;
  if (isList(a) && isList(b)) {
    if (a.items.length !== b.items.length) return false;
    return a.items.every((x, i) => valuesEqual(x, b.items[i] as FpValue));
  }
  if (isAdt(a) && isAdt(b)) {
    if (a.cons !== b.cons || a.args.length !== b.args.length) return false;
    return a.args.every((x, i) => valuesEqual(x, b.args[i] as FpValue));
  }
  if (strOf(a) !== null && strOf(b) !== null) return strOf(a) === strOf(b);
  return reprOf(a) === reprOf(b);
}

const BUILTINS: Record<string, Builtin> = {
  // ── Higher-order over lists ────────────────────────────────────────────
  map: {
    arity: 2,
    run: ([f, coll], env, state) => {
      const fn = asFn(f, 'map');
      if (isList(coll)) return { __list: true, items: coll.items.map((x) => applyFn(fn, [x], env, state)) };
      if (isEither(coll)) return coll.side === 'Right' ? { __either: true, side: 'Right', v: applyFn(fn, [coll.v], env, state) } : { __either: true, side: 'Left', v: coll.v };
      if (isMaybe(coll)) return coll.just ? { __maybe: true, just: true, v: applyFn(fn, [coll.v], env, state) } : { __maybe: true, just: false, v: undefined as unknown as FpValue };
      throw new EvalError(`map expects a list/either/maybe, got ${reprOf(coll)}`);
    },
  },
  filter: {
    arity: 2,
    run: ([f, coll], env, state) => {
      const fn = asFn(f, 'filter');
      return { __list: true, items: asList(coll, 'filter').filter((x) => isTruthy(applyFn(fn, [x], env, state))) };
    },
  },
  fold: {
    arity: 3,
    run: ([init, f, list], env, state) => {
      const fn = asFn(f, 'fold');
      return asList(list, 'fold').reduce((acc, x) => applyFn(fn, [acc, x], env, state), init as FpValue);
    },
  },
  scan: {
    arity: 3,
    run: ([init, f, list], env, state) => {
      const fn = asFn(f, 'scan');
      let acc = init as FpValue;
      const out: FpValue[] = [acc];
      for (const x of asList(list, 'scan')) {
        acc = applyFn(fn, [acc, x], env, state);
        out.push(acc);
      }
      return { __list: true, items: out };
    },
  },
  // ── Composition as a value ─────────────────────────────────────────────
  compose: {
    arity: -1,
    run: (args) => {
      const fns = args.map((a) => asFn(a, 'compose'));
      return {
        __fn: true,
        name: `compose(${fns.map((f) => f.name).join(',')})`,
        params: ['x'],
        body: { t: 'ident', name: '\0compose' },
        env: { values: {}, fns: {}, adts: {} },
        pure: fns.every((f) => f.pure),
        composeChain: fns,
      };
    },
  },
  // ── List basics ────────────────────────────────────────────────────────
  sum: { arity: 1, run: ([l]) => asList(l, 'sum').reduce<number>((a, x) => a + asNum(x, 'sum'), 0) },
  product: { arity: 1, run: ([l]) => asList(l, 'product').reduce<number>((a, x) => a * asNum(x, 'product'), 1) },
  length: { arity: 1, run: ([l]) => asList(l, 'length').length },
  head: { arity: 1, run: ([l]) => { const it = asList(l, 'head'); if (!it.length) throw new EvalError('head of empty list'); return it[0] as FpValue; } },
  tail: { arity: 1, run: ([l]) => ({ __list: true, items: asList(l, 'tail').slice(1) }) },
  // ── Maybe ───────────────────────────────────────────────────────────────
  just: { arity: 1, run: ([v]) => ({ __maybe: true, just: true, v: v as FpValue }) },
  nothing: { arity: 0, run: () => ({ __maybe: true, just: false, v: undefined as unknown as FpValue }) },
  none: { arity: 0, run: () => ({ __maybe: true, just: false, v: undefined as unknown as FpValue }) },
  isJust: { arity: 1, run: ([m]) => isMaybe(m) && m.just },
  isNothing: { arity: 1, run: ([m]) => isMaybe(m) && !m.just },
  // ── Either ─────────────────────────────────────────────────────────────
  right: { arity: 1, run: ([v]) => ({ __either: true, side: 'Right', v: v as FpValue }) },
  left: { arity: 1, run: ([v]) => ({ __either: true, side: 'Left', v: v as FpValue }) },
  isRight: { arity: 1, run: ([e]) => isEither(e) && e.side === 'Right' },
  isLeft: { arity: 1, run: ([e]) => isEither(e) && e.side === 'Left' },
  // ── Monadic bind (flatMap) over Either / Maybe ─────────────────────────
  // Threads the context: a plain continuation result is re-wrapped into the
  // monad; a Left / Nothing short-circuits and the continuation never runs.
  bind: {
    arity: 2,
    run: ([m, f], env, state) => {
      const fn = asFn(f, 'bind');
      if (isMaybe(m)) {
        if (!m.just) return { __maybe: true, just: false, v: undefined as unknown as FpValue };
        const r = applyFn(fn, [m.v], env, state);
        return isMaybe(r) ? r : { __maybe: true, just: true, v: r };
      }
      if (isEither(m)) {
        if (m.side === 'Left') return { __either: true, side: 'Left', v: m.v };
        const r = applyFn(fn, [m.v], env, state);
        return isEither(r) ? r : { __either: true, side: 'Right', v: r };
      }
      throw new EvalError(`bind expects a maybe/either, got ${reprOf(m)}`);
    },
  },
  flatMap: { arity: 2, run: (a, e, s) => BUILTINS.bind.run(a, e, s) },
  // ── IO (quarantined side effects) ──────────────────────────────────────
  io: { arity: 1, run: ([desc]) => ({ __io: true, action: reprOf(desc) }) },
  run: {
    arity: 1,
    run: ([io], _env, state) => {
      if (!io || (io as FpValue & { __io?: boolean }).__io !== true) throw new EvalError('run expects an IO action');
      const action = (io as { action: string }).action;
      state.effects.push({ action, note: 'executed by run' });
      return { __str: true, v: action.replace(/^["']|["']$/g, '') };
    },
  },
  // ── Laziness: infinite streams (serializable recipes) ──────────────────
  from: {
    arity: 1,
    run: ([n]) => {
      const start = asNum(n, 'from');
      const lazy: FpLazyList = { __lazy: true, name: `countFrom(${start})`, kind: 'from', n: start, cursor: 0 };
      return lazy;
    },
  },
  repeat: {
    arity: 1,
    run: ([v]) => {
      const lazy: FpLazyList = { __lazy: true, name: `repeat(${reprOf(v)})`, kind: 'repeat', item: v, cursor: 0 };
      return lazy;
    },
  },
  take: {
    arity: 2,
    run: ([n, coll]) => {
      const k = asNum(n, 'take');
      const items: FpValue[] = [];
      if (isLazy(coll)) {
        for (let i = 0; i < k; i++) items.push(lazyNext(coll));
      } else {
        items.push(...asList(coll, 'take').slice(0, k));
      }
      return { __list: true, items };
    },
  },
  drop: {
    arity: 2,
    run: ([n, coll]) => {
      const k = asNum(n, 'drop');
      if (isLazy(coll)) {
        const inner: FpLazyList = { __lazy: true, name: `drop(${k}) ${coll.name}`, kind: 'drop', inner: coll, cursor: 0 };
        for (let i = 0; i < k; i++) lazyNext(inner);
        return inner;
      }
      return { __list: true, items: asList(coll, 'drop').slice(k) };
    },
  },
  // ── Convenience ────────────────────────────────────────────────────────
  pure: { arity: 1, run: ([v]) => v },
  // ── Impure demo builtins (shared counter) ──────────────────────────────
  bump: {
    arity: 0,
    run: (_a, _e, state) => {
      state.counter += 1;
      return state.counter;
    },
  },
  count: {
    arity: 0,
    run: (_a, _e, state) => state.counter,
  },
};

function makeBuiltinFn(name: string, b: Builtin): FpFunction {
  const paramCount = b.arity === -1 ? 2 : b.arity;
  return {
    __fn: true,
    name,
    params: Array.from({ length: Math.max(0, paramCount) }, (_, i) => `a${i}`),
    body: { t: 'ident', name: '\0builtin.' + name },
    env: { values: {}, fns: {}, adts: {} },
    pure: !IMPURE_BUILTINS.has(name),
    arity: b.arity === -1 ? -1 : b.arity,
    __builtin: b.run,
  };
}

/** Wrap a builtin so that a later argument completes the call (currying). */
function curriedBuiltin(base: FpFunction, provided: FpValue[]): FpFunction {
  const remaining = (base.arity as number) - provided.length;
  return {
    __fn: true,
    name: base.name,
    params: Array.from({ length: remaining }, (_, i) => `a${i}`),
    body: { t: 'ident', name: '\0builtin.' + base.name },
    env: base.env,
    pure: base.pure,
    arity: remaining,
    __builtin: (rest, e, st) => base.__builtin!( [...provided, ...rest], e, st ),
  };
}

export function applyFn(fn: FpFunction, args: FpValue[], env: Env, state: ProgramState): FpValue {
  // Trace named user/composed functions for the board's pipeline strip.
  if (fn.name && !fn.name.startsWith('λ') && !fn.__builtin && !fn.composeChain) {
    state.pipeline.push(fn.name);
  }
  // Builtin dispatch (with currying for under-application).
  if (fn.__builtin) {
    if (fn.arity !== undefined && fn.arity >= 0) {
      if (args.length > fn.arity) {
        throw new EvalError(`${fn.name} expects ${fn.arity} arg(s), got ${args.length}`);
      }
      if (args.length < fn.arity) return curriedBuiltin(fn, args);
    }
    return fn.__builtin(args, env, state);
  }
  // Composition chain (from `compose`)
  if (fn.composeChain) {
    let val = args[0] as FpValue;
    for (let i = fn.composeChain.length - 1; i >= 0; i--) {
      val = applyFn(fn.composeChain[i] as FpFunction, [val], env, state);
    }
    return val;
  }
  // User lambda. Curried: if there are fewer arguments than parameters, return a
  // partial function that remembers the provided values (e.g. `scale 2` → a scaler).
  const remainingParams = fn.params.length - args.length;
  if (remainingParams > 0) {
    return {
      __fn: true,
      name: fn.name,
      params: fn.params.slice(args.length),
      body: fn.body,
      env: { ...fn.env, values: { ...fn.env.values, ...Object.fromEntries(fn.params.slice(0, args.length).map((p, i) => [p, args[i] as FpValue])) } },
      pure: fn.pure,
    };
  }
  // Lexical frame
  const frame: Env = {
    values: { ...fn.env.values, ...env.values },
    fns: { ...fn.env.fns, ...env.fns },
    adts: { ...fn.env.adts, ...env.adts },
  };
  fn.params.forEach((p, i) => {
    frame.values[p] = args[i] as FpValue;
  });
  return evalExpr(fn.body, frame, state);
}

function matchCase(sc: FpValue, c: MatchCase): boolean {
  if (c.pattern === '_') return true;
  return isAdt(sc) && sc.cons === c.pattern && sc.args.length === c.vars.length;
}

export function evalExpr(e: Expr, env: Env, state: ProgramState): FpValue {
  switch (e.t) {
    case 'num':
    case 'bool':
      return e.v;
    case 'str':
      return { __str: true, v: e.v };
    case 'list':
      return { __list: true, items: e.items.map((x) => evalExpr(x, env, state)) };
    case 'ident': {
      const b = BUILTINS[e.name];
      if (b) {
        // Value builtins (e.g. `nothing`) evaluate to a value on bare reference.
        if (VALUE_BUILTINS.has(e.name) && b.arity === 0) return b.run([], env, state);
        return makeBuiltinFn(e.name, b);
      }
      if (env.fns[e.name]) return env.fns[e.name];
      if (env.values[e.name] !== undefined) return env.values[e.name];
      // Nullary constructors used bare: the list `Nil`, or a registered ADT variant.
      if (/^[A-Z]/.test(e.name)) {
        if (e.name === 'Nil') return { __adt: true, cons: 'Nil', args: [] };
        for (const variants of Object.values(env.adts)) {
          if (variants.includes(e.name)) return { __adt: true, cons: e.name, args: [] };
        }
      }
      throw new EvalError(`Undefined name '${e.name}'`);
    }
    case 'fn':
      return {
        __fn: true,
        name: `λ(${e.params.join(',')})`,
        params: e.params,
        body: e.body,
        env,
        pure: !isImpureExpr(e.body),
      };
    case 'cons':
      return { __adt: true, cons: e.name, args: e.args.map((a) => evalExpr(a, env, state)) };
    case 'app': {
      const fn = evalExpr(e.fn, env, state);
      const args = e.args.map((a) => evalExpr(a, env, state));
      if (!isFn(fn)) throw new EvalError(`Cannot apply non-function ${reprOf(fn)}`);
      return applyFn(fn, args, env, state);
    }
    case 'un': {
      const v = evalExpr(e.e, env, state);
      if (e.op === 'not') return isTruthy(v) ? false : true;
      if (e.op === '-') return -asNum(v, 'unary -');
      throw new EvalError(`Unknown unary op ${e.op}`);
    }
    case 'bin': {
      const a = evalExpr(e.l, env, state);
      const b = evalExpr(e.r, env, state);
      switch (e.op) {
        case '+':
          if (isList(a) && isList(b)) return { __list: true, items: [...a.items, ...b.items] };
          if (strOf(a) !== null && strOf(b) !== null) return { __str: true, v: (strOf(a) as string) + (strOf(b) as string) };
          return asNum(a, '+') + asNum(b, '+');
        case '-': return asNum(a, '-') - asNum(b, '-');
        case '*': return asNum(a, '*') * asNum(b, '*');
        case '/': {
          const d = asNum(b, '/');
          if (d === 0) throw new EvalError('Division by zero');
          return asNum(a, '/') / d;
        }
        case '%': {
          const d = asNum(b, '%');
          if (d === 0) throw new EvalError('Modulo by zero');
          return ((asNum(a, '%') % d) + d) % d;
        }
        case '==': return valuesEqual(a, b);
        case '!=': return !valuesEqual(a, b);
        case '>': return asNum(a, '>') > asNum(b, '>');
        case '<': return asNum(a, '<') < asNum(b, '<');
        case '>=': return asNum(a, '>=') >= asNum(b, '>=');
        case '<=': return asNum(a, '<=') <= asNum(b, '<=');
        case 'and': return isTruthy(a) && isTruthy(b);
        case 'or': return isTruthy(a) || isTruthy(b);
        default:
          throw new EvalError(`Unknown operator ${e.op}`);
      }
    }
    case 'if':
      return isTruthy(evalExpr(e.cond, env, state)) ? evalExpr(e.then, env, state) : evalExpr(e.else, env, state);
    case 'let': {
      const v = evalExpr(e.value, env, state);
      return evalExpr(e.in, { ...env, values: { ...env.values, [e.name]: v } }, state);
    }
    case 'match': {
      const sc = evalExpr(e.scrutinee, env, state);
      for (const c of e.cases) {
        if (matchCase(sc, c)) {
          const frame = { ...env, values: { ...env.values } };
          if (isAdt(sc)) c.vars.forEach((vn, i) => { frame.values[vn] = sc.args[i] as FpValue; });
          return evalExpr(c.body, frame, state);
        }
      }
      throw new EvalError(`No matching case for ${reprOf(sc)}`);
    }
    default:
      throw new EvalError('Unreachable expr node');
  }
}
