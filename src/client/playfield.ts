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
};

export const playfieldFor = (width: number, height: number): Playfield => {
  const shipY = height - Math.max(56, Math.min(90, height * 0.1));
  return {
    width,
    height,
    shipX: width / 2,
    shipY,
    dangerY: shipY - 46,
    wordFontSize: Math.round(Math.min(30, Math.max(22, width / 30))),
  };
};
