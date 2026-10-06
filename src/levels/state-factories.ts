import type { FpValue, FpFunction, ProgramState } from '../engine/types';
import { emptyState, refresh } from '../engine/state';
import { parseExpr } from '../engine/parser';
import { isImpureExpr } from '../engine/eval';

/** Build a ProgramState seeded with plain values and (optional) functions. */
export function seed(opts: { values?: Record<string, FpValue>; fns?: Record<string, string>; adts?: Record<string, string[]> } = {}): ProgramState {
  const s = emptyState();
  for (const [name, v] of Object.entries(opts.values ?? {})) s.env.values[name] = v;
  for (const [name, src] of Object.entries(opts.fns ?? {})) {
    const e = parseExpr(src);
    if (e.t === 'fn') {
      const fn: FpValue = {
        __fn: true,
        name,
        params: e.params,
        body: e.body,
        env: s.env,
        pure: !isImpureExpr(e.body),
        arity: e.params.length,
      };
      s.env.fns[name] = fn;
    }
  }
  for (const [name, variants] of Object.entries(opts.adts ?? {})) s.env.adts[name] = variants;
  refresh(s);
  return s;
}

export const list = (items: FpValue[]): FpValue => ({ __list: true, items });

export const just = (v: FpValue): FpValue => ({ __maybe: true, just: true, v });
export const nothing: FpValue = { __maybe: true, just: false, v: undefined as unknown as FpValue };
export const right = (v: FpValue): FpValue => ({ __either: true, side: 'Right', v });
export const left = (v: FpValue): FpValue => ({ __either: true, side: 'Left', v });

export function fnOfState(state: ProgramState, name: string) {
  return state.env.fns[name] as FpFunction | undefined;
}

/** A seeded state with an ADT pre-registered so its constructors can be used. */
export function seedAdt(name: string, variants: string[]): ProgramState {
  const s = emptyState();
  s.env.adts[name] = variants;
  refresh(s);
  return s;
}
