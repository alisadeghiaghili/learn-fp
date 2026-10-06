import type { LevelDef } from '../engine/types';
import { seed, list } from './state-factories';

export const fieldLevels: LevelDef[] = [
  {
    id: 'field-1',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Total function: safe division',
    difficulty: 3,
    par: 2,
    hint: 'def safe_div = fn (a, b) -> if b == 0 then 0 else a / b; run safe_div 10 2',
    objective: 'Write a *total* function that handles a case division would otherwise crash on.',
    learning: [
      'A total function returns a defined result for every input — no exceptions',
      '`if cond then … else …` expresses the branching without a special-case error',
      'Handling the edge case in the function beats checking it at every call site',
    ],
    fieldNotes: [
      'In R: `if (b == 0) NA else a / b`; in Python: `a / b if b else None`',
    ],
    startDialog: [
      {
        title: 'No crashes, just answers',
        markdown:
          '```\ndef safe_div = fn (a, b) -> if b == 0 then 0 else a / b\nrun safe_div 10 2    # 5\nrun safe_div 1 0     # 0  — no crash, a defined answer\n```\n\nInstead of a divide-by-zero exception, the function decides what “can’t divide” means and returns it.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'safe_div' },
        { kind: 'functionPure', name: 'safe_div' },
        { kind: 'resultEquals', value: '0' },
      ],
    },
    solution: [
      'def safe_div = fn (a, b) -> if b == 0 then 0 else a / b',
      'run safe_div 1 0',
    ],
  },
  {
    id: 'field-2',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Partial application: make a scaler',
    difficulty: 4,
    par: 2,
    hint: 'def scale = fn (k) -> fn (x) -> x * k; let scale2 = scale 2; run map scale2 [1 2 3]',
    objective: 'Use partial application to turn a general function into a specialized one, then reuse it.',
    learning: [
      '`scale 2` supplies one argument and returns a *function* that remembers it',
      'The result is a reusable `scale2` — a closure carrying `k = 2`',
      'You can hand that to `map` or store it, without re-supplying `k`',
    ],
    fieldNotes: [
      'Closures replace mutable “config objects” with captured values',
      'This is how libraries build factory functions',
    ],
    startDialog: [
      {
        title: 'A function that makes functions',
        markdown:
          '```\ndef scale = fn (k) -> fn (x) -> x * k\nlet scale2 = scale 2\nrun scale2 5         # 10\nrun map scale2 [1 2 3]   # [2 4 6]\n```\n\n`scale 2` returns a ready-made “times two” function. Same idea for `scale 3`, `scale 0.5`, etc.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'scale' },
        { kind: 'valueExists', name: 'scale2' },
        { kind: 'resultEquals', value: '[2 4 6]' },
      ],
    },
    solution: [
      'def scale = fn (k) -> fn (x) -> x * k',
      'let scale2 = scale 2',
      'run map scale2 [1 2 3]',
    ],
  },
  {
    id: 'field-3',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'A data pipeline',
    difficulty: 4,
    par: 3,
    hint: 'let raw = [4 8 2 10 6]; def is_big = fn (n) -> n > 5; run fold 0 add (map double (filter is_big raw))',
    objective: 'Chain filter → map → fold into one readable data pipeline.',
    learning: [
      'Read it inside-out: `filter` keeps the big ones, `map` transforms, `fold` reduces',
      'Each stage is a small pure function; the pipeline is their composition',
      'This is the shape of most real data processing',
    ],
    fieldNotes: [
      'When a pipeline gets long, name the middle stages so it reads like a spec',
    ],
    startDialog: [
      {
        title: 'Transform → select → reduce',
        markdown:
          'Given raw numbers, double the big ones and sum them:\n\n```\nlet raw = [4 8 2 10 6]\ndef is_big = fn (n) -> n > 5\ndef double = fn (n) -> n * 2\ndef add = fn (a, b) -> a + b\nrun fold 0 add (map double (filter is_big raw))\n```\n\n`filter is_big` → [8 10 6]; `map double` → [16 20 12]; `fold 0 add` → **48**.',
      },
    ],
    startState: seed({ values: { raw: list([4, 8, 2, 10, 6]) } }),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'resultEquals', value: '48' }],
    },
    solution: [
      'def is_big = fn (n) -> n > 5',
      'def double = fn (n) -> n * 2',
      'def add = fn (a, b) -> a + b',
      'run fold 0 add (map double (filter is_big raw))',
    ],
  },
  {
    id: 'field-4',
    series: 'field',
    seriesTitle: 'Field practice',
    name: 'Capstone: evaluate an expression tree',
    difficulty: 5,
    par: 4,
    hint: 'def ev = fn (e) -> match e { Lit(n) -> n; Add(a, b) -> ev a + ev b; Mul(a, b) -> ev a * ev b; _ -> 0 }',
    objective: 'Tie it all together: define a type, pattern-match it, and recurse to compute a result.',
    learning: [
      'Recursive pattern matching is the FP way to walk structured data',
      'The function is pure, total (with the `_` case), and composable',
      'This single function uses ADTs + matching + recursion — the core trio',
    ],
    fieldNotes: [
      'Real compilers/interpreters are built from exactly this shape',
      'Pure + recursive + total means it’s trivially testable',
    ],
    startDialog: [
      {
        title: 'Walk a tree, compute an answer',
        markdown:
          'Model an expression and evaluate it by recursion:\n\n```\ntype Expr = Lit(n) | Add(a, b) | Mul(a, b)\ndef ev = fn (e) -> match e { Lit(n) -> n; Add(a, b) -> ev a + ev b; Mul(a, b) -> ev a * ev b; _ -> 0 }\nlet e = Add(Mul(Lit(2), Lit(3)), Lit(4))\nrun ev e      # 2*3 + 4 = 10\n```\n\n`Add` recurses into both sides, `Mul` the same, `Lit` is the base case.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'adtDefined', name: 'Expr' },
        { kind: 'functionDefined', name: 'ev' },
        { kind: 'resultEquals', value: '10' },
      ],
    },
    solution: [
      'type Expr = Lit(n) | Add(a, b) | Mul(a, b)',
      'def ev = fn (e) -> match e { Lit(n) -> n; Add(a, b) -> ev a + ev b; Mul(a, b) -> ev a * ev b; _ -> 0 }',
      'let e = Add(Mul(Lit(2), Lit(3)), Lit(4))',
      'run ev e',
    ],
  },
];
