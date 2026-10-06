import type { LevelDef, ProgramState } from './types';
import { evaluateGoal } from './compare';
import { solutionProgress, nextSteps } from './solution';
import { ui } from '../i18n';

export interface NextStep {
  label: string;
  command: string | null;
}

export function formatNextSteps(steps: NextStep[], level: LevelDef | null): string {
  const u = ui();
  if (!steps.length) return u.coachAllDone;
  const lines = [u.coachNextSteps(steps.length, level ? level.id : '')];
  steps.forEach((s, i) => {
    const cmd = s.command ? `\n      ${s.command}` : '';
    lines.push(`  ${i + 1}. [ ] ${s.label}${cmd}`);
  });
  lines.push(u.coachFooter);
  return lines.join('\n');
}

/** Coach text after every real command in a level. */
export function coachLine(state: ProgramState, level: LevelDef | null): string | null {
  if (!level) return null;
  if (level.solution.length && solutionProgress(state, level.solution).every((s) => s.done)) {
    return null;
  }
  const { solved } = evaluateGoal(state, level.goal);
  if (solved && !level.solution.length) return null;
  return formatNextSteps(nextSteps(state, level.goal, level), level);
}
