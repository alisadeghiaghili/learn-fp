import type { LevelDef } from '../engine/types';
import { seed, list } from './state-factories';

export const hofLevels: LevelDef[] = [
  {
    id: 'hof-1',
    series: 'hof',
    seriesTitle: 'Higher-Order',
    name: 'Map over a list',
    difficulty: 2,
    par: 2,
    hint: 'let xs = [1 2 3]; run map double xs',
    objective: 'Use `map` to apply a function to every element of a list, producing a new list.',
    learning: [
      'Functions are values — pass `double` into `map`',
      '`map f xs` returns a NEW list; the original is untouched',
      'map is the FP replacement for a for-loop that transforms',
    ],
    fieldNotes: [
      'map keeps the same shape: list of ints in → list of ints out',
      'No index, no accumulator, no mutation — just the transformation',
    ],
    startDialog: [
      {
        title: 'A function that takes a function',
        markdown:
          '`double` is already defined. Now hand it to a **higher-order** function:\n\n```\nlet xs = [1 2 3]\nrun map double xs\n```\n\n`map` calls `double` on each element and collects the results. You did not loop — you *declared the transformation*.',
      },
      {
        title: 'Why this scales',
        markdown:
          'The same `double` works on any list, of any length. The function and the collection are separated, so both are reusable and independently testable.',
      },
    ],
    startState: seed({ fns: { double: 'fn (n) -> n * 2' } }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'valueExists', name: 'xs' },
        { kind: 'resultEquals', value: '[2 4 6]' },
      ],
    },
    solution: ['let xs = [1 2 3]', 'run map double xs'],
  },
  {
    id: 'hof-2',
    series: 'hof',
    seriesTitle: 'Higher-Order',
    name: 'Filter with a predicate',
    difficulty: 2,
    par: 2,
    hint: 'let xs = [1 2 3 4 5 6]; run filter is_even xs',
    objective: 'Use `filter` with a boolean predicate to keep only elements that match.',
    learning: [
      'A predicate is a function returning true/false',
      '`filter p xs` keeps exactly the elements where p is true',
      'Composition of small transforms: filter then map is a common pattern',
    ],
    fieldNotes: [
      'filter is selection; map is transformation. Most data work is a mix of both',
      'Keep predicates as named pure functions — they read like requirements',
    ],
    startDialog: [
      {
        title: 'Keep what matches',
        markdown:
          'Define a predicate, then filter:\n\n```\nlet xs = [1 2 3 4 5 6]\ndef is_even = fn (n) -> n % 2 == 0\nrun filter is_even xs\n```\n\nThe result is a *smaller* list: only the elements for which `is_even` returned `true`.',
      },
    ],
    startState: seed({ values: { xs: list([1, 2, 3, 4, 5, 6]) } }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'is_even' },
        { kind: 'resultEquals', value: '[2 4 6]' },
      ],
    },
    solution: ['def is_even = fn (n) -> n % 2 == 0', 'run filter is_even xs'],
  },
  {
    id: 'hof-3',
    series: 'hof',
    seriesTitle: 'Higher-Order',
    name: 'Fold a list to a value',
    difficulty: 3,
    par: 2,
    hint: 'let xs = [1 2 3 4 5]; run fold 0 add xs',
    objective: 'Use `fold` to reduce a list to a single value with an accumulator and a combiner.',
    learning: [
      '`fold init f xs` threads an accumulator through the list',
      'fold is the universal "loop" for immutable code (sum, product, max, …)',
      'The combiner `f acc x` must be pure',
    ],
    fieldNotes: [
      'Any loop that *accumulates* can be a fold',
      'sum = fold 0 (+), product = fold 1 (*) — same shape, different seed',
    ],
    startDialog: [
      {
        title: 'From list to one value',
        markdown:
          'A **fold** walks a list carrying an accumulator:\n\n```\nlet xs = [1 2 3 4 5]\ndef add = fn (acc, x) -> acc + x\nrun fold 0 add xs\n```\n\nStart at `0`, then `0+1, +2, +3, +4, +5` → **15**. You described the reduction, not the iteration.',
      },
    ],
    startState: seed({ values: { xs: list([1, 2, 3, 4, 5]) } }),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'add' },
        { kind: 'resultEquals', value: '15' },
      ],
    },
    solution: ['def add = fn (acc, x) -> acc + x', 'run fold 0 add xs'],
  },
  {
    id: 'hof-4',
    series: 'hof',
    seriesTitle: 'Higher-Order',
    name: 'Compose map + filter + fold',
    difficulty: 4,
    par: 4,
    hint: 'let nums = [1 2 3 4 5 6]; run fold 0 add (filter is_even (map double nums))',
    objective: 'Chain map, filter, and fold into one pipeline to transform, select, and reduce a list.',
    learning: [
      'Data pipelines compose: transform (map) → select (filter) → reduce (fold)',
      'Each stage is a pure function; the pipeline is their composition',
      'This is the shape of most real data processing',
    ],
    fieldNotes: [
      'Read the pipeline inside-out: map first, then filter, then fold',
      'When a pipeline grows long, name the middle stages for clarity',
    ],
    startDialog: [
      {
        title: 'The full pipeline',
        markdown:
          'Combine the three tools. Double every number, keep the evens, sum them:\n\n```\nlet nums = [1 2 3 4 5 6]\nrun fold 0 add (filter is_even (map double nums))\n```\n\n- `map double` → [2 4 6 8 10 12]\n- `filter is_even` → [2 4 6 8 10 12]\n- `fold 0 add` → **42**',
      },
    ],
    startState: seed({
      values: { nums: list([1, 2, 3, 4, 5, 6]) },
      fns: {
        double: 'fn (n) -> n * 2',
        is_even: 'fn (n) -> n % 2 == 0',
        add: 'fn (a, b) -> a + b',
      },
    }),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'resultEquals', value: '42' }],
    },
    solution: ['run fold 0 add (filter is_even (map double nums))'],
  },
  {
    id: 'hof-5',
    series: 'hof',
    seriesTitle: 'Higher-Order',
    name: 'Build a closure',
    difficulty: 4,
    par: 2,
    hint: 'def adder = fn (n) -> fn (x) -> x + n; let add5 = adder 5; run add5 10',
    objective: 'Return a function from a function to build a closure that remembers a captured value.',
    learning: [
      'A function can return another function',
      'The inner function *closes over* the outer parameter (a closure)',
      'Closures carry state functionally — as captured values, not globals',
    ],
    fieldNotes: [
      'Closures power partial application: adder(5) is a ready-made adder-of-5',
      'They replace mutable "state objects" with captured values',
    ],
    startDialog: [
      {
        title: 'A function that makes functions',
        markdown:
          '```\ndef adder = fn (n) -> fn (x) -> x + n\nlet add5 = adder 5\nrun add5 10   # 15\n```\n\n`adder 5` doesn\'t return a number — it returns a **function** that has `n = 5` baked in. That captured value is the closure.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'adder' },
        { kind: 'valueExists', name: 'add5' },
        { kind: 'resultEquals', value: '15' },
      ],
    },
    solution: [
      'def adder = fn (n) -> fn (x) -> x + n',
      'let add5 = adder 5',
      'run add5 10',
    ],
  },
];
