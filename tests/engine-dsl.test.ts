import { test, expect } from 'vitest';
import { executeCommand } from '../src/engine/commands';
import { sandboxState } from '../src/engine/state';
import type { ProgramState } from '../src/engine/types';

// Run a chain of commands from a fresh sandbox; return final output + last result repr.
function play(...cmds: string[]) {
  let s = sandboxState();
  const out: string[] = [];
  for (const c of cmds) {
    const r = executeCommand(s, c);
    if (r.result.error) throw new Error(`${c} => ${r.result.error}`);
    s = r.state;
    if (r.result.output) out.push(r.result.output);
  }
  return { state: s, out: out.join('\n') };
}

const lastResult = (s: ProgramState) => s.result?.repr ?? null;

test('purity + composition', () => {
  const { state } = play(
    'def double = fn (n) -> n * 2',
    'def inc = fn (x) -> x + 1',
    'compose dd double inc',
    'run dd 5',
  );
  expect(lastResult(state)).toBe('12');
  expect(state.functions['dd']?.pure).toBe(true);
});

test('impure bump detection', () => {
  const { state } = play('def noisy = fn (n) -> bump()', 'run noisy 1', 'run noisy 1');
  expect(state.functions['noisy']?.pure).toBe(false);
});

test('higher-order map/filter/fold', () => {
  const { state } = play(
    'let xs = [1 2 3 4 5 6]',
    'def double = fn (n) -> n * 2',
    'def is_even = fn (n) -> n % 2 == 0',
    'def add = fn (a, b) -> a + b',
    'run fold 0 add (filter is_even (map double xs))',
  );
  expect(lastResult(state)).toBe('42');
});

test('closure', () => {
  const { state } = play('def adder = fn (n) -> fn (x) -> x + n', 'let add5 = adder 5', 'run add5 10');
  expect(lastResult(state)).toBe('15');
});

test('ADT + pattern matching', () => {
  const { state } = play(
    'type Shape = Circle(r) | Rect(w, h)',
    'def area = fn (s) -> match s { Circle(r) -> 3 * r * r; Rect(w, h) -> w * h; _ -> 0 }',
    'run area Circle(2)',
  );
  expect(lastResult(state)).toBe('12');
  expect('Shape' in state.env.adts).toBe(true);
});

test('Maybe monad', () => {
  const { state } = play('def inc = fn (x) -> x + 1', 'let m = just 5', 'run bind m inc');
  expect(lastResult(state)).toBe('Just(6)');
  const none = play('def inc = fn (x) -> x + 1', 'let m = nothing', 'run bind m inc');
  expect(lastResult(none.state)).toBe('None');
});

test('Either monad (short-circuits on Left)', () => {
  const { state } = play('def inc = fn (x) -> x + 1', 'let e = right 5', 'run bind e inc');
  expect(lastResult(state)).toBe('Right(6)');
  const err = play('def inc = fn (x) -> x + 1', 'let e = left "boom"', 'run bind e inc');
  expect(lastResult(err.state)).toBe('Left("boom")');
});

test('IO effect is quarantined + recorded', () => {
  const { state } = play('let a = io "read file"', 'run run a');
  expect(lastResult(state)).toBe('"read file"');
  expect(state.effects.length).toBeGreaterThan(0);
});

test('laziness: infinite stream, take 5', () => {
  const { state } = play('let evens = from 0', 'run take 5 evens');
  expect(lastResult(state)).toBe('[0 1 2 3 4]');
});
