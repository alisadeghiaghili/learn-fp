import type { LevelDef } from '../engine/types';
import { coreLevels } from './core';
import { hofLevels } from './hof';
import { typesLevels } from './types';
import { monadLevels } from './monad';
import { lazyLevels } from './lazy';
import { fieldLevels } from './field';
import { loadCustomSpecs, persistCustomLevels, buildLevelFromSpec, type LevelSpec } from './import';

/** Pedagogical order of the built-in concept series. */
const BUILTIN_SERIES_ORDER = ['core', 'hof', 'types', 'monad', 'lazy', 'field'] as const;

const BUILTIN_PACKS: Record<string, LevelDef[]> = {
  core: coreLevels,
  hof: hofLevels,
  types: typesLevels,
  monad: monadLevels,
  lazy: lazyLevels,
  field: fieldLevels,
};

const BUILTIN_TITLES: Record<string, string> = {
  core: 'Pure & Compose',
  hof: 'Higher-Order',
  types: 'Types & Data',
  monad: 'Monads & Effects',
  lazy: 'Laziness',
  field: 'Field practice',
};

/**
 * The full curriculum: built-in levels followed by any imported (custom)
 * levels. The array is a stable const reference — `addCustomLevel` mutates it
 * in place so every reader (progress, picker) sees the current set.
 */
export const LEVELS: LevelDef[] = BUILTIN_SERIES_ORDER.flatMap((s) => BUILTIN_PACKS[s]!);

let customSpecs: LevelSpec[] = loadCustomSpecs();
let customLevels: LevelDef[] = customSpecs.map(buildLevelFromSpec);
if (customLevels.length) for (const l of customLevels) LEVELS.push(l);

/** Built-in series in order, plus any series introduced by imported levels. */
export function seriesOrder(): string[] {
  const order: string[] = [...BUILTIN_SERIES_ORDER];
  for (const l of customLevels) if (!order.includes(l.series)) order.push(l.series);
  return order;
}

export function seriesTitle(id: string): string {
  if (BUILTIN_TITLES[id]) return BUILTIN_TITLES[id]!;
  const l = customLevels.find((x) => x.series === id);
  return l?.seriesTitle ?? id;
}

export function levelsInSeries(series: string): LevelDef[] {
  const builtin = BUILTIN_PACKS[series];
  if (builtin) return builtin;
  return customLevels.filter((l) => l.series === series);
}

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** The level immediately after `id` in the learning path (null at the end). */
export function levelAfter(id: string): LevelDef | null {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < LEVELS.length ? (LEVELS[i + 1] as LevelDef) : null;
}

export function totalLevels(): number {
  return LEVELS.length;
}

/** Append an imported level (by serializable spec) to the curriculum and persist it. */
export function addCustomLevel(spec: LevelSpec): void {
  if (LEVELS.some((l) => l.id === spec.id)) return; // id already present
  customSpecs = [...customSpecs, spec];
  const level = buildLevelFromSpec(spec);
  customLevels = [...customLevels, level];
  LEVELS.push(level);
  persistCustomLevels(customSpecs);
}
