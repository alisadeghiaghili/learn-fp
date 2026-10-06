/**
 * UI string bundle. English is the canonical voice for v1 (DESIGN.md lists
 * localized UI as future work); the shape is a single frozen bundle so a locale
 * can be swapped in later without touching the UI layer.
 */

export interface UiCopy {
  // ── Coach (next-step nudge after each command) ──────────────────────────
  coachAllDone: string;
  coachNextSteps: (n: number, levelId: string) => string;
  coachFooter: string;

  // ── Toolbar ──────────────────────────────────────────────────────────────
  brand: string;
  tagline: string;
  levels: string;
  guide: string;
  sandbox: string;
  undo: string;
  reset: string;
  help: string;

  // ── Data-flow board zones ────────────────────────────────────────────────
  values: string;
  functions: string;
  types: string;
  result: string;
  effects: string;
  pipeline: string;
  pure: string;
  impure: string;
  effectful: string;
  pureValue: string;
  noValues: string;
  noFunctions: string;
  noTypes: string;
  noResult: string;
  noEffects: string;
  flowArrow: string;

  // ── Level / goal / progress ──────────────────────────────────────────────
  goal: string;
  steps: string;
  par: string;
  difficulty: string;
  hint: string;
  solved: string;
  unsolved: string;
  best: string;
  commands: string;
  objective: string;
  youWillLearn: string;
  fieldNotes: string;
  showGoal: string;
  showSolution: string;
  close: string;
  optionalChip: string;
  nowChip: string;

  // ── Intro dialog ─────────────────────────────────────────────────────────
  next: string;
  back: string;
  start: string;
  skipToSandbox: string;

  // ── Terminal ─────────────────────────────────────────────────────────────
  terminal: string;
  placeholder: string;
  clear: string;

  // ── Celebration ──────────────────────────────────────────────────────────
  levelComplete: string;
  nextLevel: string;
  pickAnother: string;
  trySandbox: string;

  // ── App flow / status lines ──────────────────────────────────────────────
  appWelcome: string;
  sandboxSeeded: string;
  progressSaved: string;
  sandboxMode: string;
  sandboxTitle: string;
  resetLevel: (id: string) => string;
  resetSandbox: string;
  noSolutionSandbox: string;
  noHintSandbox: string;
  noGoalSandbox: string;
  allStepsMet: string;
  nothingToUndo: string;
  undoMeta: string;
  unknownLevel: (id: string) => string;

  // ── Solution modal ───────────────────────────────────────────────────────
  solutionTitle: (id: string) => string;
  solutionCommands: string;
  solutionWarn: string;
  runSolution: string;
  cancel: string;

  // ── Solved / coach lines ─────────────────────────────────────────────────
  levelSolvedBanner: string;
  commandsUsed: (n: number, par: number) => string;
  idealCommands: (par: number) => string;
  nextMeta: (cmd: string) => string;
  continueGoal: string;

  // ── Level titles ─────────────────────────────────────────────────────────
  levelMeta: (id: string, name: string) => string;
  titleLine: (id: string, name: string, par: number) => string;

  // ── Guide dock ───────────────────────────────────────────────────────────
  guideIntro: string;
  startHere: string;
  startHereItems: string[];
  sandboxTip: string;
  sandboxTipItems: string[];
  noActiveLevel: string;
  noActiveLevelDetail: string;
  youAreLearning: string;
  fieldNotesTitle: string;
  goalTitle: string;
  remainingLabel: string;
  typeNextTitle: string;
  wrongCommandNote: string;
  allSolutionMet: string;
  idealSolution: (par: number) => string;
  bestSoFar: (n: number, par: number) => string;
  solvedBanner: (n: number | null) => string;
  difficultyOf: (n: number) => string;

  // ── Level picker ─────────────────────────────────────────────────────────
  levelPicker: string;
  pickChallenge: string;
  howToRead: string;
  difficultyLegend: string;
  idealLegend: string;
  solvedLegend: string;

  // ── Celebration extras ───────────────────────────────────────────────────
  baskInIt: string;
  nextCelebration: (id: string, name: string) => string;
  lastInPack: string;
  celebrateOn: (id: string) => string;
  browseLevels: string;
  idealForLevel: (par: number) => string;
  partyMode: string;
  cheers: string[];
}

const en: UiCopy = {
  coachAllDone: 'All steps done — the goal is met.',
  coachNextSteps: (n, levelId) => `Next steps for ${levelId} (${n} remaining):`,
  coachFooter: 'Type a command, or `hint` for a nudge, `show goal` to see the target.',

  brand: 'LearnFP',
  tagline: 'the material board for functional programming',
  levels: 'Levels',
  guide: 'Guide',
  sandbox: 'Sandbox',
  undo: 'Undo',
  reset: 'Reset',
  help: 'Help',

  values: 'Values',
  functions: 'Functions',
  types: 'Types',
  result: 'Result',
  effects: 'Effects',
  pipeline: 'Pipeline',
  pure: 'pure',
  impure: 'IMPURE',
  effectful: 'EFFECTFUL',
  pureValue: 'pure value',
  noValues: 'nothing bound yet',
  noFunctions: 'no functions defined',
  noTypes: 'no types defined',
  noResult: 'run an expression to see a result',
  noEffects: 'no effects observed',
  flowArrow: 'values → pipeline → result · effects quarantined',

  goal: 'Goal',
  steps: 'Steps',
  par: 'par',
  difficulty: 'level',
  hint: 'Hint',
  solved: 'SOLVED',
  unsolved: 'in progress',
  best: 'best',
  commands: 'commands',
  objective: 'Objective',
  youWillLearn: 'What you’ll learn',
  fieldNotes: 'Field notes',
  showGoal: 'show goal',
  showSolution: 'show solution',
  close: 'Close',
  optionalChip: 'optional',
  nowChip: 'now',

  next: 'Next',
  back: 'Back',
  start: 'Start',
  skipToSandbox: 'Skip to sandbox',

  terminal: 'Terminal',
  placeholder: 'type a command — try `help`',
  clear: 'clear',

  levelComplete: 'Level complete',
  nextLevel: 'Next level',
  pickAnother: 'Pick another',
  trySandbox: 'Try the sandbox',

  appWelcome: 'Welcome to LearnFP — the material board for functional programming.',
  sandboxSeeded: 'Sandbox seeded with x, y, xs, and a `double` function. Type `help` to see commands.',
  progressSaved: 'Progress is saved in this browser.',
  sandboxMode: 'Sandbox mode — experiment freely. No goal to reach.',
  sandboxTitle: 'Sandbox',
  resetLevel: (id) => `Reset ${id} to its starting state.`,
  resetSandbox: 'Reset the sandbox.',
  noSolutionSandbox: 'There’s no level solution here (sandbox). Open a level to see one.',
  noHintSandbox: 'No hint in the sandbox. Open a level, or type `help`.',
  noGoalSandbox: 'No active goal in the sandbox.',
  allStepsMet: 'All solution steps are met.',
  nothingToUndo: 'Nothing to undo.',
  undoMeta: 'Undid the last command.',
  unknownLevel: (id) => `Unknown level: ${id}`,

  solutionTitle: (id) => `Solution — ${id}`,
  solutionCommands: 'Run these commands (or type them yourself):',
  solutionWarn: 'Running the solution marks the level solved but doesn’t count toward your best.',
  runSolution: 'Run solution',
  cancel: 'Cancel',

  levelSolvedBanner: '★ SOLVED: ',
  commandsUsed: (n, par) => `Done in ${n} command${n === 1 ? '' : 's'} (par ${par}).`,
  idealCommands: (par) => `Done in par (${par}).`,
  nextMeta: (cmd) => `Next: ${cmd}`,
  continueGoal: 'Keep going toward the goal.',

  levelMeta: (id, name) => `${id} · ${name}`,
  titleLine: (id, name, par) => `${id} — ${name} · par ${par}`,

  guideIntro: 'Learn by doing',
  startHere: 'Start here',
  startHereItems: [
    '`let`, `def`, `run` — bind values, define functions, evaluate',
    '`map`, `filter`, `fold` — transform collections without loops',
    '`type` + `match` — model data and deconstruct it',
    '`maybe`, `either`, `io` — thread optional/error/effect contexts',
    '`from`, `take`, `drop` — build infinite streams',
  ],
  sandboxTip: 'Sandbox tips',
  sandboxTipItems: [
    'Everything you type is evaluated against the board on the left',
    '`show all` lists values; `show functions` lists functions',
    '`show code <topic>` shows the idea in R and Python',
    '`concepts` opens the FP mental-model glossary',
  ],
  noActiveLevel: 'No active level',
  noActiveLevelDetail: 'Open Levels to pick a challenge, or experiment in the sandbox.',
  youAreLearning: 'What you’re learning',
  fieldNotesTitle: 'Field notes',
  goalTitle: 'Goal',
  remainingLabel: 'remaining',
  typeNextTitle: 'Next command',
  wrongCommandNote: 'A wrong command never loses your progress — just keep going.',
  allSolutionMet: 'All solution steps complete ✓',
  idealSolution: (par) => `Ideal: ${par} command${par === 1 ? '' : 's'} (par).`,
  bestSoFar: (n, par) => `Best: ${n} command${n === 1 ? '' : 's'} · par ${par}.`,
  solvedBanner: (n) => (n === null ? 'Solved in par!' : `Solved in ${n} command${n === 1 ? '' : 's'}!`),
  difficultyOf: (n) => `difficulty ${n} of 5`,

  levelPicker: 'Levels',
  pickChallenge: 'Pick a level to start. Progress is saved in this browser.',
  howToRead: 'How to read a level',
  difficultyLegend: 'difficulty (1–5)',
  idealLegend: 'ideal command count (par)',
  solvedLegend: 'solved — shows your best command count',

  baskInIt: 'Stay here',
  nextCelebration: (id, name) => `Next up: **${name}** — ${id}`,
  lastInPack: 'That’s the end of the curriculum. Revisit any level, or play in the sandbox.',
  celebrateOn: (id) => `Continue to ${id}`,
  browseLevels: 'Browse levels',
  idealForLevel: (par) => `Solved — par is ${par}.`,
  partyMode: '🎉',
  cheers: [
    'Purity + composition — that’s the whole game.',
    'The value flowed through untouched. Beautiful.',
    'Effects quarantined, middle kept pure. That’s FP.',
    'You reasoned about it, not the machine’s state.',
    'Small pure pieces, composed. Nicely done.',
  ],
};

const catalogs = { en };
export type Locale = keyof typeof catalogs;
export const LOCALES: Locale[] = ['en'];

let current: Locale = 'en';

export function getLocale(): Locale {
  return current;
}

export function setLocale(locale: Locale): void {
  if (catalogs[locale]) current = locale;
}

/** The UI copy for the active locale (English for v1). */
export function ui(): UiCopy {
  return catalogs[current];
}
