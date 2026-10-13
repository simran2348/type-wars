import type { GameMode } from '../shared/api';

export type ModeRules = {
  label: string;
  /** One line shown under the level's button. */
  description: string;
  /** Whether red danger meteors appear. */
  danger: boolean;
  /** Whether golden meteors appear. */
  golden: boolean;
  /** Ranked runs are the only ones that go on the leaderboards. */
  ranked: boolean;
};

/** Listed in the order they appear on the level select screen. */
export const MODES: Record<GameMode, ModeRules> = {
  easy: {
    label: 'EASY',
    description: 'Normal meteors only',
    danger: false,
    golden: false,
    ranked: false,
  },
  medium: {
    label: 'MEDIUM',
    description: 'Normal and red danger meteors',
    danger: true,
    golden: false,
    ranked: false,
  },
  hard: {
    label: 'HARD',
    description: 'Normal, danger and golden meteors',
    danger: true,
    golden: true,
    ranked: false,
  },
  ranked: {
    label: 'RANKED',
    description: 'The full game. Scores go on the leaderboards',
    danger: true,
    golden: true,
    ranked: true,
  },
};

export const DEFAULT_MODE: GameMode = 'ranked';

/** Data passed to the Game scene when a run starts. */
export type RunOptions = { mode: GameMode };
