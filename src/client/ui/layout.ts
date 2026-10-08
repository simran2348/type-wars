import type * as Phaser from 'phaser';

/** Minimum gap, in logical units, kept between menu content and the screen edges. */
const EDGE_MARGIN = 16;

/**
 * Centers a container laid out in fixed design units and scales it down to
 * fit the viewport (never up), so menus work at any Reddit viewport size.
 * Content never touches the left or right edge.
 */
export const fitToViewport = (
  container: Phaser.GameObjects.Container,
  designWidth: number,
  designHeight: number,
  width: number,
  height: number
): void => {
  const scale = Math.min(
    1,
    Math.max(0, width - EDGE_MARGIN * 2) / designWidth,
    height / designHeight
  );
  container.setScale(scale);
  container.setPosition(
    (width - designWidth * scale) / 2,
    (height - designHeight * scale) / 2
  );
};
