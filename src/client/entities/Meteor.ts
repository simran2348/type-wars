import * as Phaser from 'phaser';
import type { Playfield } from '../playfield';
import type { TypingTarget } from '../systems/TypingSystem';
import { COLORS, CSS, FONTS, TEXTURES } from '../theme';
import { addText } from '../ui/text';
import { laneX, swayOffset, type MeteorPath } from './meteorPath';

export type MeteorState = 'active' | 'destroyed' | 'missed';

/** Normal meteors cost a life; danger ones cost points; golden ones pay a flat bonus. */
export type MeteorKind = 'normal' | 'danger' | 'golden';

type KindStyle = {
  /** Multiply tint for the rock, or null to keep its natural colour. */
  rockTint: number | null;
  wordColor: string;
  border: number;
  glow: number | null;
};

const KIND_STYLES: Record<MeteorKind, KindStyle> = {
  normal: {
    rockTint: null,
    wordColor: CSS.text,
    border: COLORS.panelBorder,
    glow: null,
  },
  danger: {
    rockTint: 0xff7070,
    wordColor: CSS.danger,
    border: COLORS.danger,
    glow: COLORS.danger,
  },
  golden: {
    rockTint: 0xffb84d,
    wordColor: CSS.gold,
    border: COLORS.gold,
    glow: COLORS.gold,
  },
};

export type MeteorConfig = {
  word: string;
  kind: MeteorKind;
  path: MeteorPath;
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
  readonly kind: MeteorKind;
  readonly radius: number;
  typed = 0;
  status: MeteorState = 'active';
  /** Fraction of the journey to the danger line, 0..1. */
  travel = 0;

  private readonly config: MeteorConfig;
  private readonly style: KindStyle;
  private readonly rock: Phaser.GameObjects.Image;
  private readonly reticle: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Container;
  private readonly pill: Phaser.GameObjects.Graphics;
  private readonly typedText: Phaser.GameObjects.Text;
  private readonly restText: Phaser.GameObjects.Text;
  private readonly charWidth: number;
  private readonly spin = Phaser.Math.FloatBetween(-0.8, 0.8);
  private targeted = false;
  private incomingBullets = 0;

  constructor(scene: Phaser.Scene, config: MeteorConfig, field: Playfield) {
    super(scene, 0, 0);
    this.config = config;
    this.word = config.word;
    this.kind = config.kind;
    this.style = KIND_STYLES[config.kind];
    this.radius = 24 + Math.min(this.word.length, 14) * 1.5;
    this.place(field, 0);

    this.rock = scene.add
      .image(0, 0, Phaser.Utils.Array.GetRandom([...TEXTURES.meteors]))
      .setDisplaySize(this.radius * 2.3, this.radius * 2.3)
      .setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));
    this.applyBaseTint();
    this.reticle = scene.add.graphics().setVisible(false);
    this.drawReticle();
    const glow = this.createGlow(scene);

    const style: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: FONTS.mono,
      fontSize: `${config.fontSize}px`,
    };
    this.typedText = addText(scene, 0, 0, '', {
      ...style,
      color: CSS.accent,
    }).setOrigin(0, 0.5);
    this.restText = addText(scene, 0, 0, this.word, {
      ...style,
      color: this.style.wordColor,
    }).setOrigin(0, 0.5);
    this.charWidth = this.restText.width / this.word.length;
    this.pill = scene.add.graphics();
    this.label = scene.add.container(0, this.radius * 0.6, [
      this.pill,
      this.typedText,
      this.restText,
    ]);

    this.add([...(glow ? [glow] : []), this.reticle, this.rock, this.label]);
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
    this.place(field, this.travel);
  }

  /** Positions the meteor at trip progress t within the current playfield. */
  private place(field: Playfield, t: number): void {
    const { path } = this.config;
    const margin = this.radius + 8;
    const laneWidth = Math.max(0, field.width - margin * 2);
    const x = margin + laneX(path, t) * laneWidth + swayOffset(path, t);
    this.x = Phaser.Math.Clamp(x, margin, field.width - margin);
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
        this.applyBaseTint();
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
          this.applyBaseTint();
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
      borderColor ?? (this.targeted ? COLORS.accent : this.style.border);
    this.pill.clear();
    this.pill.fillStyle(COLORS.panel, 0.85);
    this.pill.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.pill.lineStyle(this.targeted ? 2 : 1.5, border, 1);
    this.pill.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
  }

  /** Resets the rock to its kind's colour (also clears hit flashes). */
  private applyBaseTint(): void {
    this.rock.clearTint();
    if (this.style.rockTint !== null) {
      this.rock.setTint(this.style.rockTint);
    }
  }

  /** Pulsing halo that marks danger and golden meteors at a glance. */
  private createGlow(scene: Phaser.Scene): Phaser.GameObjects.Image | null {
    if (this.style.glow === null) {
      return null;
    }
    const size = this.radius * 3.4;
    const glow = scene.add
      .image(0, 0, TEXTURES.glow)
      .setTint(this.style.glow)
      .setAlpha(0.35)
      .setDisplaySize(size, size)
      .setBlendMode(Phaser.BlendModes.ADD);
    scene.tweens.add({
      targets: glow,
      alpha: 0.7,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    return glow;
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
