import type { Scene } from 'phaser';
import { TEXTURES } from './theme';

/**
 * Textures are painted at this multiple of their logical size so they stay
 * sharp when cameras zoom in on high-density screens. Images using them
 * should be displayed at `TEXTURE_SCALE` (or via setDisplaySize).
 */
export const TEXTURE_RESOLUTION = 3;
export const TEXTURE_SCALE = 1 / TEXTURE_RESOLUTION;
/** Star tiles are large, so they use a lower resolution to save memory. */
export const STARS_RESOLUTION = 2;

type Painter = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
) => void;

const paint = (
  scene: Scene,
  key: string,
  width: number,
  height: number,
  painter: Painter,
  resolution = TEXTURE_RESOLUTION
) => {
  if (scene.textures.exists(key)) {
    return;
  }
  const texture = scene.textures.createCanvas(
    key,
    width * resolution,
    height * resolution
  );
  if (!texture) {
    throw new Error(`Could not create texture "${key}"`);
  }
  const ctx = texture.getContext();
  ctx.scale(resolution, resolution);
  painter(ctx, width, height);
  texture.refresh();
};

const softDot = (ctx: CanvasRenderingContext2D, size: number) => {
  const r = size / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
};

/** Starfighter in rebel colours: white-grey hull with red markings. */
const ship: Painter = (ctx) => {
  ctx.beginPath();
  ctx.moveTo(32, 3);
  ctx.lineTo(41, 26);
  ctx.lineTo(61, 56);
  ctx.lineTo(44, 52);
  ctx.lineTo(39, 64);
  ctx.lineTo(25, 64);
  ctx.lineTo(20, 52);
  ctx.lineTo(3, 56);
  ctx.lineTo(23, 26);
  ctx.closePath();
  const hull = ctx.createLinearGradient(0, 0, 0, 64);
  hull.addColorStop(0, '#ffffff');
  hull.addColorStop(0.5, '#c9ced6');
  hull.addColorStop(1, '#5d6470');
  ctx.fillStyle = hull;
  ctx.fill();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = '#3a3f49';
  ctx.stroke();

  // Red squadron stripes
  ctx.strokeStyle = '#e23b2e';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(12, 52);
  ctx.lineTo(21, 41);
  ctx.moveTo(52, 52);
  ctx.lineTo(43, 41);
  ctx.stroke();

  // Cockpit
  ctx.beginPath();
  ctx.ellipse(32, 31, 4.5, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#11141b';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(30.5, 27, 1.5, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(160,220,255,0.8)';
  ctx.fill();
};

/** Engine exhaust: hot white core fading to orange-red. */
const flame: Painter = (ctx, w, h) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(255,170,120,0.9)');
  gradient.addColorStop(1, 'rgba(255,60,40,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.moveTo(w * 0.15, 0);
  ctx.quadraticCurveTo(w / 2, h * 1.1, w * 0.85, 0);
  ctx.closePath();
  ctx.fill();
};

const meteor =
  (seed: number): Painter =>
  (ctx, w, h) => {
    // Deterministic jitter so each variant has a stable silhouette.
    let state = seed * 9301 + 49297;
    const rand = () => {
      state = (state * 9301 + 49297) % 233280;
      return state / 233280;
    };
    const cx = w / 2;
    const cy = h / 2;
    const points = 12;

    ctx.beginPath();
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const radius = w * 0.4 + (rand() - 0.5) * w * 0.12;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    const body = ctx.createRadialGradient(
      cx - w * 0.15,
      cy - h * 0.15,
      2,
      cx,
      cy,
      w * 0.48
    );
    body.addColorStop(0, '#8f8a84');
    body.addColorStop(0.55, '#4f4b47');
    body.addColorStop(1, '#1f1d1c');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,232,31,0.25)';
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const x = cx + (rand() - 0.5) * w * 0.45;
      const y = cy + (rand() - 0.5) * h * 0.45;
      const r = w * (0.05 + rand() * 0.06);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15,14,13,0.55)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + r * 0.2, y + r * 0.2, r, Math.PI * 0.1, Math.PI * 0.9);
      ctx.strokeStyle = 'rgba(200,195,185,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

/** Blaster bolt: white core inside a green glow. */
const bullet: Painter = (ctx, w, h) => {
  const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 2);
  glow.addColorStop(0, 'rgba(150,255,160,0.95)');
  glow.addColorStop(1, 'rgba(60,255,90,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w * 0.18, h * 0.38, 0, 0, Math.PI * 2);
  ctx.fill();
};

const chunk: Painter = (ctx) => {
  ctx.fillStyle = '#a8a29a';
  ctx.beginPath();
  ctx.moveTo(1, 3);
  ctx.lineTo(5, 0);
  ctx.lineTo(9, 4);
  ctx.lineTo(6, 9);
  ctx.lineTo(2, 8);
  ctx.closePath();
  ctx.fill();
};

const ring: Painter = (ctx, w) => {
  const r = w / 2;
  const gradient = ctx.createRadialGradient(r, r, 0, r, r, r);
  gradient.addColorStop(0.6, 'rgba(255,255,255,0)');
  gradient.addColorStop(0.85, 'rgba(255,255,255,0.9)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, w);
};

const stars =
  (
    count: number,
    minRadius: number,
    maxRadius: number,
    minAlpha: number
  ): Painter =>
  (ctx, w, h) => {
    for (let i = 0; i < count; i++) {
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const alpha = minAlpha + Math.random() * (1 - minAlpha);
      const tint = Math.random() < 0.15 ? '200,220,255' : '255,255,255';
      ctx.fillStyle = `rgba(${tint},${alpha})`;
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  };

/** Draws every game texture procedurally; the game ships no image files. */
export const createTextures = (scene: Scene): void => {
  paint(scene, TEXTURES.ship, 64, 66, ship);
  paint(scene, TEXTURES.flame, 20, 40, flame);
  TEXTURES.meteors.forEach((key, i) =>
    paint(scene, key, 96, 96, meteor(i + 1))
  );
  paint(scene, TEXTURES.bullet, 10, 34, bullet);
  paint(scene, TEXTURES.spark, 16, 16, (ctx, w) => softDot(ctx, w));
  paint(scene, TEXTURES.glow, 128, 128, (ctx, w) => softDot(ctx, w));
  paint(scene, TEXTURES.chunk, 10, 10, chunk);
  paint(scene, TEXTURES.ring, 128, 128, ring);
  paint(
    scene,
    TEXTURES.starsFar,
    512,
    512,
    stars(130, 0.35, 0.8, 0.2),
    STARS_RESOLUTION
  );
  paint(
    scene,
    TEXTURES.starsNear,
    512,
    512,
    stars(30, 0.8, 1.4, 0.5),
    STARS_RESOLUTION
  );
};
