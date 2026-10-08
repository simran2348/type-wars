export const COLORS = {
  accent: 0xffb547,
  cyan: 0x5ce1ff,
  danger: 0xff4d6d,
  panel: 0x0b0f24,
  panelBorder: 0x2c3460,
} as const;

export const CSS = {
  text: '#f4f6ff',
  muted: '#8a93b8',
  accent: '#ffb547',
  cyan: '#5ce1ff',
  danger: '#ff4d6d',
} as const;

export const FONTS = {
  ui: '"Segoe UI", system-ui, -apple-system, Roboto, Helvetica, Arial, sans-serif',
  mono: 'ui-monospace, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
} as const;

export const TEXTURES = {
  ship: 'ship',
  flame: 'flame',
  meteors: ['meteor-0', 'meteor-1', 'meteor-2'],
  bullet: 'bullet',
  spark: 'spark',
  chunk: 'chunk',
  glow: 'glow',
  ring: 'ring',
  starsFar: 'stars-far',
  starsNear: 'stars-near',
} as const;
