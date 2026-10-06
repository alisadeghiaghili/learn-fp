import type { LevelDef } from '../engine/types';
import { seed } from './state-factories';

export const lazyLevels: LevelDef[] = [
  {
    id: 'lazy-1',
    series: 'lazy',
    seriesTitle: 'Laziness',
    name: 'An infinite stream',
    difficulty: 4,
    par: 2,
    hint: 'let nats = from 0; run take 5 nats',
    objective: 'Build an infinite stream and `take` a finite slice of it.',
    learning: [
      '`from 0` describes an infinite count — it does not try to store all of it',
      'The value is computed *on demand*, one element at a time',
      '`take n` forces exactly `n` elements and stops',
    ],
    fieldNotes: [
      'In Python: a generator (`while True: yield x`) is lazy the same way',
      'In R: an `Iterator` / sequence generator',
    ],
    startDialog: [
      {
        title: 'Define the infinite, use the finite',
        markdown:
          '```\nlet nats = from 0\nrun take 5 nats    # [0 1 2 3 4]\n```\n\n`nats` is infinite — but `take 5` only computed five numbers. You never asked it to build “all of them,” so it never did. That’s laziness: *work happens only when demanded.*',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'lazyValue', name: 'nats' },
        { kind: 'resultEquals', value: '[0 1 2 3 4]' },
      ],
    },
    solution: ['let nats = from 0', 'run take 5 nats'],
  },
  {
    id: 'lazy-2',
    series: 'lazy',
    seriesTitle: 'Laziness',
    name: 'Skip the front, take the rest',
    difficulty: 4,
    par: 2,
    hint: 'let nats = from 1; run take 5 (drop 3 nats)',
    objective: 'Use `drop` to skip elements of a stream, then `take` a window.',
    learning: [
      '`drop k xs` skips the first `k` elements',
      'Chaining `drop` then `take` gives you a window into an infinite source',
      'Neither `drop` nor `take` materializes the whole stream',
    ],
    fieldNotes: [
      'The `islice` of a generator in Python is the same idea',
    ],
    startDialog: [
      {
        title: 'Windowing an infinite source',
        markdown:
          '```\nlet nats = from 1      # 1 2 3 4 5 6 7 …\nrun take 5 (drop 3 nats)   # drop 1,2,3 → start at 4 → [4 5 6 7 8]\n```\n\nYou pulled a five-element window out of something infinite.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'resultEquals', value: '[4 5 6 7 8]' }],
    },
    solution: ['let nats = from 1', 'run take 5 (drop 3 nats)'],
  },
  {
    id: 'lazy-3',
    series: 'lazy',
    seriesTitle: 'Laziness',
    name: 'repeat: a constant stream',
    difficulty: 3,
    par: 2,
    hint: 'let ones = repeat 7; run take 3 ones',
    objective: 'Build a constant infinite stream with `repeat` and take from it.',
    learning: [
      '`repeat v` yields `v` forever',
      'Combined with `take`, a constant stream is a convenient way to tile values',
      'The stream stays lazy — no list of a million 7s is ever built',
    ],
    fieldNotes: ['`itertools.repeat` in Python'],
    startDialog: [
      {
        title: 'The same value, forever',
        markdown:
          '```\nlet sevens = repeat 7\nrun take 3 sevens    # [7 7 7]\n```\n\nAn infinite run of 7s, but only three were ever produced.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'lazyValue', name: 'sevens' },
        { kind: 'resultEquals', value: '[7 7 7]' },
      ],
    },
    solution: ['let sevens = repeat 7', 'run take 3 sevens'],
  },
  {
    id: 'lazy-4',
    series: 'lazy',
    seriesTitle: 'Laziness',
    name: 'Infinite, then finite, then transform',
    difficulty: 5,
    par: 3,
    hint: 'let nats = from 0; def is_even = fn (n) -> n % 2 == 0; run filter is_even (take 10 nats)',
    objective: 'Take a finite slice of an infinite stream, then transform that slice.',
    learning: [
      '`take` is the bridge from the lazy/infinite world to a concrete list',
      'Once concrete, the usual `map`/`filter`/`fold` apply',
      'Infinite source → finite slice → transformation is the standard pattern',
    ],
    fieldNotes: [
      'You cannot `map` directly over a live infinite stream (it would never end) — take a window first',
    ],
    startDialog: [
      {
        title: 'The full pattern',
        markdown:
          '```\nlet nats = from 0\ndef is_even = fn (n) -> n % 2 == 0\nrun filter is_even (take 10 nats)\n```\n\n`take 10` gives the concrete `[0 1 … 9]`; `filter is_even` keeps `[0 2 4 6 8]`.\n\nThe infinite part stayed infinite. You only ever touched what you needed.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'lazyValue', name: 'nats' },
        { kind: 'resultEquals', value: '[0 2 4 6 8]' },
      ],
    },
    solution: [
      'let nats = from 0',
      'def is_even = fn (n) -> n % 2 == 0',
      'run filter is_even (take 10 nats)',
    ],
  },
];
