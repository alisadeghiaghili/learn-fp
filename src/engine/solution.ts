import type { GoalCheck, LevelDef, ProgramState, SolutionStepStatus } from './types';
import { evaluateGoal } from './compare';
import { fnOf } from './state';

function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ');
}

function inHistory(state: ProgramState, matcher: (cmd: string) => boolean): boolean {
  return (state.commandHistory ?? []).some((c) => matcher(norm(c)));
}

const OPTIONAL = /^(show |inspect |concepts |glossary |code |help|quiz)/;

/** Live status of one solution command, based on observable state. */
function liveStatus(state: ProgramState, cmd: string): SolutionStepStatus {
  const c = norm(cmd);
  const ok = (note: string): SolutionStepStatus => ({ command: cmd, done: true, note });
  const fail = (note: string): SolutionStepStatus => ({ command: cmd, done: false, note });

  if (OPTIONAL.test(c)) {
    return { command: cmd, done: true, note: 'inspect (does not block completion)', optional: true };
  }

  let m = c.match(/^let\s+([A-Za-z_]\w*)\s*=/);
  if (m) {
    const n = m[1]!;
    return n in state.env.values ? ok(`${n} bound`) : fail(`bind ${n}`);
  }
  m = c.match(/^def\s+([A-Za-z_]\w*)\s*=/);
  if (m) {
    const n = m[1]!;
    return fnOf(state, n) ? ok(`${n} defined`) : fail(`define ${n}`);
  }
  m = c.match(/^type\s+([A-Za-z_]\w*)\s*=/);
  if (m) {
    const n = m[1]!;
    return n in state.env.adts ? ok(`${n} defined`) : fail(`define type ${n}`);
  }
  m = c.match(/^compose\s+([A-Za-z_]\w*)\s+/);
  if (m) {
    const n = m[1]!;
    const f = fnOf(state, n);
    return f && 'composeChain' in f ? ok(`${n} composed`) : fail(`compose ${n}`);
  }
  if (c.startsWith('run ')) {
    // done when the result is set (the run was executed)
    return state.result ? ok('evaluated') : fail('run the expression');
  }

  return fail(cmd);
}

function stepStatus(state: ProgramState, command: string): SolutionStepStatus {
  const live = liveStatus(state, command);
  if (live.done || live.optional) return live;
  const c = norm(command);
  // Sticky: if the mutating command already ran, keep it checked unless contradicted.
  const ran = inHistory(state, (h) => h === c || h.startsWith(c + ' '));
  if (ran) return { command, done: true, note: 'already completed earlier' };
  return live;
}

export function solutionProgress(state: ProgramState, solution: string[]): SolutionStepStatus[] {
  return solution.map((command) => stepStatus(state, command));
}

export function solutionComplete(state: ProgramState, solution: string[]): boolean {
  return solutionProgress(state, solution).every((s) => s.done || s.optional);
}

export function goalChecklist(state: ProgramState, level: LevelDef): SolutionStepStatus[] {
  return solutionProgress(state, level.solution);
}

export function nextSteps(state: ProgramState, goal: GoalCheck, level?: LevelDef | null): { label: string; command: string | null }[] {
  if (level?.solution?.length) {
    return solutionProgress(state, level.solution)
      .filter((s) => !s.done)
      .map((s) => ({ label: s.note, command: s.command }));
  }
  const { statuses } = evaluateGoal(state, goal);
  return statuses
    .filter((s) => !s.met)
    .map((s, i) => ({ label: s.label, command: i === 0 ? s.command ?? null : null }));
}

export function suggestFromSolution(state: ProgramState, level: LevelDef | null): string | null {
  if (!level) return null;
  const next = solutionProgress(state, level.solution).find((s) => !s.done && !s.optional);
  return next?.command ?? null;
}
