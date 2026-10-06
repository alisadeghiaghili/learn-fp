import type { LevelDef } from '../engine/types';
import { seed, seedAdt } from './state-factories';

export const typesLevels: LevelDef[] = [
  {
    id: 'types-1',
    series: 'types',
    seriesTitle: 'Types & Data',
    name: 'Define a type',
    difficulty: 2,
    par: 1,
    hint: 'type Shape = Circle(r) | Rect(w, h)',
    objective: 'Define an algebraic data type (a tagged union) with `type` and inspect it.',
    learning: [
      '`type Name = Ctor(a) | Ctor2(b, c)` declares a closed set of shapes',
      'Each constructor carries its own data; the set is exhaustive by construction',
      'This is how you model "it’s exactly one of these things" without loose objects',
    ],
    fieldNotes: [
      'In R: `list(kind = "circle", r = 3)` — the tag is manual and error-prone',
      'In Python: `@dataclass` per variant, or a Protocol/union — the ADT is implicit',
    ],
    startDialog: [
      {
        title: 'Modeling a closed set',
        markdown:
          'Often a value is *exactly one of a few things*. A shape is either a circle (with a radius) or a rectangle (with width and height):\n\n```\ntype Shape = Circle(r) | Rect(w, h)\n```\n\n`type` registers the constructors `Circle` and `Rect`. The board’s **Types** zone now lists the union.',
      },
      {
        title: 'Why not just a record?',
        markdown:
          'A record `{ kind, r, w, h }` lets you write nonsense: `Circle` with a width. An algebraic type makes the invalid cases *unrepresentable* — a `Circle` *can only* have a radius.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [{ kind: 'adtDefined', name: 'Shape' }],
    },
    solution: ['type Shape = Circle(r) | Rect(w, h)'],
  },
  {
    id: 'types-2',
    series: 'types',
    seriesTitle: 'Types & Data',
    name: 'Build a value',
    difficulty: 2,
    par: 1,
    hint: 'let c = Circle(3)',
    objective: 'Use a constructor to build a value of the type, then inspect its representation.',
    learning: [
      '`Circle(3)` applies a constructor to its data, producing a value',
      'Constructors are values you can bind with `let` and pass around',
      'The type label on the board is the constructor name',
    ],
    fieldNotes: [
      'Constructors are just functions — `Circle(3)` is an application like any other',
    ],
    startDialog: [
      {
        title: 'Constructors are functions',
        markdown:
          'The type `Shape` is already defined. Build a value by *applying* a constructor:\n\n```\nlet c = Circle(3)\n```\n\n`c` is now a circle with radius 3. Inspect it: `show c`.',
      },
    ],
    startState: seedAdt('Shape', ['Circle', 'Rect']),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'valueExists', name: 'c' },
        { kind: 'valueEquals', name: 'c', value: 'Circle(3)' },
      ],
    },
    solution: ['let c = Circle(3)'],
  },
  {
    id: 'types-3',
    series: 'types',
    seriesTitle: 'Types & Data',
    name: 'Pattern match',
    difficulty: 3,
    par: 3,
    hint: 'def area = fn (s) -> match s { Circle(r) -> 3 * r * r; Rect(w, h) -> w * h; _ -> 0 }',
    objective: 'Write a function that deconstructs a value by shape with `match` and computes on its parts.',
    learning: [
      '`match x { Pat(vars) -> body; ... }` selects a branch by the value’s constructor',
      'Patterns bind the constructor’s data to names you use in the body',
      'The `_` wildcard covers anything else and makes the match total',
    ],
    fieldNotes: [
      'This replaces a wall of `if kind == "circle" ... else if kind == "rect" ...`',
      'Each branch sees only the fields its constructor actually carries',
    ],
    startDialog: [
      {
        title: 'Compute by shape',
        markdown:
          'Define `area` that behaves differently per constructor:\n\n```\ndef area = fn (s) -> match s { Circle(r) -> 3 * r * r; Rect(w, h) -> w * h; _ -> 0 }\nrun area Circle(2)\nrun area Rect(3, 4)\n```\n\n`Circle(r)` binds the radius; `Rect(w, h)` binds both dimensions.',
      },
      {
        title: 'Exhaustiveness',
        markdown:
          'You must cover every constructor (or end with `_`). That’s what makes the function *total*: no shape can slip through without an answer.',
      },
    ],
    startState: seedAdt('Shape', ['Circle', 'Rect']),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'area' },
        { kind: 'resultEquals', value: '12' },
      ],
    },
    solution: [
      'def area = fn (s) -> match s { Circle(r) -> 3 * r * r; Rect(w, h) -> w * h; _ -> 0 }',
      'run area Rect(3, 4)',
    ],
  },
  {
    id: 'types-4',
    series: 'types',
    seriesTitle: 'Types & Data',
    name: 'Match a list, not a tag',
    difficulty: 4,
    par: 2,
    hint: 'def head = fn (xs) -> match xs { Cons(h, t) -> h; Nil -> 0; _ -> 0 }',
    objective: 'Pattern-match an algebraic list (Cons/Nil) instead of a plain tagged value.',
    learning: [
      'Lists are ADTs: `Cons(head, tail)` or `Nil`',
      'Matching them deconstructs structure, not just a label',
      'This is how you write structural recursion without indexing',
    ],
    fieldNotes: [
      'The built-in `head`/`tail` are just `match` under the hood',
      'Prefer matching over `[0]` — it names the shape you’re operating on',
    ],
    startDialog: [
      {
        title: 'Lists are types too',
        markdown:
          'A list is an algebraic type: a `Cons` with a head and a tail, or `Nil`.\n\n```\nlet xs = Cons(1, Cons(2, Nil))\ndef first = fn (xs) -> match xs { Cons(h, t) -> h; Nil -> 0; _ -> 0 }\nrun first xs\n```\n\n`Cons(h, t)` binds the head to `h` and the rest to `t`.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'first' },
        { kind: 'resultEquals', value: '1' },
      ],
    },
    solution: [
      'let xs = Cons(1, Cons(2, Nil))',
      'def first = fn (xs) -> match xs { Cons(h, t) -> h; Nil -> 0; _ -> 0 }',
      'run first xs',
    ],
  },
];
