import type { GameMode } from '../shared/api';

export type ModeRules = {
  label: string;
  /** Whether red danger meteors appear. */
  danger: boolean;
  /** Whether golden meteors appear. */
  golden: boolean;
};

/**
 * Easy has normal meteors only, medium adds danger, hard adds golden, and
 * ranked is the full game. Each level has its own leaderboards.
 */
export const MODES: Record<GameMode, ModeRules> = {
  easy: { label: 'EASY', danger: false, golden: false },
  medium: { label: 'MEDIUM', danger: true, golden: false },
  hard: { label: 'HARD', danger: true, golden: true },
  ranked: { label: 'RANKED', danger: true, golden: true },
};

export const DEFAULT_MODE: GameMode = 'ranked';

/** Data passed to the Game scene when a run starts. */
export type RunOptions = { mode: GameMode };
