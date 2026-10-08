import type { TierWeights } from './WordPicker';

export type RunProgress = {
  elapsedSeconds: number;
  destroyed: number;
  score: number;
};

export type Difficulty = {
  spawnIntervalMs: number;
  maxActiveMeteors: number;
  /** Seconds a 5-7 letter word takes to fall the full height. */
  baseTravelSeconds: number;
  tierWeights: TierWeights;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const difficultyFor = ({
  elapsedSeconds,
  destroyed,
  score,
}: RunProgress): Difficulty => {
  // Grows steadily: 0 at the start, roughly 10 after ~2 minutes of good play.
  const intensity = elapsedSeconds / 25 + destroyed / 12 + score / 5000;

  return {
    spawnIntervalMs: Math.max(800, 2600 - 200 * intensity),
    maxActiveMeteors: Math.min(7, 1 + Math.floor(intensity / 1.5)),
    baseTravelSeconds: Math.max(4.8, 10 - 0.55 * intensity),
    tierWeights: {
      easy: Math.max(0.15, 1 - 0.2 * intensity),
      medium: clamp(0.25 * intensity, 0, 1),
      hard: clamp(0.2 * (intensity - 3), 0, 1),
      expert: clamp(0.15 * (intensity - 6), 0, 0.8),
    },
  };
};

/**
 * Short words fall faster, long words slower, so every word stays fair to
 * type. Long words make up for it by scoring more.
 */
export const travelSecondsFor = (
  word: string,
  difficulty: Difficulty
): number => {
  const length = word.length;
  const factor =
    length <= 4 ? 0.8 : length <= 7 ? 1 : length <= 11 ? 1.25 : 1.5;
  return difficulty.baseTravelSeconds * factor;
};
