import { test, expect } from 'vitest';
import { executeCommand } from '../src/engine/commands';
import { sandboxState } from '../src/engine/state';
import type { ProgramState } from '../src/engine/types';

function play(...cmds: string[]): ProgramState {
  let s = sandboxState();
  for (const c of cmds) {
    const r = executeCommand(s, c);
    if (r.result.error) throw new Error(`${c} => ${r.result.error}`);
    s = r.state;
  }
  return s;
}
const res = (s: ProgramState) => s.result?.repr ?? null;

test('recursive ADT evaluator (field capstone)', () => {
  const s = play(
    'type Expr = Lit(n) | Add(a, b) | Mul(a, b)',
    'def eval = fn (e) -> match e { Lit(n) -> n; Add(a, b) -> eval a + eval b; Mul(a, b) -> eval a * eval b; _ -> 0 }',
    'let e = Add(Mul(Lit(2), Lit(3)), Lit(4))',
    'run eval e',
  );
  expect(res(s)).toBe('10');
});

test('partial application + map (closure idiom)', () => {
  const s = play('def scale = fn (k) -> fn (x) -> x * k', 'let scale2 = scale 2', 'run map scale2 [1 2 3]');
  expect(res(s)).toBe('[2 4 6]');
});

test('total function via if (safe division)', () => {
  const s = play('def safe_div = fn (a, b) -> if b == 0 then 0 else a / b', 'run safe_div 10 2');
  expect(res(s)).toBe('5');
  const s2 = play('def safe_div = fn (a, b) -> if b == 0 then 0 else a / b', 'run safe_div 1 0');
  expect(res(s2)).toBe('0');
});

test('drop + take over a stream', () => {
  const s = play('let nats = from 0', 'run take 3 (drop 5 nats)');
  expect(res(s)).toBe('[5 6 7]');
});

test('named composition + map', () => {
  const s = play(
    'def inc = fn (x) -> x + 1',
    'def square = fn (x) -> x * x',
    'compose f square inc',
    'let xs = [1 2 3]',
    'run map f xs',
  );
  expect(res(s)).toBe('[4 9 16]');
  expect(s.functions['f']?.pure).toBe(true);
});

test('ADT construction + pattern match area', () => {
  const s = play(
    'def area = fn (s) -> match s { Circle(r) -> 3 * r * r; Rect(w, h) -> w * h; _ -> 0 }',
    'let r = Rect(3, 4)',
    'run area r',
  );
  expect(res(s)).toBe('12');
});
