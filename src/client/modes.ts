import type { GameMode } from '../shared/api';

export type ModeRules = {
  label: string;
  /** Whether violet danger meteors appear. */
  danger: boolean;
  /** Whether golden meteors appear. */
  golden: boolean;
  /** Whether heart meteors appear to win back a lost life. */
  heart: boolean;
  /** Whether this level's leaderboard marks its top three with medallions. */
  medals: boolean;
  /** The most meteors on screen at once, reached late in a run. */
  maxMeteors: number;
  /** Whether meteors fall faster as the run goes on; otherwise speed is constant. */
  speedRamps: boolean;
};

/**
 * Easy has normal meteors only, medium adds danger, hard adds golden, and
 * ranked is the full game, the only level where meteors speed up over time.
 * Easy to hard also get heart meteors that give a lost life back, and each
 * allows fewer meteors on screen than the next so the late game stays readable.
 * Each level has its own leaderboards.
 */
export const MODES: Record<GameMode, ModeRules> = {
  easy: {
    label: 'EASY',
    danger: false,
    golden: false,
    heart: true,
    medals: false,
    maxMeteors: 4,
    speedRamps: false,
  },
  medium: {
    label: 'MEDIUM',
    danger: true,
    golden: false,
    heart: true,
    medals: false,
    maxMeteors: 5,
    speedRamps: false,
  },
  hard: {
    label: 'HARD',
    danger: true,
    golden: true,
    heart: true,
    medals: false,
    maxMeteors: 6,
    speedRamps: false,
  },
  ranked: {
    label: 'RANKED',
    danger: true,
    golden: true,
    heart: false,
    medals: true,
    maxMeteors: 7,
    speedRamps: true,
  },
};

export const DEFAULT_MODE: GameMode = 'ranked';

/** Leaderboard tabs lead with ranked, then the levels from easy to hard. */
export const LEADERBOARD_TABS: readonly GameMode[] = [
  'ranked',
  'easy',
  'medium',
  'hard',
];

/** Data passed to the Game scene when a run starts. */
export type RunOptions = { mode: GameMode };
