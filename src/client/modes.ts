import type { GameMode } from '../shared/api';

export type ModeRules = {
  label: string;
  /** Whether red danger meteors appear. */
  danger: boolean;
  /** Whether golden meteors appear. */
  golden: boolean;
  /** Whether meteors fall faster as the run goes on; otherwise speed is constant. */
  speedRamps: boolean;
};

/**
 * Easy has normal meteors only, medium adds danger, hard adds golden, and
 * ranked is the full game, the only level where meteors speed up over time.
 * Each level has its own leaderboards.
 */
export const MODES: Record<GameMode, ModeRules> = {
  easy: { label: 'EASY', danger: false, golden: false, speedRamps: false },
  medium: { label: 'MEDIUM', danger: true, golden: false, speedRamps: false },
  hard: { label: 'HARD', danger: true, golden: true, speedRamps: false },
  ranked: { label: 'RANKED', danger: true, golden: true, speedRamps: true },
};

export const DEFAULT_MODE: GameMode = 'ranked';

/** Data passed to the Game scene when a run starts. */
export type RunOptions = { mode: GameMode };
