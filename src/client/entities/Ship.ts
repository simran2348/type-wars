import * as Phaser from 'phaser';
import { TEXTURE_SCALE } from '../textures';
import { COLORS, TEXTURES } from '../theme';

const ENGINE_GLOW = 0xff7a3d;

const MAX_AIM_ANGLE = 0.6;
const NOSE_OFFSET = 30;

/** The player's ship: stationary, auto-aims at whatever it shoots. */
export class Ship extends Phaser.GameObjects.Container {
  private readonly hull: Phaser.GameObjects.Image;
  private readonly flame: Phaser.GameObjects.Image;
  private readonly craft: Phaser.GameObjects.Container;
  private aimAngle = 0;
  private aimHold = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);

    this.flame = scene.add
      .image(0, 26, TEXTURES.flame)
      .setOrigin(0.5, 0)
      .setScale(TEXTURE_SCALE)
      .setBlendMode(Phaser.BlendModes.ADD);
    const engineGlow = scene.add
      .image(0, 34, TEXTURES.glow)
      .setTint(ENGINE_GLOW)
      .setAlpha(0.35)
      .setDisplaySize(64, 64)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.hull = scene.add.image(0, 0, TEXTURES.ship).setScale(TEXTURE_SCALE);
    this.craft = scene.add.container(0, 0, [engineGlow, this.flame, this.hull]);
    this.add(this.craft);

    // Gentle idle hover.
    scene.tweens.add({
      targets: this.craft,
      y: -4,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.add.existing(this);
  }

  /** World position bullets leave from, following the current aim. */
  get muzzle(): { x: number; y: number } {
    return {
      x: this.x + Math.sin(this.aimAngle) * NOSE_OFFSET,
      y: this.y + this.craft.y - Math.cos(this.aimAngle) * NOSE_OFFSET,
    };
  }

  aimAt(x: number, y: number): void {
    const angle = Math.atan2(x - this.x, this.y - y);
    this.aimAngle = Phaser.Math.Clamp(angle, -MAX_AIM_ANGLE, MAX_AIM_ANGLE);
    this.aimHold = 0.35;
    this.craft.setRotation(this.aimAngle);
  }

  /** Small kick back when firing. */
  recoil(): void {
    this.hull.setY(3);
    this.scene.tweens.add({
      targets: this.hull,
      y: 0,
      duration: 90,
      ease: 'Quad.easeOut',
    });
  }

  flashError(): void {
    this.hull.setTint(COLORS.danger);
    this.scene.time.delayedCall(120, () => this.hull.clearTint());
  }

  preUpdate(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.flame.setScale(
      (0.85 + Math.random() * 0.3) * TEXTURE_SCALE,
      (0.8 + Math.random() * 0.45) * TEXTURE_SCALE
    );

    // Drift back to facing straight up after a short pause.
    this.aimHold -= dt;
    if (this.aimHold <= 0 && this.aimAngle !== 0) {
      this.aimAngle = Phaser.Math.Linear(this.aimAngle, 0, Math.min(1, dt * 6));
      if (Math.abs(this.aimAngle) < 0.002) {
        this.aimAngle = 0;
      }
      this.craft.setRotation(this.aimAngle);
    }
  }
}
