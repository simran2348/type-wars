/** Current play area geometry, recomputed whenever the viewport resizes. */
export type Playfield = {
  width: number;
  height: number;
  shipX: number;
  shipY: number;
  /** Meteors reaching this line hit the ship and cost a life. */
  dangerY: number;
  /** Font size for meteor words, scaled to the viewport. */
  wordFontSize: number;
  /** Size multiplier for the ship and meteors: 1 on roomy screens, smaller on phones. */
  entityScale: number;
};

/** Play areas smaller than this (logical units) draw the ship and meteors smaller. */
const ROOMY_WIDTH = 720;
const ROOMY_HEIGHT = 560;
const MIN_ENTITY_SCALE = 0.62;
/** Words shrink less than the rocks so they stay easy to read. */
const MIN_WORD_SCALE = 0.85;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const playfieldFor = (width: number, height: number): Playfield => {
  const entityScale = clamp(
    Math.min(width / ROOMY_WIDTH, height / ROOMY_HEIGHT),
    MIN_ENTITY_SCALE,
    1
  );
  const shipGap = clamp(height * 0.1, 56, 90) * Math.max(0.75, entityScale);
  const shipY = height - shipGap;
  return {
    width,
    height,
    shipX: width / 2,
    shipY,
    dangerY: shipY - 46 * entityScale,
    wordFontSize: Math.round(
      clamp(width / 30, 22, 30) * Math.max(MIN_WORD_SCALE, entityScale)
    ),
    entityScale,
  };
};
