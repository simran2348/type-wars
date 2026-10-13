import type { TierWeights } from './WordPicker';

export type RunProgress = {
  elapsedSeconds: number;
  destroyed: number;
  score: number;
};

export type Difficulty = {
  spawnIntervalMs: number;
  maxActiveMeteors: number;
  /** Seconds a normal meteor takes to fall the full height, whatever its word. */
  baseTravelSeconds: number;
  tierWeights: TierWeights;
};

/** Fall time of a normal meteor at the start of a run, and for the whole run when speed doesn't ramp. */
const START_TRAVEL_SECONDS = 10;
const FASTEST_TRAVEL_SECONDS = 4.8;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/** The parts of a level's rules that shape difficulty. */
export type DifficultyRules = {
  /** Whether meteors fall faster as the run goes on. */
  speedRamps: boolean;
  /** The most meteors on screen at once. */
  maxMeteors: number;
};

const FULL_GAME: DifficultyRules = { speedRamps: true, maxMeteors: 7 };

/**
 * Spawn rate, meteor count and word length always ramp up with progress; the
 * meteor count stops at the level's limit. Meteor speed ramps only when
 * `speedRamps` is set (ranked); otherwise every meteor type keeps its starting
 * speed for the whole run.
 */
export const difficultyFor = (
  { elapsedSeconds, destroyed, score }: RunProgress,
  { speedRamps, maxMeteors }: DifficultyRules = FULL_GAME
): Difficulty => {
  // Grows steadily: 0 at the start, roughly 10 after ~2 minutes of good play.
  const intensity = elapsedSeconds / 25 + destroyed / 12 + score / 500;

  return {
    spawnIntervalMs: Math.max(800, 2600 - 200 * intensity),
    maxActiveMeteors: Math.min(maxMeteors, 1 + Math.floor(intensity / 1.5)),
    baseTravelSeconds: speedRamps
      ? Math.max(
          FASTEST_TRAVEL_SECONDS,
          START_TRAVEL_SECONDS - 0.55 * intensity
        )
      : START_TRAVEL_SECONDS,
    tierWeights: {
      // 3-letter words only at first; each longer length joins in turn.
      easy: Math.max(0.15, 1 - 0.2 * intensity),
      medium: clamp(0.3 * intensity, 0, 1),
      hard: clamp(0.25 * (intensity - 1.5), 0, 1),
      expert: clamp(0.2 * (intensity - 3), 0, 1),
      master: clamp(0.18 * (intensity - 5), 0, 0.9),
      legend: clamp(0.15 * (intensity - 7), 0, 0.8),
    },
  };
};
