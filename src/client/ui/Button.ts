import * as Phaser from 'phaser';
import { COLORS, CSS, FONTS, TEXTURES } from '../theme';
import { addText } from './text';

export type ButtonOptions = {
  width?: number;
  height?: number;
  /** Primary: solid crawl-yellow. Secondary: yellow outline. */
  variant?: 'primary' | 'secondary';
};

/** Rounded arcade button with hover and press feedback. */
export class Button extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    { width = 240, height = 60, variant = 'primary' }: ButtonOptions = {}
  ) {
    super(scene, x, y);
    const primary = variant === 'primary';

    const background = scene.add.graphics();
    if (primary) {
      const glow = scene.add
        .image(0, 0, TEXTURES.glow)
        .setTint(COLORS.accent)
        .setAlpha(0.2)
        .setDisplaySize(width * 1.6, height * 2.4)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.add(glow);
      scene.tweens.add({
        targets: glow,
        alpha: 0.4,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
      background.fillStyle(COLORS.accent, 1);
      background.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    } else {
      background.fillStyle(COLORS.panel, 0.85);
      background.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
      background.lineStyle(2, COLORS.accent, 1);
      background.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    }
    const text = addText(scene, 0, 0, label, {
      fontFamily: FONTS.display,
      fontSize: `${Math.round(height * (primary ? 0.38 : 0.34))}px`,
      fontStyle: '900',
      color: primary ? CSS.black : CSS.accent,
    })
      .setOrigin(0.5)
      .setLetterSpacing(3);
    this.add([background, text]);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () =>
      this.setScale(1.05)
    );
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setScale(1));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      // Give the game frame keyboard focus so typing works straight away.
      window.focus();
      onClick();
    });
    scene.add.existing(this);
  }
}
