import { test, expect } from 'vitest';
import { LEVELS, TOTAL_LEVELS, levelById } from '../src/levels';
import { executeCommand } from '../src/engine/commands';
import { evaluateGoal } from '../src/engine/compare';
import type { ProgramState } from '../src/engine/types';

/** Replay a level's solution from its start state; the goal must be met at the end. */
function replay(levelId: string): { solved: boolean; steps: { cmd: string; err?: string }[] } {
  const level = levelById(levelId)!;
  let s: ProgramState = structuredClone(level.startState);
  const steps: { cmd: string; err?: string }[] = [];
  for (const cmd of level.solution) {
    const r = executeCommand(s, cmd);
    if (r.result.error) steps.push({ cmd, err: r.result.error });
    s = r.state;
  }
  const { solved } = evaluateGoal(s, level.goal);
  return { solved, steps };
}

test('curriculum has a healthy number of levels', () => {
  expect(TOTAL_LEVELS).toBeGreaterThanOrEqual(18);
  expect(new Set(LEVELS.map((l) => l.id)).size).toBe(TOTAL_LEVELS); // unique ids
});

test.each(LEVELS.map((l) => [l.id, l.series]))('%s solves its goal (%s)', (id) => {
  const { solved, steps } = replay(id);
  const errors = steps.filter((s) => s.err);
  if (errors.length) throw new Error(`command errors in ${id}: ${errors.map((e) => `${e.cmd} => ${e.err}`).join(' | ')}`);
  expect(solved, `level ${id} did not reach its goal`).toBe(true);
});

test('every level has a real goal, hint, solution, and dialog', () => {
  for (const l of LEVELS) {
    expect(l.goal.kind, `${l.id} has goal`).toBeTruthy();
    expect(l.hint.trim().length, `${l.id} hint`).toBeGreaterThan(0);
    expect(l.solution.length, `${l.id} solution`).toBeGreaterThan(0);
    expect(l.startDialog.length, `${l.id} dialog`).toBeGreaterThan(0);
    expect(l.par, `${l.id} par`).toBeGreaterThan(0);
  }
});
