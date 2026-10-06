import type { CommandResult, FpFunction, FpValue, ProgramState } from './types';
import { cloneState, defineAdt, defineFn, refresh, valueOf } from './state';
import { parseExpr } from './parser';
import { evalExpr, isImpureExpr } from './eval';
import { reprOf, typeOf, effectfulOf } from './value';
import { teachAfterCommand } from './teach';
import { findConcept, formatConcepts } from './glossary';
import { codeFor } from '../languages';

export interface CommandContext {
  state: ProgramState;
  raw: string;
}

/** Commands that mutate the program and count toward command golf. */
const COUNTING = /^(let |def |type |run |compose )/;

export function commandCountsForGolf(raw: string): boolean {
  return COUNTING.test(raw.trim());
}

function ok(output: string): CommandResult {
  return { ok: true, output };
}
function fail(error: string): CommandResult {
  return { ok: false, output: '', error };
}

function envOf(state: ProgramState) {
  return { values: state.env.values, fns: state.env.fns, adts: state.env.adts };
}

/** Evaluate an expression against the current state; returns the value. */
function evaluate(state: ProgramState, exprSrc: string): FpValue {
  const e = parseExpr(exprSrc);
  state.pipeline = [];
  return evalExpr(e, envOf(state), state);
}

function parseDef(src: string): { name: string; expr: string } | null {
  // `def <name> = <expr>`
  const m = src.match(/^def\s+([A-Za-z_][\w]*)\s*=\s*([\s\S]+)$/);
  if (!m) return null;
  return { name: m[1]!, expr: m[2]!.trim() };
}

function parseLet(src: string): { name: string; expr: string } | null {
  const m = src.match(/^let\s+([A-Za-z_][\w]*)\s*=\s*([\s\S]+)$/);
  if (!m) return null;
  return { name: m[1]!, expr: m[2]!.trim() };
}

function parseType(src: string): { name: string; variants: string[] } | null {
  const m = src.match(/^type\s+([A-Za-z_][\w]*)\s*=\s*([\s\S]+)$/);
  if (!m) return null;
  const name = m[1]!;
  const variants: string[] = [];
  for (const part of m[2]!.split('|')) {
    const cm = part.trim().match(/^([A-Za-z_][\w]*)\s*(?:\(([^)]*)\))?$/);
    if (cm) variants.push(cm[1]!);
  }
  return { name, variants };
}

function parseCompose(src: string): { name: string; fns: string[] } | null {
  const m = src.match(/^compose\s+([A-Za-z_][\w]*)\s+([\s\S]+)$/);
  if (!m) return null;
  const fns = m[2]!.trim().split(/\s+/).filter(Boolean);
  return { name: m[1]!, fns };
}


function showLines(state: ProgramState, name: string): string {
  const v = valueOf(state, name);
  if (v === undefined) return `  ${name}: (not defined)`;
  const chips: string[] = [`type: ${typeOf(v)}`];
  if (effectfulOf(v)) chips.push('EFFECTFUL');
  if (typeof v === 'object' && '__fn' in (v as object)) chips.push(`fn: ${reprOf(v)}`, `pure: ${(v as FpFunction).pure}`);
  return [
    `${name} = ${reprOf(v)}`,
    `  ${chips.join('  ')}`,
  ].join('\n');
}

/** Split on top-level `;` — ignoring those nested in ()/{}([]/`` or inside "". */
function splitTopLevelSemicolons(src: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inStr = false;
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    const c = src[i] as string;
    if (inStr) {
      if (c === '\\') i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === '(' || c === '{' || c === '[' || c === '`') depth++;
    else if (c === ')' || c === '}' || c === ']' || c === '`') depth--;
    else if (c === ';' && depth === 0) {
      parts.push(src.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(src.slice(start));
  return parts.map((s) => s.trim()).filter(Boolean);
}

export function executeCommand(prev: ProgramState, rawInput: string): { state: ProgramState; result: CommandResult } {
  const state = cloneState(prev);
  const raw = rawInput.trim();
  if (!raw) return { state, result: ok('') };

  // `;` chains — split only on top-level `;` (not nested in (), {}, [], or "").
  if (raw.includes(';') && !raw.startsWith('show code')) {
    const parts = splitTopLevelSemicolons(raw);
    if (parts.length > 1) {
      let last = state;
      const outs: string[] = [];
      for (const part of parts) {
        const step = executeCommand(last, part);
        if (step.result.error) return { state: prev, result: step.result };
        last = step.state;
        if (step.result.output) outs.push(step.result.output);
      }
      return { state: last, result: ok(outs.join('\n')) };
    }
  }

  const finish = (st: ProgramState, res: CommandResult): { state: ProgramState; result: CommandResult } => {
    refresh(st);
    if (!res.ok || !res.output) return { state: st, result: res };
    const teach = teachAfterCommand(raw, st);
    if (res.ok && raw && commandCountsForGolf(raw)) st.commandHistory.push(raw);
    return { state: st, result: ok(res.output + (teach ? `\n${teach}` : '')) };
  };

  // ── let ─────────────────────────────────────────────────────────────────
  const letM = parseLet(raw);
  if (letM) {
    try {
      const v = evaluate(state, letM.expr);
      state.env.values[letM.name] = v;
      if (!state.valueOrder.includes(letM.name)) state.valueOrder.push(letM.name);
      return finish(state, ok(`${letM.name} = ${reprOf(v)}   [${typeOf(v)}]`));
    } catch (err) {
      return { state, result: fail(err instanceof Error ? err.message : String(err)) };
    }
  }

  // ── def ─────────────────────────────────────────────────────────────────
  const defM = parseDef(raw);
  if (defM) {
    try {
      const exprSrc = defM.expr;
      const e = parseExpr(exprSrc);
      if (e.t !== 'fn') return { state, result: fail(`def ${defM.name}: expected a function, e.g. \`fn (n) -> n * 2\``) };
      const pure = !isImpureExpr(e.body);
      const fn: FpValue = {
        __fn: true,
        name: defM.name,
        params: e.params,
        body: e.body,
        env: state.env,
        pure,
        arity: e.params.length,
      };
      defineFn(state, defM.name, fn, `(${e.params.join(', ')}) -> …`);
      return finish(state, ok(`defined ${defM.name} (${e.params.join(', ')}) -> …   [${pure ? 'pure' : 'IMPURE'}]`));
    } catch (err) {
      return { state, result: fail(err instanceof Error ? err.message : String(err)) };
    }
  }

  // ── type (ADT) ──────────────────────────────────────────────────────────
  const typeM = parseType(raw);
  if (typeM) {
    if (!typeM.variants.length) return { state, result: fail(`type ${typeM.name}: list constructors, e.g. type Shape = Circle(radius) | Rectangle(w, h)`) };
    defineAdt(state, typeM.name, typeM.variants);
    return finish(state, ok(`defined type ${typeM.name} = ${typeM.variants.join(' | ')}`));
  }

  // ── compose ─────────────────────────────────────────────────────────────
  const compM = parseCompose(raw);
  if (compM) {
    const chain: FpFunction[] = [];
    for (const name of compM.fns) {
      const f = state.env.fns[name];
      if (!f) return { state, result: fail(`compose: unknown function '${name}' (define it first)`) };
      chain.push(f);
    }
    const comp: FpValue = {
      __fn: true,
      name: compM.name,
      params: ['x'],
      body: { t: 'ident', name: '\0compose' },
      env: state.env,
      pure: chain.every((f) => f.pure),
      arity: 1,
      composeChain: chain,
    };
    defineFn(state, compM.name, comp, `(x) -> ${chain.map((f) => f.name).join(' ∘ ')}`);
    return finish(state, ok(`defined ${compM.name} = ${chain.map((f) => f.name).join(' ∘ ')}   [${comp.pure ? 'pure' : 'IMPURE'}]`));
  }

  // ── run ─────────────────────────────────────────────────────────────────
  if (raw.startsWith('run ')) {
    const exprSrc = raw.slice(4).trim();
    try {
      const v = evaluate(state, exprSrc);
      state.result = { type: typeOf(v), repr: reprOf(v), effectful: effectfulOf(v) };
      const fx = effectfulOf(v) ? '   [EFFECTFUL]' : '   [pure value]';
      return finish(state, ok(`→ ${reprOf(v)}   [${typeOf(v)}]${fx}`));
    } catch (err) {
      return { state, result: fail(err instanceof Error ? err.message : String(err)) };
    }
  }

  // ── show / inspect ──────────────────────────────────────────────────────
  // `show code <topic>` is handled further down; don't let the generic
  // `show <name>` swallow it.
  if ((raw.startsWith('show ') || raw.startsWith('inspect ')) && !raw.startsWith('show code')) {
    const name = raw.slice(raw.indexOf(' ') + 1).trim();
    if (name === 'all' || name === '*') {
      const lines = state.valueOrder.length
        ? state.valueOrder.map((n) => showLines(state, n)).join('\n')
        : '(no values bound yet)';
      return { state, result: ok(lines) };
    }
    if (name === 'functions' || name === 'fns') {
      const lines = state.fnOrder.length
        ? state.fnOrder.map((n) => `  ${n}: ${state.functions[n].sig}   [${state.functions[n].pure ? 'pure' : 'impure'}]`).join('\n')
        : '(no functions defined)';
      return { state, result: ok(lines) };
    }
    if (name === 'types' || name === 'adts') {
      const lines = state.adtOrder.length
        ? state.adtOrder.map((n) => `  ${n} = ${state.env.adts[n].join(' | ')}`).join('\n')
        : '(no types defined)';
      return { state, result: ok(lines) };
    }
    if (name === 'result') {
      return { state, result: ok(state.result ? `result = ${state.result.repr}   [${state.result.type}]` : '(no result yet — run an expression)') };
    }
    if (name === 'effects') {
      const lines = state.effects.length ? state.effects.map((e) => `  · ${e.action} — ${e.note}`).join('\n') : '(no effects observed)';
      return { state, result: ok(lines) };
    }
    const v = valueOf(state, name);
    if (v === undefined) return { state, result: fail(`show: '${name}' is not bound. Try \`show all\`.`) };
    return { state, result: ok(showLines(state, name)) };
  }

  // ── show code <topic> [r|py] ────────────────────────────────────────────
  if (raw.startsWith('show code') || raw.startsWith('code ')) {
    const rest = raw.replace(/^show code|^code/, '').trim();
    const parts = rest.split(/\s+/).filter(Boolean);
    const topic = parts[0];
    const langArg = parts[1];
    const lang: 'r' | 'py' | null = langArg === 'r' || langArg === 'R' ? 'r' : langArg === 'py' || langArg === 'python' || langArg === 'Python' ? 'py' : null;
    if (!topic) return { state, result: fail('Usage: show code <topic> [r|py] — try `show code pure` or `show code map`.') };
    const ex = codeFor(topic, lang);
    if (!ex) return { state, result: fail(`No code example for '${topic}'.`) };
    return { state, result: ok(ex) };
  }

  // ── concepts / glossary ─────────────────────────────────────────────────
  if (raw === 'concepts' || raw === 'glossary') {
    return { state, result: ok(['FP mental models (type `concepts <term>` for one entry):', '', formatConcepts()].join('\n')) };
  }
  if (raw.startsWith('concepts ') || raw.startsWith('glossary ')) {
    const c = findConcept(raw.split(' ').slice(1).join(' '));
    return c ? { state, result: ok(`${c.title}\n${c.body}`) } : { state, result: fail(`Unknown concept '${raw.split(' ').slice(1).join(' ')}'.`) };
  }

  // ── help ────────────────────────────────────────────────────────────────
  if (raw === 'help' || raw === '?') {
    return {
      state,
      result: ok(
        [
          'FP commands:',
          '  let <n> = <expr>        bind a value        e.g.  let x = 1 + 2',
          '  def <n> = fn (a) -> …   define a function   e.g.  def double = fn (n) -> n * 2',
          '  type <n> = A(x) | B(y)  define a type       e.g.  type Shape = Circle(r) | Rect(w,h)',
          '  compose <n> f g …       compose functions   e.g.  compose dd double double',
          '  run <expr>              evaluate → result   e.g.  run double 5',
          '  match <scr> {pat => …}',
          'Inspect:  show all · show <n> · show functions · show result · show effects',
          'Language: show code <topic> [r|py]',
          'Learn:  concepts · show code',
          'Meta:   levels · hint · steps · show goal · show solution · reset · undo · sandbox · clear',
        ].join('\n'),
      ),
    };
  }

  return { state, result: fail(`command not found: '${raw.split(' ')[0]}'. Type \`help\`.`) };
}
