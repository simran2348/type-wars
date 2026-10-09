import * as Phaser from 'phaser';
import { TEXTURE_SCALE } from '../textures';
import { COLORS, CSS, FONTS, TEXTURES } from '../theme';
import { addText } from '../ui/text';

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;

/**
 * Visual feedback. Emitters are created once per run and reused with
 * `explode`, so particle counts stay bounded.
 */
export class Effects {
  private readonly sparks: Emitter;
  private readonly fire: Emitter;
  private readonly debris: Emitter;
  private readonly danger: Emitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.sparks = scene.add
      .particles(0, 0, TEXTURES.spark, {
        lifespan: 220,
        speed: { min: 60, max: 220 },
        scale: { start: 0.55 * TEXTURE_SCALE, end: 0 },
        tint: [0xffffff, COLORS.bolt],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(6);
    this.fire = scene.add
      .particles(0, 0, TEXTURES.spark, {
        lifespan: { min: 300, max: 600 },
        speed: { min: 80, max: 340 },
        scale: { start: 1.4 * TEXTURE_SCALE, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffffff, 0xfff3a0, COLORS.accent, 0xff8a2a],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(7);
    this.debris = scene.add
      .particles(0, 0, TEXTURES.chunk, {
        lifespan: { min: 500, max: 900 },
        speed: { min: 60, max: 240 },
        rotate: { min: 0, max: 360 },
        scale: { start: 1.2 * TEXTURE_SCALE, end: 0.3 * TEXTURE_SCALE },
        alpha: { start: 1, end: 0 },
        emitting: false,
      })
      .setDepth(7);
    this.danger = scene.add
      .particles(0, 0, TEXTURES.spark, {
        lifespan: { min: 300, max: 700 },
        speed: { min: 100, max: 380 },
        scale: { start: 1.6 * TEXTURE_SCALE, end: 0 },
        alpha: { start: 1, end: 0 },
        tint: [0xffffff, COLORS.danger, 0xff2244],
        blendMode: Phaser.BlendModes.ADD,
        emitting: false,
      })
      .setDepth(7);
  }

  impact(x: number, y: number): void {
    this.sparks.explode(5, x, y);
  }

  explode(x: number, y: number, radius: number, golden = false): void {
    this.fire.explode(golden ? 32 : 18, x, y);
    this.debris.explode(10, x, y);
    this.shockwave(
      x,
      y,
      radius * (golden ? 4.5 : 3.2),
      golden ? COLORS.gold : COLORS.accent
    );
  }

  /** A meteor reached the ship. */
  shipHit(x: number, y: number): void {
    this.danger.explode(26, x, y);
    this.debris.explode(8, x, y);
    this.shockwave(x, y, 220, COLORS.danger);
    this.scene.cameras.main.shake(260, 0.012);
    this.scene.cameras.main.flash(220, 255, 40, 70);
  }

  shipDestroyed(x: number, y: number): void {
    this.danger.explode(40, x, y);
    this.fire.explode(30, x, y);
    this.shockwave(x, y, 420, COLORS.danger);
    this.scene.cameras.main.shake(500, 0.02);
  }

  scorePopup(
    x: number,
    y: number,
    text: string,
    color: string = CSS.accent,
    size = 20
  ): void {
    const popup = addText(this.scene, x, y, text, {
      fontFamily: FONTS.display,
      fontSize: `${size}px`,
      fontStyle: '900',
      color,
      stroke: CSS.black,
      strokeThickness: 4,
    })
      .setOrigin(0.5)
      .setDepth(8);
    this.scene.tweens.add({
      targets: popup,
      y: y - 46,
      alpha: 0,
      duration: 750,
      ease: 'Cubic.easeOut',
      onComplete: () => popup.destroy(),
    });
  }

  private shockwave(x: number, y: number, size: number, tint: number): void {
    const ring = this.scene.add
      .image(x, y, TEXTURES.ring)
      .setTint(tint)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(6)
      .setDisplaySize(size * 0.2, size * 0.2);
    this.scene.tweens.add({
      targets: ring,
      displayWidth: size,
      displayHeight: size,
      alpha: 0,
      duration: 380,
      ease: 'Cubic.easeOut',
      onComplete: () => ring.destroy(),
    });
  }
}
