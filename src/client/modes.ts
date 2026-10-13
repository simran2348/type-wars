import type { GameMode } from '../shared/api';

export type ModeRules = {
  label: string;
  /** Whether violet danger meteors appear. */
  danger: boolean;
  /** Whether golden meteors appear. */
  golden: boolean;
  /** Whether heart meteors appear to win back a lost life. */
  heart: boolean;
  /** Whether meteors fall faster as the run goes on; otherwise speed is constant. */
  speedRamps: boolean;
};

/**
 * Easy has normal meteors only, medium adds danger, hard adds golden, and
 * ranked is the full game, the only level where meteors speed up over time.
 * Easy to hard also get heart meteors that give a lost life back.
 * Each level has its own leaderboards.
 */
export const MODES: Record<GameMode, ModeRules> = {
  easy: {
    label: 'EASY',
    danger: false,
    golden: false,
    heart: true,
    speedRamps: false,
  },
  medium: {
    label: 'MEDIUM',
    danger: true,
    golden: false,
    heart: true,
    speedRamps: false,
  },
  hard: {
    label: 'HARD',
    danger: true,
    golden: true,
    heart: true,
    speedRamps: false,
  },
  ranked: {
    label: 'RANKED',
    danger: true,
    golden: true,
    heart: false,
    speedRamps: true,
  },
};

export const DEFAULT_MODE: GameMode = 'ranked';

/** Data passed to the Game scene when a run starts. */
export type RunOptions = { mode: GameMode };
