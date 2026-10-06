import type { LevelDef } from '../engine/types';
import { seed } from './state-factories';

export const monadLevels: LevelDef[] = [
  {
    id: 'monad-1',
    series: 'monad',
    seriesTitle: 'Monads & Effects',
    name: 'Maybe: a value that might not be there',
    difficulty: 3,
    par: 2,
    hint: 'let m = just 5; run isJust m',
    objective: 'Wrap a possibly-absent value in `Maybe` and query it instead of using null.',
    learning: [
      '`just v` / `nothing` model "there is a value" vs "there isn’t"',
      'You carry the absence *explicitly* — no null, no crash',
      'Predicates like `isJust` let you branch on it safely',
    ],
    fieldNotes: [
      'In R: `NULL` is the Maybe; `if (is.null(x)) ...`',
      'In Python: `Optional[T]` / `None`',
    ],
    startDialog: [
      {
        title: 'Make absence a value',
        markdown:
          'Instead of `null`, wrap the “no value” case in a type:\n\n```\nlet m = just 5\nrun isJust m        # true\nlet none = nothing\nrun isJust none      # false\n```\n\n`Maybe` is either `Just(v)` or `Nothing` — the board shows which.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'valueExists', name: 'm' },
        { kind: 'maybeJust', name: 'm' },
      ],
    },
    solution: ['let m = just 5', 'run isJust m'],
  },
  {
    id: 'monad-2',
    series: 'monad',
    seriesTitle: 'Monads & Effects',
    name: 'Bind: compute over Maybe',
    difficulty: 3,
    par: 2,
    hint: 'def inc = fn (x) -> x + 1; let m = just 5; run bind m inc',
    objective: 'Use `bind` to thread a value through a function while preserving the Maybe wrapper.',
    learning: [
      '`bind m f` runs `f` on the inner value *if present*, and re-wraps the result',
      'If `m` is `nothing`, `bind` short-circuits — `f` never runs, no crash',
      'This is how you chain operations over optional data',
    ],
    fieldNotes: [
      'This is the “lift a function over a Maybe” idiom — the heart of monadic thinking',
    ],
    startDialog: [
      {
        title: 'Thread the context',
        markdown:
          'A function over a `Maybe` has to respect “maybe there’s no value.” `bind` does that:\n\n```\ndef inc = fn (x) -> x + 1\nlet m = just 5\nrun bind m inc      # Just(6) — the value survived, still wrapped\n```\n\nNow the None case:\n```\nlet none = nothing\nrun bind none inc   # nothing — inc never ran\n```\n\nSame code, no crash. That’s the win.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'functionDefined', name: 'inc' },
        { kind: 'resultEquals', value: 'Just(6)' },
      ],
    },
    solution: ['def inc = fn (x) -> x + 1', 'let m = just 5', 'run bind m inc'],
  },
  {
    id: 'monad-3',
    series: 'monad',
    seriesTitle: 'Monads & Effects',
    name: 'Either: carry an error',
    difficulty: 4,
    par: 2,
    hint: 'let e = right 10; def div10 = fn (x) -> x / 10; run bind e div10',
    objective: 'Model success/failure with `Either` and `bind` — errors short-circuit the chain.',
    learning: [
      '`right v` / `left e` model success vs failure (a typed error, not an exception)',
      '`bind` continues on `right` and short-circuits on `left`',
      'Failure propagates through a whole pipeline without try/catch',
    ],
    fieldNotes: [
      'In R: a `list(ok=, val=)` or `err=…`; in Python: `Result` types / exceptions',
      'Either makes *what can go wrong* part of the type, not a runtime surprise',
    ],
    startDialog: [
      {
        title: 'Errors as data',
        markdown:
          'An operation can fail. `Either` carries that:\n\n```\nlet ok = right 10\ndef div10 = fn (x) -> x / 10\nrun bind ok div10      # Right(1) — success, keeps going\n\nlet bad = left "not a number"\nrun bind bad div10     # Left("not a number") — div10 never runs\n```\n\nThe error flows through untouched; the rest of the chain is skipped.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'eitherRight', name: 'ok' },
        { kind: 'resultEquals', value: 'Right(1)' },
      ],
    },
    solution: [
      'let ok = right 10',
      'def div10 = fn (x) -> x / 10',
      'run bind ok div10',
    ],
  },
  {
    id: 'monad-4',
    series: 'monad',
    seriesTitle: 'Monads & Effects',
    name: 'Either: the error wins',
    difficulty: 4,
    par: 2,
    hint: 'let e = left "boom"; def inc = fn (x) -> x + 1; run bind e inc',
    objective: 'Confirm that a `Left` short-circuits: the continuation is never evaluated.',
    learning: [
      'On `Left`, `bind` returns the `Left` immediately',
      'The continuation is never run — no half-processed state',
      'This is “total by construction”: every input yields a defined result',
    ],
    fieldNotes: [
      'Contrast with exceptions: nothing is thrown, so no stack to unwind, no try/catch scattered around',
    ],
    startDialog: [
      {
        title: 'Short-circuit on failure',
        markdown:
          'Prove the point — feed a failure in:\n\n```\nlet e = left "boom"\ndef inc = fn (x) -> x + 1\nrun bind e inc\n```\n\nEven though `inc` is defined, it never runs because `e` is a `Left`. The result is `Left("boom")`.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'eitherLeft', name: 'e' },
        { kind: 'resultEquals', value: 'Left("boom")' },
      ],
    },
    solution: ['let e = left "boom"', 'def inc = fn (x) -> x + 1', 'run bind e inc'],
  },
  {
    id: 'monad-5',
    series: 'monad',
    seriesTitle: 'Monads & Effects',
    name: 'IO: quarantine the side effect',
    difficulty: 4,
    par: 2,
    hint: 'let a = io "read config"; run run a',
    objective: 'Model a side effect as a *description* (`io`), then execute it deliberately with `run`.',
    learning: [
      '`io "..."` builds a description of an effect — it does not perform it',
      'Only `run a` executes the action and records it in the Effects log',
      'Pure code composes freely; effects are run at the boundary, on purpose',
    ],
    fieldNotes: [
      'The whole program can stay pure until the very edge, where you `run` the effects',
      'This is why FP code is testable: effects don’t sneak into the middle',
    ],
    startDialog: [
      {
        title: 'Effects, but contained',
        markdown:
          'Reading a file, printing, the clock — these are effects. FP quarantines them:\n\n```\nlet a = io "read config"   # a *description*, nothing happens yet\nrun run a                  # now it executes, and shows in the Effects log\n```\n\nBuilding `a` is pure. Only `run a` touches the outside world — and it’s the *only* place that does.',
      },
    ],
    startState: seed(),
    goal: {
      kind: 'allOf',
      checks: [
        { kind: 'valueExists', name: 'a' },
        { kind: 'resultPure' },
        { kind: 'effectHandled' },
      ],
    },
    solution: ['let a = io "read config"', 'run run a'],
  },
];
