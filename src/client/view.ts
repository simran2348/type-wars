import type * as Phaser from 'phaser';

/**
 * The canvas is sized in device pixels so everything is sharp on high-density
 * screens. Each scene's camera then zooms by `pixelRatio * uiScale`, which lets
 * all game code work in logical units. On touch screens `uiScale` is below 1,
 * so the whole game draws smaller and leaves room for the on-screen keyboard.
 */

const MAX_PIXEL_RATIO = 3;
const MIN_TOUCH_SCALE = 0.72;
const MAX_TOUCH_SCALE = 0.9;
/** Touch screens narrower than this (CSS px) get scaled down proportionally. */
const TOUCH_REFERENCE_WIDTH = 900;

export type View = {
  /** Logical width the scene lays out in. */
  width: number;
  /** Logical height the scene lays out in. */
  height: number;
  /** Device pixels per logical unit; also the resolution text should render at. */
  zoom: number;
};

export const pixelRatio = (): number =>
  Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

export const isTouchDevice = (): boolean =>
  navigator.maxTouchPoints > 0 ||
  window.matchMedia('(any-pointer: coarse)').matches;

const uiScale = (cssWidth: number): number =>
  isTouchDevice()
    ? Math.min(
        MAX_TOUCH_SCALE,
        Math.max(MIN_TOUCH_SCALE, cssWidth / TOUCH_REFERENCE_WIDTH)
      )
    : 1;

export const viewFor = (scale: Phaser.Scale.ScaleManager): View => {
  const ratio = pixelRatio();
  const zoom = ratio * uiScale(scale.width / ratio);
  return { width: scale.width / zoom, height: scale.height / zoom, zoom };
};

/** Points the scene's camera at logical space; call on create and on resize. */
export const applyView = (scene: Phaser.Scene): View => {
  const view = viewFor(scene.scale);
  scene.cameras.main
    .setSize(scene.scale.width, scene.scale.height)
    .setOrigin(0, 0)
    .setScroll(0, 0)
    .setZoom(view.zoom);
  return view;
};
