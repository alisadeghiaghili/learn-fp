import { test, expect } from 'vitest';
import { LEVELS } from '../src/levels';
import { executeCommand } from '../src/engine/commands';
import type { ProgramState } from '../src/engine/types';

/**
 * The type checker is advisory and must NEVER flag a canonical level solution.
 * Replay each level's solution from its start state and assert that no command
 * emits a "── type check ──" advisory (which would be a false positive).
 */
test('no canonical solution triggers a type-check advisory', () => {
  const flagged: string[] = [];
  for (const level of LEVELS) {
    let s: ProgramState = structuredClone(level.startState);
    for (const cmd of level.solution) {
      const r = executeCommand(s, cmd);
      if (r.result.error) throw new Error(`${level.id}: command '${cmd}' errored: ${r.result.error}`);
      if (r.result.output.includes('── type check ──')) {
        flagged.push(`${level.id}: '${cmd}' => ${r.result.output}`);
      }
      s = r.state;
    }
  }
  expect(flagged, `type-check false positives on solutions:\n${flagged.join('\n')}`).toEqual([]);
});
