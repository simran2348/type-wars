import type * as Phaser from 'phaser';
import { CSS, FONTS } from '../theme';
import { isTouchDevice, viewFor } from '../view';

/** Text is a little larger on phones and tablets, where it is read at arm's length. */
const TOUCH_FONT_BOOST = 1.15;

const boostFontSize = (size: string | number): string | number => {
  if (!isTouchDevice()) {
    return size;
  }
  if (typeof size === 'number') {
    return Math.round(size * TOUCH_FONT_BOOST);
  }
  const px = size.match(/^(\d+(?:\.\d+)?)px$/);
  return px ? `${Math.round(Number(px[1]) * TOUCH_FONT_BOOST)}px` : size;
};

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
    ...(style.fontSize === undefined
      ? {}
      : { fontSize: boostFontSize(style.fontSize) }),
    resolution: viewFor(scene.scale).zoom,
  });

/**
 * Logo-style heading: hollow black letters outlined in crawl yellow. With
 * `maxWidth`, it shrinks to fit (the touch font boost can make it wider).
 */
export const addTitle = (
  scene: Phaser.Scene,
  x: number,
  y: number,
  value: string,
  size: number,
  maxWidth = Infinity
): Phaser.GameObjects.Text => {
  const title = addText(scene, x, y, value, {
    fontFamily: FONTS.display,
    fontSize: `${size}px`,
    fontStyle: '900',
    color: CSS.black,
    stroke: CSS.accent,
    strokeThickness: Math.max(2, Math.round(size / 14)),
  })
    .setOrigin(0.5)
    .setLetterSpacing(Math.round(size / 12));
  return title.setScale(Math.min(1, maxWidth / title.width));
};
