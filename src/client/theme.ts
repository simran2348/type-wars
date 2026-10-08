/** Star Wars inspired palette: crawl yellow, saber blue, Sith red. */
export const COLORS = {
  accent: 0xffe81f,
  saber: 0x4bd5ee,
  danger: 0xff2b2b,
  bolt: 0x5dff6b,
  panel: 0x06070b,
  panelBorder: 0x2a2e38,
} as const;

export const CSS = {
  text: '#f2f2f2',
  muted: '#9aa0aa',
  accent: '#ffe81f',
  saber: '#4bd5ee',
  danger: '#ff2b2b',
  black: '#000000',
} as const;

export const FONTS = {
  /** Wide geometric display face for titles, HUD and buttons. */
  display: '"Orbitron", "Segoe UI", system-ui, sans-serif',
  /** Opening-crawl style face for body copy. */
  body: '"News Cycle", "Franklin Gothic Medium", "Arial Narrow", sans-serif',
  /** Monospace for meteor words and scores. */
  mono: '"Share Tech Mono", ui-monospace, Menlo, Consolas, monospace',
} as const;

/** Fonts that must be ready before any Phaser text is drawn. */
export const FONT_FACES = [
  '700 16px Orbitron',
  '900 16px Orbitron',
  '400 16px "News Cycle"',
  '700 16px "News Cycle"',
  '400 16px "Share Tech Mono"',
];

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
