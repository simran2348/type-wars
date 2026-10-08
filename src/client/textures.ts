import type { Scene } from 'phaser';
import { TEXTURES } from './theme';

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
  painter: Painter
) => {
  if (scene.textures.exists(key)) {
    return;
  }
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) {
    throw new Error(`Could not create texture "${key}"`);
  }
  painter(texture.getContext(), width, height);
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
  hull.addColorStop(0, '#f2fbff');
  hull.addColorStop(0.45, '#69c6ff');
  hull.addColorStop(1, '#22318a');
  ctx.fillStyle = hull;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#bff1ff';
  ctx.stroke();

  // Wing stripes
  ctx.strokeStyle = '#ffb547';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(14, 50);
  ctx.lineTo(22, 40);
  ctx.moveTo(50, 50);
  ctx.lineTo(42, 40);
  ctx.stroke();

  // Cockpit
  ctx.beginPath();
  ctx.ellipse(32, 31, 4.5, 10, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#0a1033';
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(30.5, 27, 1.5, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(160,235,255,0.85)';
  ctx.fill();
};

const flame: Painter = (ctx, w, h) => {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.25, 'rgba(120,230,255,0.9)');
  gradient.addColorStop(1, 'rgba(40,90,255,0)');
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
    body.addColorStop(0, '#9a8a7c');
    body.addColorStop(0.55, '#5a4c44');
    body.addColorStop(1, '#2a221f');
    ctx.fillStyle = body;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,190,140,0.35)';
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const x = cx + (rand() - 0.5) * w * 0.45;
      const y = cy + (rand() - 0.5) * h * 0.45;
      const r = w * (0.05 + rand() * 0.06);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(25,18,15,0.55)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x + r * 0.2, y + r * 0.2, r, Math.PI * 0.1, Math.PI * 0.9);
      ctx.strokeStyle = 'rgba(200,170,140,0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

const bullet: Painter = (ctx, w, h) => {
  const glow = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, h / 2);
  glow.addColorStop(0, 'rgba(160,240,255,0.9)');
  glow.addColorStop(1, 'rgba(60,180,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w * 0.18, h * 0.36, 0, 0, Math.PI * 2);
  ctx.fill();
};

const chunk: Painter = (ctx) => {
  ctx.fillStyle = '#b8a291';
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
      const tint = Math.random() < 0.2 ? '170,200,255' : '255,255,255';
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
  paint(scene, TEXTURES.bullet, 12, 34, bullet);
  paint(scene, TEXTURES.spark, 16, 16, (ctx, w) => softDot(ctx, w));
  paint(scene, TEXTURES.glow, 128, 128, (ctx, w) => softDot(ctx, w));
  paint(scene, TEXTURES.chunk, 10, 10, chunk);
  paint(scene, TEXTURES.ring, 128, 128, ring);
  paint(scene, TEXTURES.starsFar, 512, 512, stars(110, 0.4, 0.9, 0.2));
  paint(scene, TEXTURES.starsNear, 512, 512, stars(28, 0.9, 1.6, 0.5));
};
