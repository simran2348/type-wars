import * as Phaser from 'phaser';
import { CSS, FONTS, TEXTURES } from '../theme';

const MARGIN = 16;

export type HudState = {
  score: number;
  combo: number;
  multiplier: number;
  lives: number;
};

/** Score, combo, lives and the sound toggle. Kept deliberately sparse. */
export class Hud {
  private readonly scoreLabel: Phaser.GameObjects.Text;
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
    this.scoreLabel = scene.add
      .text(MARGIN, MARGIN, 'SCORE', {
        fontFamily: FONTS.ui,
        fontSize: '12px',
        fontStyle: 'bold',
        color: CSS.muted,
      })
      .setLetterSpacing(2);
    this.scoreText = scene.add.text(MARGIN, MARGIN + 14, '0', {
      fontFamily: FONTS.mono,
      fontSize: '28px',
      fontStyle: 'bold',
      color: CSS.text,
    });
    this.comboText = scene.add
      .text(MARGIN, MARGIN + 52, '', {
        fontFamily: FONTS.ui,
        fontSize: '16px',
        fontStyle: 'bold',
        color: CSS.accent,
      })
      .setLetterSpacing(1)
      .setVisible(false);
    this.lifeIcons = Array.from({ length: maxLives }, () =>
      scene.add.image(0, MARGIN + 16, TEXTURES.ship).setScale(0.42)
    );
    this.soundText = scene.add
      .text(0, 0, '', {
        fontFamily: FONTS.ui,
        fontSize: '12px',
        fontStyle: 'bold',
        color: CSS.muted,
      })
      .setOrigin(1, 1)
      .setLetterSpacing(1)
      .setInteractive({ useHandCursor: true })
      .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () =>
        this.setMuted(onToggleSound())
      );
    this.setMuted(muted);

    [
      this.scoreLabel,
      this.scoreText,
      this.comboText,
      this.soundText,
      ...this.lifeIcons,
    ].forEach((o) => o.setDepth(100));
    this.layout(scene.scale.width, scene.scale.height);
  }

  layout(width: number, height: number): void {
    this.lifeIcons.forEach((icon, i) =>
      icon.setX(width - MARGIN - 14 - (this.lifeIcons.length - 1 - i) * 32)
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
      this.lifeIcons.forEach((icon, i) => icon.setAlpha(i < lives ? 1 : 0.15));
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
