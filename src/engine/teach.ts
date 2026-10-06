import type { ProgramState } from './types';

/**
 * Short "why this command matters" blocks appended to simulator output.
 * Goal: learners leave with mental models, not only muscle memory.
 */

interface Teach {
  title: string;
  lines: string[];
}

const TEACH: Record<string, Teach> = {
  'let': {
    title: 'binding a value',
    lines: ['Names refer to immutable values. Once bound, a name cannot be reassigned.', 'This is the foundation of referential transparency — a name is a value, not a box.'],
  },
  'def': {
    title: 'defining a function',
    lines: ['A function is a pure mapping from input to output — nothing else.', 'Watch the [pure] / [IMPURE] tag: purity is detected from side effects in the body.'],
  },
  'type': {
    title: 'defining a type',
    lines: ['Algebraic data types let you model a closed set of shapes (tagged unions).', 'Constructors carry data; pattern matching deconstructs it.'],
  },
  'compose': {
    title: 'composing functions',
    lines: ['`compose dd double double` means `dd(x) = double(double(x))`.', 'Composition builds complexity from small, testable pieces.'],
  },
  'run': {
    title: 'evaluating',
    lines: ['`run` forces an expression to a value and records the result on the board.', 'If the result is tagged EFFECTFUL, a side effect leaked into your computation.'],
  },
};

export function teachBlock(title: string, lines: string[]): string {
  return ['', `── Why: ${title} ──`, ...lines.map((l) => `  ${l}`)].join('\n');
}

export function teachAfterCommand(raw: string, _state: ProgramState): string | null {
  const cmd = raw.trim();
  if (!cmd) return null;
  if (/^let\s/.test(cmd)) {
    const t = TEACH['let'];
    return teachBlock(t.title, t.lines);
  }
  if (/^def\s/.test(cmd)) {
    const t = TEACH['def'];
    return teachBlock(t.title, t.lines);
  }
  if (/^type\s/.test(cmd)) {
    const t = TEACH['type'];
    return teachBlock(t.title, t.lines);
  }
  if (/^compose\s/.test(cmd)) {
    const t = TEACH['compose'];
    return teachBlock(t.title, t.lines);
  }
  if (/^run\s/.test(cmd)) {
    const t = TEACH['run'];
    return teachBlock(t.title, t.lines);
  }
  return null;
}
