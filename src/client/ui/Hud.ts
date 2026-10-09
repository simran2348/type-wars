import * as Phaser from 'phaser';
import { TEXTURE_SCALE } from '../textures';
import { CSS, FONTS, TEXTURES } from '../theme';
import { addText } from './text';

const MARGIN = 16;
const LIFE_SPACING = 30;
/** Hearts sit in the bottom-left corner of the red zone, by the ship. */
const HEART_SIZE = 24;

export type HudState = {
  score: number;
  combo: number;
  multiplier: number;
  lives: number;
};

/** Score, combo, lives and the sound toggle. Kept deliberately sparse. */
export class Hud {
  private readonly scoreText: Phaser.GameObjects.Text;
  private readonly comboText: Phaser.GameObjects.Text;
  private readonly soundText: Phaser.GameObjects.Text;
  private readonly lifeIcons: Phaser.GameObjects.Image[];
  private shownScore = 0;
  private lives: number;

  constructor(
    private readonly scene: Phaser.Scene,
    maxLives: number,
    muted: boolean,
    /** Toggles sound and returns whether it is now muted. */
    onToggleSound: () => boolean
  ) {
    this.lives = maxLives;
    const scoreLabel = addText(scene, MARGIN, MARGIN, 'SCORE', {
      fontFamily: FONTS.display,
      fontSize: '13px',
      fontStyle: '700',
      color: CSS.accent,
    }).setLetterSpacing(3);
    // Orbitron's slashed zero reads like an icon, so numbers use the mono face.
    this.scoreText = addText(scene, MARGIN, MARGIN + 14, '0', {
      fontFamily: FONTS.mono,
      fontSize: '34px',
      color: CSS.text,
    });
    this.comboText = addText(scene, MARGIN, MARGIN + 56, '', {
      fontFamily: FONTS.display,
      fontSize: '16px',
      fontStyle: '700',
      color: CSS.accent,
    })
      .setLetterSpacing(2)
      .setVisible(false);
    this.lifeIcons = Array.from({ length: maxLives }, () =>
      scene.add
        .image(0, 0, TEXTURES.heart)
        .setOrigin(0, 1)
        .setScale((HEART_SIZE / 24) * TEXTURE_SCALE)
    );
    this.soundText = addText(scene, 0, 0, '', {
      fontFamily: FONTS.display,
      fontSize: '12px',
      fontStyle: '700',
      color: CSS.muted,
    })
      .setOrigin(1, 1)
      .setLetterSpacing(2)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
        this.setMuted(onToggleSound())
      );
    this.setMuted(muted);

    [
      scoreLabel,
      this.scoreText,
      this.comboText,
      this.soundText,
      ...this.lifeIcons,
    ].forEach((o) => o.setDepth(100));
  }

  layout(width: number, height: number): void {
    this.lifeIcons.forEach((icon, i) =>
      icon.setPosition(MARGIN + i * LIFE_SPACING, height - MARGIN + 2)
    );
    this.soundText.setPosition(width - MARGIN, height - MARGIN);
  }

  update({ score, combo, multiplier, lives }: HudState): void {
    if (score !== this.shownScore) {
      this.shownScore = score;
      this.scoreText.setText(score.toLocaleString('en-US'));
      this.pulse(this.scoreText, 1.12);
    }

    const comboLabel =
      combo >= 2
        ? `COMBO ${combo}${multiplier > 1 ? `  ×${multiplier}` : ''}`
        : '';
    if (comboLabel !== this.comboText.text) {
      this.comboText.setText(comboLabel).setVisible(comboLabel !== '');
      if (comboLabel) {
        this.pulse(this.comboText, 1.2);
      }
    }

    if (lives !== this.lives) {
      this.lives = lives;
      this.lifeIcons.forEach((icon, i) => icon.setAlpha(i < lives ? 1 : 0.2));
    }
  }

  private setMuted(muted: boolean): void {
    this.soundText.setText(muted ? 'SOUND OFF' : 'SOUND ON');
  }

  private pulse(target: Phaser.GameObjects.Text, scale: number): void {
    target.setScale(scale);
    this.scene.tweens.add({
      targets: target,
      scale: 1,
      duration: 160,
      ease: 'Quad.easeOut',
    });
  }
}
