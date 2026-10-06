import type { LevelDef } from '../engine/types';
import { coreLevels } from './core';
import { hofLevels } from './hof';
import { typesLevels } from './types';
import { monadLevels } from './monad';
import { lazyLevels } from './lazy';
import { fieldLevels } from './field';

/** Pedagogical order of the concept series. */
export const SERIES_ORDER = ['core', 'hof', 'types', 'monad', 'lazy', 'field'] as const;
export type SeriesId = (typeof SERIES_ORDER)[number];

const PACKS: Record<SeriesId, LevelDef[]> = {
  core: coreLevels,
  hof: hofLevels,
  types: typesLevels,
  monad: monadLevels,
  lazy: lazyLevels,
  field: fieldLevels,
};

/** All levels, in series order (the intended learning path). */
export const LEVELS: LevelDef[] = SERIES_ORDER.flatMap((s) => PACKS[s]);

export const SERIES_TITLES: Record<SeriesId, string> = {
  core: 'Pure & Compose',
  hof: 'Higher-Order',
  types: 'Types & Data',
  monad: 'Monads & Effects',
  lazy: 'Laziness',
  field: 'Field practice',
};

export function levelById(id: string): LevelDef | undefined {
  return LEVELS.find((l) => l.id === id);
}

/** The level immediately after `id` in the learning path (null at the end). */
export function levelAfter(id: string): LevelDef | null {
  const i = LEVELS.findIndex((l) => l.id === id);
  return i >= 0 && i + 1 < LEVELS.length ? (LEVELS[i + 1] as LevelDef) : null;
}

export function seriesOf(level: LevelDef): SeriesId {
  return level.series as SeriesId;
}

export function levelsInSeries(series: SeriesId): LevelDef[] {
  return PACKS[series];
}

export const TOTAL_LEVELS = LEVELS.length;
