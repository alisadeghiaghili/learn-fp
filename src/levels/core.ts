import type { LevelDef } from '../engine/types';
import { seed } from './state-factories';

export const coreLevels: LevelDef[] = [
  {
    id: 'core-1',
    series: 'core',
    seriesTitle: 'Pure & Compose',
    name: 'Bind your first value',
    difficulty: 1,
    par: 1,
    hint: 'let x = 1 + 2',
    objective: 'Bind a value with `let` and evaluate it with `run` to see a value flow through the workspace.',
    learning: [
      'Names bind to immutable values — no reassignment',
      '`let x = <expr>` creates x; `run <expr>` evaluates to a value',
      'Every value has a type you can read on the board',
    ],
    fieldNotes: [
      'In real code this is just `const x = ...` — but notice the value is shown with its type',
      'Immutable binding is what makes later composition safe',
    ],
    startDialog: [
      {
        title: 'Values are the atoms',
        markdown:
          'Functional programs are built from **values**.\n\nA value is something concrete: `42`, `true`, `[1 2 3]`, a function.\n\n```\nlet x = 1 + 2\nrun x\n```\n\n`let` **binds** a name to a value. You cannot change `x` later — a value, once made, is final. That single rule is the foundation of everything.',
      },
      {
        title: 'Watch the board',
        markdown:
          'The **Values** zone on the left shows every bound name with its type and representation.\n\nWhen you `run` an expression, the **Result** slot fills in with the final typed value.\n\nTry `run x * 3` — it composes values with no new bindings.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'valueExists', name: 'x' },
        { kind: 'resultEquals', value: '9' },
      ],
    },
    solution: ['let x = 1 + 2', 'run x * 3'],
  },
  {
    id: 'core-2',
    series: 'core',
    seriesTitle: 'Pure & Compose',
    name: 'Define a pure function',
    difficulty: 2,
    par: 2,
    hint: 'def double = fn (n) -> n * 2; run double 5',
    objective: 'Define a pure function with `def` and evaluate it. Confirm it is tagged `pure`.',
    learning: [
      '`def name = fn (params) -> body` defines a function',
      'Purity is detected: a body with no side effects is tagged [pure]',
      'A function is a value too — first-class, composable',
    ],
    fieldNotes: [
      'Prefer many small pure functions over one big procedural one',
      'Pure functions are trivially testable: double(5) is always 10',
    ],
    startDialog: [
      {
        title: 'From value to function',
        markdown:
          'Now make a **function** — a reusable mapping from input to output.\n\n```\ndef double = fn (n) -> n * 2\nrun double 5\n```\n\nThe simulator inspects the body. No side effects → the function is tagged **`[pure]`** in the Functions zone.',
      },
      {
        title: 'Why purity matters',
        markdown:
          'A pure function `double` always returns the same output for the same input. You can:\n\n- test it in isolation\n- reason about it without knowing the rest of the program\n- combine it with other functions\n\nThis is the whole point of FP in one line.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'double' },
        { kind: 'functionPure', name: 'double' },
        { kind: 'resultEquals', value: '10' },
      ],
    },
    solution: ['def double = fn (n) -> n * 2', 'run double 5'],
  },
  {
    id: 'core-3',
    series: 'core',
    seriesTitle: 'Pure & Compose',
    name: 'Spot the impure function',
    difficulty: 3,
    par: 2,
    hint: 'def noisy = fn (n) -> bump(); run noisy 1',
    objective: 'Define a function that reads/writes a hidden counter (`bump`) and observe the simulator flag it `IMPURE`.',
    learning: [
      'Side effects (hidden state, I/O) make a function impure',
      '`bump`/`count` model reading/writing a shared variable',
      'Impure functions break referential transparency — call them at the edges',
    ],
    fieldNotes: [
      'You rarely want impure functions inside business logic',
      'Isolate effects: pure middle, impure boundary',
    ],
    startDialog: [
      {
        title: 'The same input, different outputs',
        markdown:
          'Define a function that touches a **hidden counter**:\n\n```\ndef noisy = fn (n) -> bump()\nrun noisy 1\nrun noisy 1\n```\n\nCall it twice with the *same* input and you get **different** outputs (1, then 2). That is impurity: the result depends on hidden state, not just the input.',
      },
      {
        title: 'Watch the tag flip',
        markdown:
          'The Functions zone now shows `noisy` as **`[IMPURE]`** because its body calls `bump`.\n\nImpure functions are not forbidden — they are *quarantined*. Keep them at the program boundary (I/O, logging, time) and keep the middle pure.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'noisy' },
        { kind: 'functionImpure', name: 'noisy' },
      ],
    },
    solution: ['def noisy = fn (n) -> bump()', 'run noisy 1'],
  },
  {
    id: 'core-4',
    series: 'core',
    seriesTitle: 'Pure & Compose',
    name: 'Compose functions',
    difficulty: 3,
    par: 3,
    hint: 'def inc = fn (x) -> x + 1; def double = fn (x) -> x * 2; compose dd double inc; run dd 5',
    objective: 'Define two pure functions, compose them into a third, and run the composition.',
    learning: [
      '`compose f g` builds `f ∘ g`: apply g first, then f',
      'Small pure functions compose into larger behavior',
      'Composition is the FP alternative to nesting imperative steps',
    ],
    fieldNotes: [
      'Name your compositions — they become the readable building blocks of your system',
      'If you find yourself inlining long chains, pull them out into named pure functions',
    ],
    startDialog: [
      {
        title: 'Glue small pieces',
        markdown:
          'Composition: build a bigger function from smaller ones.\n\n```\ndef inc = fn (x) -> x + 1\ndef double = fn (x) -> x * 2\ncompose dd double inc   # dd(x) = double(inc(x))\nrun dd 5                # inc 5 = 6, double 6 = 12\n```\n\n`compose dd double inc` means: start with `inc`, then feed into `double`. Order matters: right-to-left.',
      },
      {
        title: 'The mental shift',
        markdown:
          'Imperative code says *do this, then do that, then that*.\n\nFP says *these are functions; here is a function that runs them in order*.\n\nThe composition itself is a value you can pass around, test, and reuse.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'inc' },
        { kind: 'functionDefined', name: 'double' },
        { kind: 'composed', name: 'dd' },
        { kind: 'resultEquals', value: '12' },
      ],
    },
    solution: [
      'def inc = fn (x) -> x + 1',
      'def double = fn (x) -> x * 2',
      'compose dd double inc',
      'run dd 5',
    ],
  },
];
