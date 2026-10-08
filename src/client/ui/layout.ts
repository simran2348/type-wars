import type * as Phaser from 'phaser';

/**
 * Centers a container laid out in fixed design units and scales it down to
 * fit the viewport (never up), so menus work at any Reddit viewport size.
 */
export const fitToViewport = (
  container: Phaser.GameObjects.Container,
  designWidth: number,
  designHeight: number,
  width: number,
  height: number
): void => {
  const scale = Math.min(1, width / designWidth, height / designHeight);
  container.setScale(scale);
  container.setPosition(
    (width - designWidth * scale) / 2,
    (height - designHeight * scale) / 2
  );
};
