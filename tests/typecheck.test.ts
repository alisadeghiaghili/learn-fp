import { describe, expect, it } from 'vitest';
import { checkCommand } from '../src/engine/typecheck';
import { emptyState } from '../src/engine/state';

const env = () => emptyState().env;

const errs = (cmd: string, e = env()) => checkCommand(cmd, e).map((x) => x.message);

describe('type checker — accepts good code', () => {
  it('accepts a simple let', () => {
    expect(errs('let x = 1 + 2')).toEqual([]);
  });
  it('accepts a def of a pure function', () => {
    expect(errs('def double = fn (n) -> n * 2')).toEqual([]);
  });
  it('accepts run of a value', () => {
    expect(errs('run 1 + 2')).toEqual([]);
  });
  it('accepts list concatenation with +', () => {
    expect(errs('let xs = [1 2 3]')).toEqual([]);
  });
  it('accepts a function that uses its parameter', () => {
    expect(errs('def add = fn (a, b) -> a + b')).toEqual([]);
  });
  it('accepts a match expression', () => {
    expect(errs('run match 1 { _ -> 0 }')).toEqual([]);
  });
});

describe('type checker — flags bad code', () => {
  it('flags applying a non-function', () => {
    const messages = errs('run 5 3');
    expect(messages.some((m) => /cannot apply/i.test(m))).toBe(true);
  });
  it('flags arithmetic on a list', () => {
    const m = errs('run 3 * [1]');
    expect(m.some((x) => /operator '\*' needs numbers/i.test(x))).toBe(true);
  });
  it('flags and/or on non-booleans', () => {
    const m = errs('run 1 and 2');
    expect(m.some((x) => /'and' needs booleans/i.test(x))).toBe(true);
  });
  it('flags not on a non-boolean', () => {
    const m = errs('run not 5');
    expect(m.some((x) => /'not' needs a boolean/i.test(x))).toBe(true);
  });
  it('flags undefined names', () => {
    const m = errs('let x = doesNotExist');
    expect(m.some((x) => /undefined name/i.test(x))).toBe(true);
  });
  it('flags a too-many-args builtin (call form)', () => {
    const m = errs('run length(1, 2)');
    expect(m.some((x) => /length takes 1 argument/i.test(x))).toBe(true);
  });
  it('flags a number condition in if', () => {
    const m = errs('run if 1 then 2 else 3');
    expect(m.some((x) => /condition must be a boolean/i.test(x))).toBe(true);
  });
  it('flags duplicate parameters', () => {
    const m = errs('def f = fn (a, a) -> a');
    expect(m.some((x) => /duplicate parameter/i.test(x))).toBe(true);
  });
  it('flags a def that is not a function', () => {
    const m = errs('def f = 42');
    expect(m.some((x) => /def needs a function/i.test(x))).toBe(true);
  });
});

describe('type checker — resolution against env', () => {
  it('does not flag a name defined in env', () => {
    const e = emptyState().env;
    e.values.x = 3;
    expect(checkCommand('let y = x + 1', e).map((x) => x.message)).toEqual([]);
  });
  it('does not flag a builtin as undefined', () => {
    expect(errs('run sum [1 2]')).toEqual([]);
  });
  it('does not flag a known constructor', () => {
    const e = emptyState().env;
    e.adts.Shape = ['Circle', 'Rect'];
    expect(checkCommand('let c = Circle(3)', e).map((x) => x.message)).toEqual([]);
  });
  it('resolves pattern-match bindings in case bodies', () => {
    const e = emptyState().env;
    e.adts.Shape = ['Circle', 'Rect'];
    const m = checkCommand('def area = fn (s) -> match s { Circle(r) -> r; Rect(w, h) -> w + h; _ -> 0 }', e).map((x) => x.message);
    expect(m).toEqual([]);
  });
  it('resolves self-recursive def (recursion is core FP)', () => {
    const e = emptyState().env;
    e.adts.Expr = ['Lit', 'Add'];
    const m = checkCommand('def ev = fn (x) -> match x { Lit(n) -> n; Add(a, b) -> ev a + ev b; _ -> 0 }', e).map((x) => x.message);
    expect(m).toEqual([]);
  });
});
