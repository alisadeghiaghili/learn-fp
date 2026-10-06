# LearnFP — Design Spec

Interactive **functional programming** visualizer + tutorial: sandbox, terminal, goal-driven
levels. The core course is **language-agnostic** (it teaches the *concepts*: purity,
composition, pattern matching, higher-order functions, monads, laziness); concrete language
examples are surfaced for **R** and **Python** in the lesson dialogs and the terminal.

## Style anchor

- **Product genre**: terminal-native learning game for functional programming.
- **Real-world feel**: a data-flow "material board" — values flow through a pipeline of pure
  functions, side effects are quarantined, and the result is a typed value. Not a SaaS page,
  not a code-runner clone.
- **Mode**: expressive educational UI (game chrome + technical density).

## Palette

| Token       | Hex       | Role                                      |
|-------------|-----------|-------------------------------------------|
| `--ink`     | `#0E1318` | App chrome / terminal background          |
| `--panel`   | `#182029` | Raised panels, toolbar, cards             |
| `--panel-2` | `#22303C` | Nested chips, hover fills                 |
| `--line`    | `#2E3D4D` | Hairline borders                          |
| `--haze`    | `#8FA0B2` | Secondary text                            |
| `--text`    | `#E8EEF4` | Primary text                              |
| `--fp`      | `#8B5CF6` | Pure functions / composed pipelines       |
| `--value`   | `#2DD4BF` | Values / data flowing                     |
| `--effect`  | `#F59E0B` | Effects (IO, Maybe, Error)                |
| `--code`    | `#60A5FA` | Code snippets / signatures                |
| `--ok`      | `#34D399` | Success, solved, clean status             |
| `--warn`    | `#FBBF24` | Impure / side-effectful                   |
| `--err`     | `#F87171` | Errors, exceptions                        |

## Typography

| Role     | Stack                                                          | Usage                          |
|----------|----------------------------------------------------------------|--------------------------------|
| UI       | `Segoe UI, system-ui, -apple-system, sans-serif`               | Dialogs, toolbar, labels       |
| Mono     | `Cascadia Code, Consolas, ui-monospace, monospace`             | Terminal, snippets, types      |

- Title scale: 20–22px / 600 for level names; body 14–15px; mono 13–14px.
- Display personality comes from **density + mono data**, not a decorative webfont.

## Layout system

```
┌──────────────────────────────────────────────────────────────┐
│ toolbar: brand · level name · levels · guide · undo · reset  │
├──────────────────────────────────────────────────────────────┤
│ DATA-FLOW BOARD                                              │
│  [ Values ]  ──►  [ Pipeline (pure fns) ]  ──►  [ Result ]  │
│  optional effect/Monad strip below                           │
├──────────────────────────────────────────────────────────────┤
│ terminal (command history, output log)                       │
└──────────────────────────────────────────────────────────────┘
```

- Three equal-ish zones, 12–16px gaps, 24px page gutter.
- Level guide opens as a right dock (not a second full canvas).
- Responsive: stack zones vertically under ~900px; terminal always last.

## Signature moment

**Composing a pure pipeline.** When a learner pipes a value through functions:
1. The value card enters the Values zone.
2. Each function in the Pipeline strip lights up in order as the value passes through.
3. The Result card shows the final typed value.
4. If a function is impure (side effect), a warning chip flags it and the value is marked
   "effectful" — teaching the core FP idea: *pure transformations compose; effects must be
   handled deliberately*.

That single animation teaches "everything is a value; side effects are contained" better than
any paragraph.

## What this is NOT

- Not a real interpreter with a full type system. Values are concrete; types are descriptive
  labels that install the mental model.
- No purple AI gradient hero, no stock photos, no marketing landing page as home.
- Home = sandbox (or intro dialog → first level).

## Product surface

1. **Sandbox** — free-form FP expression evaluation with seed data.
2. **Levels** — concept packs with start state, goal checks, hint, solution, par.
3. **Terminal commands** — a language-agnostic FP DSL (`let`, `pure`, `pipe`, `map`, `filter`,
   `fold`, `match`, `either`, `maybe`, `io`, `lazy`, …) plus meta: `levels`, `hint`, `show goal`,
   `show solution`, `reset`, `undo`, `sandbox`, `help`.
4. **Language tracks** — R and Python example snippets per concept (`show code r`, `show code py`).
5. **Persistence** — solved levels + best command counts in `localStorage`.

## Level packs (v1)

| Series           | ID prefix  | Teaches                                          |
|------------------|------------|--------------------------------------------------|
| Pure & Compose   | `core-`    | pure functions, no side effects, composition     |
| Types & Data     | `types-`   | ADTs, algebraic types, pattern matching          |
| Higher-Order     | `hof-`     | first-class functions, map/filter/fold           |
| Monads & Effects | `monad-`   | Maybe, Either (error handling), IO               |
| Laziness         | `lazy-`    | lazy evaluation, infinite structures             |
| Field practice   | `field-`   | real-world idioms, capstone                      |

Each level: intro dialog (markdown), `hint`, declarative goal, solution commands, par.

## Engine model (simplified but honest)

- `values`: named values → `{ name, type, repr, effectful }`
- `functions`: name → `{ sig, body, pure }` (pure functions are first-class, composable)
- `pipeline`: the current composition (ordered list of function names)
- `result`: `{ type, repr, effectful }` — the output of evaluating the pipeline
- `effects`: a log of side effects observed (IO actions, exceptions)
- `bindings`: let-bound names → value (the environment)
- Values are concrete (numbers, lists, records, functions) — deterministic, no crypto

Goal checks compare a **projection** of state (a value equals X, a function is pure, the
pipeline composes, a monad wraps a value, an effect was handled) — not raw object identity.

## Engineering conventions

- TypeScript strict, English identifiers, clean structure.
- Vitest for engine/compare/level-solution tests.
- Files/docs in English; product voice is direct and technical.

## Future (out of v1)

- Level builder / import JSON
- More language tracks (Haskell, F#, Clojure, Elixir, JS)
- Localized UI (Persian/English already supported)
- A real (small) type checker
