import type { LevelDef, ProgramState, GoalCheck, DialogSlide } from '../engine/types';
import { emptyState, refresh } from '../engine/state';
import { parseExpr } from '../engine/parser';
import { isImpureExpr } from '../engine/eval';

const CUSTOM_KEY = 'learn-fp-custom-levels-v1';

/** The plain, JSON-serializable form of an imported level. */
export interface LevelSpec {
  id: string;
  series: string;
  seriesTitle: string;
  name: string;
  difficulty: number;
  par: number;
  hint: string;
  objective: string;
  learning: string[];
  fieldNotes?: string[];
  startDialog: DialogSlide[];
  /** Starting workspace: values (name -> number), fns (name -> `fn (…) -> …`), adts (name -> ctors). */
  start: { values?: Record<string, number>; fns?: Record<string, string>; adts?: Record<string, string[]> };
  goal: GoalCheck;
  solution: string[];
}

/**
 * Build a ProgramState from a level's `start` spec. Functions are parsed into
 * real, executable closures so an imported level runs identically to a
 * built-in one.
 */
export function buildStartState(start: LevelSpec['start']): ProgramState {
  const s = emptyState();
  for (const [name, v] of Object.entries(start.values ?? {})) s.env.values[name] = v;
  for (const [name, src] of Object.entries(start.fns ?? {})) {
    const e = parseExpr(src);
    if (e.t === 'fn') {
      s.env.fns[name] = {
        __fn: true,
        name,
        params: e.params,
        body: e.body,
        env: s.env,
        pure: !isImpureExpr(e.body),
        arity: e.params.length,
      };
    }
  }
  for (const [name, variants] of Object.entries(start.adts ?? {})) s.env.adts[name] = variants;
  refresh(s);
  return s;
}

/** Build a full LevelDef (with a live startState) from a serializable spec. */
export function buildLevelFromSpec(spec: LevelSpec): LevelDef {
  return {
    id: spec.id,
    series: spec.series,
    seriesTitle: spec.seriesTitle,
    name: spec.name,
    difficulty: spec.difficulty as 1 | 2 | 3 | 4 | 5,
    par: spec.par,
    hint: spec.hint,
    objective: spec.objective,
    learning: spec.learning,
    fieldNotes: spec.fieldNotes,
    startDialog: spec.startDialog,
    startState: buildStartState(spec.start),
    goal: spec.goal,
    solution: spec.solution,
  };
}

// ── Validation ────────────────────────────────────────────────────────────────

export interface ParseResult {
  spec?: LevelSpec;
  level?: LevelDef;
  error?: string;
}

function isGoalCheck(v: unknown): boolean {
  return !!v && typeof v === 'object' && 'kind' in (v as object) && typeof (v as { kind: unknown }).kind === 'string';
}

function isSlides(v: unknown): boolean {
  return Array.isArray(v) && (v as unknown[]).length > 0 && (v as object[]).every((s) => !!s && typeof s === 'object' && 'markdown' in s);
}

/** Parse + validate a raw JSON string into a LevelSpec (and its LevelDef). */
export function parseLevelJson(raw: string): ParseResult {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    return { error: `Not valid JSON: ${e instanceof Error ? e.message : String(e)}` };
  }
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: 'Expected a JSON object.' };
  const d = data as Record<string, unknown>;

  for (const key of ['id', 'series', 'name', 'goal', 'solution'] as const) {
    if (d[key] === undefined) return { error: `Missing required field '${key}'.` };
  }
  const id = d.id as string;
  if (!/^[a-z][a-z0-9-]*$/.test(id)) return { error: `id must be a lowercase slug like 'my-1' (got '${id}').` };

  const start = (d.start ?? {}) as LevelSpec['start'];
  if (start.values) for (const [k, v] of Object.entries(start.values)) if (typeof v !== 'number') return { error: `start.values.${k} must be a number.` };
  if (start.fns) for (const [k, v] of Object.entries(start.fns)) if (typeof v !== 'string') return { error: `start.fns.${k} must be a function source string.` };

  const solution = d.solution as unknown;
  if (!Array.isArray(solution) || solution.length === 0 || !(solution as unknown[]).every((x) => typeof x === 'string')) {
    return { error: 'solution must be a non-empty array of command strings.' };
  }

  const difficulty = typeof d.difficulty === 'number' ? (d.difficulty as number) : 2;
  if (difficulty < 1 || difficulty > 5) return { error: 'difficulty must be 1–5.' };

  const spec: LevelSpec = {
    id,
    series: d.series as string,
    seriesTitle: typeof d.seriesTitle === 'string' ? d.seriesTitle : (d.series as string),
    name: d.name as string,
    difficulty,
    par: typeof d.par === 'number' && d.par > 0 ? (d.par as number) : (solution.length as number),
    hint: typeof d.hint === 'string' ? d.hint : (solution[0] as string),
    objective: typeof d.objective === 'string' ? d.objective : (d.name as string),
    learning: Array.isArray(d.learning) ? (d.learning as string[]) : [],
    fieldNotes: Array.isArray(d.fieldNotes) ? (d.fieldNotes as string[]) : undefined,
    startDialog: isSlides(d.startDialog) ? (d.startDialog as DialogSlide[]) : [],
    start,
    goal: isGoalCheck(d.goal) ? (d.goal as GoalCheck) : { kind: 'valueExists', name: 'result' },
    solution: solution as string[],
  };
  return { spec, level: buildLevelFromSpec(spec) };
}

// ── Persistence (specs only — fully serializable) ─────────────────────────────

function safeParse(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const isSpec = (v: unknown): v is LevelSpec =>
  !!v && typeof v === 'object' && ['id', 'series', 'name', 'goal', 'solution'].every((k) => Object.prototype.hasOwnProperty.call(v, k));

/** Load previously imported level specs from localStorage (best-effort). */
export function loadCustomSpecs(): LevelSpec[] {
  let raw: unknown;
  try {
    raw = safeParse(localStorage.getItem(CUSTOM_KEY));
  } catch {
    return []; // node / no localStorage
  }
  if (!Array.isArray(raw)) return [];
  const out: LevelSpec[] = [];
  for (const entry of raw as unknown[]) if (isSpec(entry)) out.push(entry);
  return out;
}

/** Persist imported level specs. */
export function persistCustomLevels(specs: LevelSpec[]): void {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(specs));
  } catch {
    /* quota / private mode — import still works for this session */
  }
}
