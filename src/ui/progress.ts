import type { LevelProgress } from '../engine/types';
import { LEVELS } from '../levels';

export const STORAGE_KEY = 'learn-fp-progress-v1';

export interface CurriculumSummary {
  solvedCount: number;
  total: number;
  percent: number;
  nextId: string | null;
}

export function loadProgress(): Record<string, LevelProgress> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'progress' in parsed) {
      const inner = (parsed as { progress?: Record<string, LevelProgress> }).progress;
      return inner && typeof inner === 'object' ? inner : {};
    }
    if (parsed && typeof parsed === 'object') return parsed as Record<string, LevelProgress>;
    return {};
  } catch {
    return {};
  }
}

export function saveProgress(progress: Record<string, LevelProgress>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ progress, savedAt: new Date().toISOString() }));
  } catch {
    /* private mode / quota — progress just won't persist */
  }
}

export function summarizeCurriculum(progress: Record<string, LevelProgress>): CurriculumSummary {
  const solvedCount = LEVELS.filter((l) => progress[l.id]?.solved).length;
  const total = LEVELS.length;
  const nextId = LEVELS.find((l) => !progress[l.id]?.solved)?.id ?? null;
  return {
    solvedCount,
    total,
    nextId,
    percent: total ? Math.round((solvedCount / total) * 100) : 0,
  };
}
