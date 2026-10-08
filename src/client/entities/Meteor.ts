import * as Phaser from 'phaser';
import type { Playfield } from '../playfield';
import type { TypingTarget } from '../systems/TypingSystem';
import { COLORS, CSS, FONTS, TEXTURES } from '../theme';

export type MeteorState = 'active' | 'destroyed' | 'missed';

export type MeteorConfig = {
  word: string;
  /** Horizontal spawn position as a fraction of the playfield width. */
  startX: number;
  /** Horizontal position at the danger line, as a fraction of the width. */
  endX: number;
  travelSeconds: number;
  fontSize: number;
};

const LABEL_PADDING_X = 10;
const LABEL_PADDING_Y = 6;

export class Meteor
  extends Phaser.GameObjects.Container
  implements TypingTarget
{
  readonly word: string;
  readonly radius: number;
  typed = 0;
  status: MeteorState = 'active';
  /** Fraction of the journey to the danger line, 0..1. */
  travel = 0;

  private readonly config: MeteorConfig;
  private readonly rock: Phaser.GameObjects.Image;
  private readonly reticle: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Container;
  private readonly pill: Phaser.GameObjects.Graphics;
  private readonly typedText: Phaser.GameObjects.Text;
  private readonly restText: Phaser.GameObjects.Text;
  private readonly charWidth: number;
  private readonly spin = Phaser.Math.FloatBetween(-0.8, 0.8);
  private readonly wobblePhase = Phaser.Math.FloatBetween(0, Math.PI * 2);
  private targeted = false;
  private incomingBullets = 0;

  constructor(scene: Phaser.Scene, config: MeteorConfig, field: Playfield) {
    super(scene, config.startX * field.width, 0);
    this.config = config;
    this.word = config.word;
    this.radius = 24 + Math.min(this.word.length, 14) * 1.5;
    this.y = -this.radius;

    this.rock = scene.add
      .image(0, 0, Phaser.Utils.Array.GetRandom([...TEXTURES.meteors]))
      .setDisplaySize(this.radius * 2.3, this.radius * 2.3)
      .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    this.reticle = scene.add.graphics().setVisible(false);
    this.drawReticle();

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: FONTS.mono,
      fontSize: `${config.fontSize}px`,
      fontStyle: 'bold',
    };
    this.typedText = scene.add
      .text(0, 0, '', { ...style, color: CSS.accent })
      .setOrigin(0, 0.5);
    this.restText = scene.add
      .text(0, 0, this.word, { ...style, color: CSS.text })
      .setOrigin(0, 0.5);
    this.charWidth = this.restText.width / this.word.length;
    this.pill = scene.add.graphics();
    this.label = scene.add.container(0, this.radius * 0.6, [
      this.pill,
      this.typedText,
      this.restText,
    ]);

    this.add([this.reticle, this.rock, this.label]);
    this.refreshLabel();
    scene.add.existing(this);
  }

  get isTargetable(): boolean {
    return this.status === 'active' && this.typed < this.word.length;
  }

  get danger(): number {
    return this.travel;
  }

  get hasReachedDanger(): boolean {
    return this.travel >= 1;
  }

  advance(): void {
    this.typed += 1;
    this.refreshLabel();
  }

  setTargeted(targeted: boolean): void {
    this.targeted = targeted;
    this.reticle.setVisible(targeted);
    this.setDepth(targeted ? 10 : 1);
    this.refreshLabel();
    if (targeted) {
      this.label.setScale(1.15);
      this.scene.tweens.add({
        targets: this.label,
        scale: 1,
        duration: 140,
        ease: 'Back.easeOut',
      });
    }
  }

  /** Moves the meteor along its path; positions are relative to the playfield so resizes stay fair. */
  step(dt: number, field: Playfield): void {
    this.rock.rotation += this.spin * dt;
    this.reticle.rotation += 1.5 * dt;
    if (this.status !== 'active') {
      return;
    }
    this.travel = Math.min(1, this.travel + dt / this.config.travelSeconds);
    const t = this.travel;
    const margin = this.radius + 8;
    const baseX =
      Phaser.Math.Linear(this.config.startX, this.config.endX, t) * field.width;
    const wobble = Math.sin(this.wobblePhase + t * Math.PI * 3) * 18 * (1 - t);
    this.x = Phaser.Math.Clamp(baseX + wobble, margin, field.width - margin);
    this.y = Phaser.Math.Linear(-this.radius, field.dangerY, t);
  }

  /** Called when a bullet is fired at this meteor. */
  trackBullet(): void {
    this.incomingBullets += 1;
  }

  /**
   * Called when a bullet lands. Returns true when the meteor is destroyed and
   * this was the last bullet in flight, i.e. it is time to explode.
   */
  absorbBullet(): boolean {
    this.incomingBullets = Math.max(0, this.incomingBullets - 1);
    this.rock.setTintMode(Phaser.TintModes.FILL).setTint(0xffffff);
    this.scene.time.delayedCall(50, () => {
      if (this.active) {
        this.rock.clearTint();
      }
    });
    this.rock.setDisplaySize(this.radius * 2.45, this.radius * 2.45);
    this.scene.tweens.add({
      targets: this.rock,
      displayWidth: this.radius * 2.3,
      displayHeight: this.radius * 2.3,
      duration: 100,
    });
    return this.status === 'destroyed' && this.incomingBullets === 0;
  }

  /** The word was completed; the meteor freezes until the final bullet lands. */
  markDestroyed(): void {
    this.status = 'destroyed';
    this.reticle.setVisible(false);
    this.scene.tweens.add({
      targets: this.label,
      alpha: 0,
      y: this.label.y - 12,
      duration: 160,
    });
  }

  markMissed(): void {
    this.status = 'missed';
  }

  flashError(): void {
    this.refreshLabel(COLORS.danger);
    this.rock.setTint(COLORS.danger);
    this.scene.tweens.add({
      targets: this.label,
      x: { from: -6, to: 6 },
      duration: 40,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.active) {
          this.label.x = 0;
          this.rock.clearTint();
          this.refreshLabel();
        }
      },
    });
  }

  private refreshLabel(borderColor?: number): void {
    const fullWidth = this.charWidth * this.word.length;
    const left = -fullWidth / 2;
    this.typedText.setText(this.word.slice(0, this.typed)).setX(left);
    this.restText
      .setText(this.word.slice(this.typed))
      .setX(left + this.typed * this.charWidth);

    const width = fullWidth + LABEL_PADDING_X * 2;
    const height = this.restText.height + LABEL_PADDING_Y * 2;
    const border =
      borderColor ?? (this.targeted ? COLORS.accent : COLORS.panelBorder);
    this.pill.clear();
    this.pill.fillStyle(COLORS.panel, 0.85);
    this.pill.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.pill.lineStyle(this.targeted ? 2 : 1.5, border, 1);
    this.pill.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
  }

  private drawReticle(): void {
    const r = this.radius + 10;
    this.reticle.lineStyle(2.5, COLORS.accent, 0.9);
    for (let i = 0; i < 4; i++) {
      const start = (i * Math.PI) / 2 + 0.25;
      this.reticle.beginPath();
      this.reticle.arc(0, 0, r, start, start + Math.PI / 4);
      this.reticle.strokePath();
    }
  }
}
