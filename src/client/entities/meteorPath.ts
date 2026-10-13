/**
 * Horizontal routes for meteors. Positions are fractions (0..1) of the lane a
 * meteor can occupy, so paths survive resizes. Height always grows linearly
 * with time, keeping the time to impact fair; only the sideways path varies.
 */

/**
 * Straight line from a random start to a spot near the ship; used by normal
 * and heart meteors.
 */
export type LinePath = {
  kind: 'line';
  startX: number;
  /** Where it meets the red line. Spread out so labels don't pile up on the ship. */
  endX: number;
};

/**
 * Line paths end somewhere in this band of the lane. The ship sits at its
 * centre (0.5), so meteors still clearly head for it.
 */
export const LINE_END_MIN = 1 / 3;
export const LINE_END_MAX = 2 / 3;

/** Random curve with a sideways sway; used by golden meteors. */
export type CurvePath = {
  kind: 'curve';
  startX: number;
  /** Quadratic curve control point: pulls the path sideways mid-flight. */
  bendX: number;
  endX: number;
  /** Sway in logical px, fading out near the bottom. */
  swayAmplitude: number;
  /** Number of full sways over the whole trip. */
  swayCycles: number;
  swayPhase: number;
};

/** Straight diagonal that reflects off the side walls; used by danger meteors. */
export type BouncePath = {
  kind: 'bounce';
  startX: number;
  direction: 1 | -1;
  /** Total sideways travel in lane widths, chosen to give exactly BOUNCES reflections. */
  distance: number;
};

export type MeteorPath = LinePath | CurvePath | BouncePath;

export const BOUNCES = 3;

/** Folds an unbounded coordinate back and forth into 0..1, like a ball between walls. */
const reflect = (s: number): number => {
  const r = ((s % 2) + 2) % 2;
  return r <= 1 ? r : 2 - r;
};

/**
 * A bounce path that hits the side walls exactly BOUNCES times: it reaches the
 * first wall, crosses the lane BOUNCES - 1 more times, then stops partway.
 */
export const bouncePath = (
  startX: number,
  direction: 1 | -1,
  finalStretch: number
): BouncePath => {
  const toFirstWall = direction === 1 ? 1 - startX : startX;
  return {
    kind: 'bounce',
    startX,
    direction,
    distance: toFirstWall + (BOUNCES - 1) + finalStretch,
  };
};

/** Lane fraction (0..1) at trip progress t (0..1). */
export const laneX = (path: MeteorPath, t: number): number => {
  if (path.kind === 'line') {
    return path.startX + (path.endX - path.startX) * t;
  }
  if (path.kind === 'bounce') {
    // Travel in the positive direction from the mirrored start, then mirror back.
    const start = path.direction === 1 ? path.startX : 1 - path.startX;
    const x = reflect(start + t * path.distance);
    return path.direction === 1 ? x : 1 - x;
  }
  const u = 1 - t;
  return u * u * path.startX + 2 * u * t * path.bendX + t * t * path.endX;
};

/** Extra sideways offset in logical px (curves only). */
export const swayOffset = (path: MeteorPath, t: number): number =>
  path.kind === 'curve'
    ? Math.sin(path.swayPhase + t * path.swayCycles * Math.PI * 2) *
      path.swayAmplitude *
      (1 - t)
    : 0;
