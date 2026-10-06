import type { BoundValue, FpValue, ProgramState } from './types';
import { typeOf, reprOf, effectfulOf, isFn, isLazy, strOf } from './value';
import { parseExpr } from './parser';

/** A fresh, empty FP workspace. */
export function emptyState(): ProgramState {
  return {
    env: { values: {}, fns: {}, adts: {} },
    values: {},
    valueOrder: [],
    functions: {},
    fnOrder: [],
    adts: {},
    adtOrder: [],
    pipeline: [],
    result: null,
    effects: [],
    counter: 0,
    commandHistory: [],
  };
}

/** Cycle-preserving deep clone that drops non-cloneable function closures. */
function deepClone<T>(v: T, seen = new WeakMap<object, unknown>()): T {
  if (v === null || typeof v !== 'object') return v;
  if (seen.has(v as object)) return seen.get(v as object) as T;
  const out: Record<string, unknown> = {};
  seen.set(v as object, out);
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (typeof val === 'function') continue; // drop closures (builtins are re-created on reference)
    out[k] = Array.isArray(val) ? val.map((x) => deepClone(x, seen)) : deepClone(val, seen);
  }
  return out as unknown as T;
}

export function cloneState(state: ProgramState): ProgramState {
  try {
    return structuredClone(state);
  } catch {
    // A value was bound to a builtin (e.g. `let f = map`); its JS closure can't be
    // structuredCloned. Fall back to a cycle-aware manual clone that drops closures.
    return deepClone(state);
  }
}

/** Rebuild board-facing metadata from the live env. */
export function refresh(state: ProgramState): void {
  const values: Record<string, BoundValue> = {};
  const valueOrder: string[] = [];
  const functions: ProgramState['functions'] = {};
  const fnOrder: string[] = [];
  const adts: ProgramState['adts'] = {};
  const adtOrder: string[] = [];

  for (const [name, v] of Object.entries(state.env.values)) {
    values[name] = { name, type: typeOf(v), repr: reprOf(v), effectful: effectfulOf(v) };
    valueOrder.push(name);
  }
  for (const [name, f] of Object.entries(state.env.fns)) {
    const params = f.params.join(', ');
    functions[name] = { name, pure: f.pure, sig: `(${params}) -> …` };
    fnOrder.push(name);
  }
  for (const [name, cons] of Object.entries(state.env.adts)) {
    adts[name] = cons;
    adtOrder.push(name);
  }

  state.values = values;
  state.valueOrder = valueOrder;
  state.functions = functions;
  state.fnOrder = fnOrder;
  state.adts = adts;
  state.adtOrder = adtOrder;
}

/** Record a value into the env + metadata. */
export function bindValue(state: ProgramState, name: string, v: FpValue): void {
  state.env.values[name] = v;
  if (!state.valueOrder.includes(name)) state.valueOrder.push(name);
  state.values[name] = { name, type: typeOf(v), repr: reprOf(v), effectful: effectfulOf(v) };
}

/** Define a user function in the env + metadata. */
export function defineFn(state: ProgramState, name: string, fn: FpValue, sig: string): void {
  if (!isFn(fn)) return;
  fn.name = name;
  state.env.fns[name] = fn;
  if (!state.fnOrder.includes(name)) state.fnOrder.push(name);
  state.functions[name] = { name, pure: fn.pure, sig };
}

/** Define an algebraic data type in the env + metadata. */
export function defineAdt(state: ProgramState, name: string, variants: string[]): void {
  state.env.adts[name] = variants;
  if (!state.adtOrder.includes(name)) state.adtOrder.push(name);
  state.adts[name] = variants;
}

export function valueOf(state: ProgramState, name: string): FpValue | undefined {
  return state.env.values[name];
}

export function fnOf(state: ProgramState, name: string) {
  return state.env.fns[name];
}

/** A seeded workspace for the free sandbox. */
export function sandboxState(): ProgramState {
  const s = emptyState();
  s.env.values = {
    x: 10,
    y: 3,
    xs: { __list: true, items: [1, 2, 3, 4, 5] },
  };
  const doubleBody = parseExpr('fn (n) -> n * 2');
  if (doubleBody.t === 'fn') {
    const fn: FpValue = {
      __fn: true,
      name: 'double',
      params: doubleBody.params,
      body: doubleBody.body,
      env: s.env,
      pure: true,
      arity: 1,
    };
    s.env.fns.double = fn;
  }
  refresh(s);
  return s;
}

/** Resolve a value token ("Just(3)", "Right(3)", "[1 2]", "42") to a comparable string. */
export function normValue(v: FpValue): string {
  const s = reprOf(v);
  return s.replace(/\s+/g, ' ').trim();
}

export function valueToString(v: FpValue): string {
  const s = strOf(v);
  return s !== null ? s : reprOf(v);
}

export function isLazyValue(state: ProgramState, name: string): boolean {
  const v = state.env.values[name];
  return !!v && isLazy(v);
}

export function isEffectfulValue(state: ProgramState, name: string): boolean {
  const v = state.env.values[name];
  return !!v && effectfulOf(v);
}

export { typeOf, reprOf };
