/** Core simulation types for LearnFP — a language-agnostic functional programming model. */

// ── Expressions (the small AST the evaluator understands) ─────────────────────

export type Expr =
  | { t: 'num'; v: number }
  | { t: 'bool'; v: boolean }
  | { t: 'str'; v: string }
  | { t: 'list'; items: Expr[] }
  | { t: 'fn'; params: string[]; body: Expr }
  | { t: 'app'; fn: Expr; args: Expr[] }
  | { t: 'bin'; op: string; l: Expr; r: Expr }
  | { t: 'un'; op: string; e: Expr }
  | { t: 'if'; cond: Expr; then: Expr; else: Expr }
  | { t: 'let'; name: string; value: Expr; in: Expr }
  | { t: 'match'; scrutinee: Expr; cases: MatchCase[] }
  | { t: 'cons'; name: string; args: Expr[] } // ADT constructor
  | { t: 'ident'; name: string }; // builtin / value / parameter reference

export interface MatchCase {
  /** 'Nil' | 'Cons(h, t)' | '_' — constructor or wildcard pattern. */
  pattern: string;
  vars: string[];
  body: Expr;
}

// ── Values (the concrete results of evaluation) ───────────────────────────────

export type FpValue =
  | number
  | boolean
  | FpString
  | FpList
  | FpFunction
  | FpAdt
  | FpEither
  | FpMaybe
  | FpLazyList
  | FpIo;

export interface FpString {
  __str: true;
  v: string;
}

export interface FpList {
  __list: true;
  items: FpValue[];
}

/**
 * A serializable reference to a built-in: its name, total arity (-1 = variadic),
 * and the arguments already supplied (currying). Stored as data — not a closure —
 * so function values survive `structuredClone` (undo/reset, level start states).
 */
export interface BuiltinRef {
  name: string;
  arity: number;
  provided: FpValue[];
}

export interface FpFunction {
  __fn: true;
  name: string;
  params: string[];
  body: Expr;
  /** Lexical capture for closures — the environment at definition time. */
  env: Env;
  pure: boolean;
  /** Builtin arity (-1 = variadic). Absent for user lambdas. */
  arity?: number;
  /** Present only for builtins; dispatches by name at apply time. */
  __builtin?: BuiltinRef;
  /** From `compose` — apply the chain in reverse. */
  composeChain?: FpFunction[];
}

export interface FpAdt {
  __adt: true;
  cons: string;
  args: FpValue[];
}

export interface FpEither {
  __either: true;
  side: 'Right' | 'Left';
  v: FpValue;
}

export interface FpMaybe {
  __maybe: true;
  just: boolean;
  v: FpValue;
}

/**
 * A lazy (deferred) list — models infinite structures. Stored as a serializable
 * *recipe* so it survives undo/reset (structuredClone). The next element is
 * computed on demand by `lazyNext`.
 */
export interface FpLazyList {
  __lazy: true;
  name: string;
  kind: 'from' | 'repeat' | 'drop';
  /** starting value (from) / element to consume (drop). */
  n?: number;
  /** constant element (repeat). */
  item?: FpValue;
  /** underlying stream (drop). */
  inner?: FpLazyList;
  /** how many elements have been consumed so far. */
  cursor: number;
}

export interface FpIo {
  __io: true;
  action: string;
}

/** Environment: bound values and user-defined functions / ADTs. */
export interface Env {
  values: Record<string, FpValue>;
  fns: Record<string, FpFunction>;
  adts: Record<string, string[]>;
}

// ── Board-facing metadata (readable, non-cyclic) ──────────────────────────────

export interface BoundValue {
  name: string;
  type: string;
  repr: string;
  effectful: boolean;
}

export interface PipelineNode {
  name: string;
  pure: boolean;
  sig: string;
}

export interface EffectEntry {
  action: string;
  note: string;
}

// ── Program state ─────────────────────────────────────────────────────────────

export interface ProgramState {
  /** Actual FpValues / functions the evaluator works with (threaded as Env). */
  env: Env;
  /** Board-facing metadata derived from `env`. */
  values: Record<string, BoundValue>;
  valueOrder: string[];
  functions: Record<string, PipelineNode>;
  fnOrder: string[];
  adts: Record<string, string[]>;
  adtOrder: string[];
  /** Currently composed pipeline (ordered, innermost-first). */
  pipeline: string[];
  result: { type: string; repr: string; effectful: boolean } | null;
  effects: EffectEntry[];
  /** Shared mutable cell used by the `bump`/`count` impure builtins. */
  counter: number;
  commandHistory: string[];
}

export interface CommandResult {
  ok: boolean;
  output: string;
  error?: string;
}

export interface DialogSlide {
  title?: string;
  markdown: string;
}

export type GoalCheck =
  | { kind: 'valueEquals'; name: string; value: string }
  | { kind: 'valueExists'; name: string }
  | { kind: 'functionDefined'; name: string }
  | { kind: 'functionPure'; name: string }
  | { kind: 'functionImpure'; name: string }
  | { kind: 'composed'; name: string }
  | { kind: 'resultEquals'; value: string }
  | { kind: 'resultEffectful' }
  | { kind: 'resultPure' }
  | { kind: 'eitherRight'; name: string }
  | { kind: 'eitherLeft'; name: string }
  | { kind: 'maybeJust'; name: string }
  | { kind: 'maybeNone'; name: string }
  | { kind: 'lazyValue'; name: string }
  | { kind: 'effectHandled' }
  | { kind: 'adtDefined'; name: string }
  | { kind: 'valueCount'; min: number }
  | { kind: 'pureFnCount'; min: number }
  | { kind: 'notEffectful'; name: string }
  | { kind: 'allOf'; checks: GoalCheck[] };

export interface SolutionStepStatus {
  command: string;
  done: boolean;
  note: string;
  optional?: boolean;
}

export interface LevelDef {
  id: string;
  series: string;
  seriesTitle: string;
  name: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  par: number;
  hint: string;
  objective: string;
  learning: string[];
  fieldNotes?: string[];
  startDialog: DialogSlide[];
  startState: ProgramState;
  goal: GoalCheck;
  solution: string[];
  disabled?: string[];
}

export interface LevelProgress {
  solved: boolean;
  bestCommands?: number;
}
