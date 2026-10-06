import { test, expect } from 'vitest';
import { executeCommand } from '../src/engine/commands';
import { sandboxState } from '../src/engine/state';

function run(cmd: string): string {
  const { result } = executeCommand(sandboxState(), cmd);
  return result.ok ? result.output : `ERR: ${result.error}`;
}

test('show code <topic> is not swallowed by show <name>', () => {
  const out = run('show code composition');
  expect(out).not.toMatch(/not bound/);
  expect(out).toContain('Composition');
  expect(out).toContain('```'); // a code fence
});

test('show code with a language filter', () => {
  const out = run('show code map py');
  expect(out).toContain('map');
  expect(out).not.toContain('```r'); // python only
});

test('show code with unknown topic errors cleanly', () => {
  expect(run('show code nonsense')).toMatch(/No code example/);
});

test('concepts lists the glossary; concepts <term> gives one entry', () => {
  expect(run('concepts')).toContain('Purity');
  expect(run('concepts monad')).toContain('bind');
  expect(run('concepts nothere')).toMatch(/Unknown concept/);
});

test('show all / show <name> inspect bound values', () => {
  const { state, result } = executeCommand(sandboxState(), 'let z = 5 + 5');
  const r2 = executeCommand(state, 'show z');
  expect(r2.result.ok).toBe(true);
  expect(r2.result.output).toContain('z = 10');
  expect(result.ok).toBe(true);
});

test('show functions lists defined functions', () => {
  const out = run('show functions');
  expect(out).toContain('double');
});

test('unknown command gives a helpful error', () => {
  expect(run('frobnicate')).toMatch(/command not found/);
});
