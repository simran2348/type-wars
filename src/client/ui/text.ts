import type * as Phaser from 'phaser';
import { CSS, FONTS } from '../theme';
import { viewFor } from '../view';

/**
 * Adds a Text rendered at the camera's zoom, so it stays crisp on
 * high-density screens instead of being upscaled from a 1x bitmap.
 */
export const addText = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  style: Phaser.Types.GameObjects.Text.TextStyle
): Phaser.GameObjects.Text =>
  scene.add.text(x, y, value, {
    ...style,
    resolution: viewFor(scene.scale).zoom,
  });

/** Logo-style heading: hollow black letters outlined in crawl yellow. */
export const addTitle = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number
): Phaser.GameObjects.Text =>
  addText(scene, x, y, value, {
    fontFamily: FONTS.display,
    fontSize: `${size}px`,
    fontStyle: '900',
    color: CSS.black,
    stroke: CSS.accent,
    strokeThickness: Math.max(2, Math.round(size / 14)),
  })
    .setOrigin(0.5)
    .setLetterSpacing(Math.round(size / 12));
