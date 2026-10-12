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

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const difficultyFor = ({
  elapsedSeconds,
  destroyed,
  score,
}: RunProgress): Difficulty => {
  // Grows steadily: 0 at the start, roughly 10 after ~2 minutes of good play.
  const intensity = elapsedSeconds / 25 + destroyed / 12 + score / 500;

  return {
    spawnIntervalMs: Math.max(800, 2600 - 200 * intensity),
    maxActiveMeteors: Math.min(7, 1 + Math.floor(intensity / 1.5)),
    baseTravelSeconds: Math.max(4.8, 10 - 0.55 * intensity),
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
