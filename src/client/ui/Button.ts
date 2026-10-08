import * as Phaser from 'phaser';
import { COLORS, FONTS, TEXTURES } from '../theme';

/** Rounded arcade button with hover and press feedback. */
export class Button extends Phaser.GameObjects.Container {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    label: string,
    onClick: () => void,
    width = 240,
    height = 60
  ) {
    super(scene, x, y);

    const glow = scene.add
      .image(0, 0, TEXTURES.glow)
      .setTint(COLORS.accent)
      .setAlpha(0.25)
      .setDisplaySize(width * 1.6, height * 2.4)
      .setBlendMode(Phaser.BlendModes.ADD);
    const background = scene.add.graphics();
    background.fillStyle(COLORS.accent, 1);
    background.fillRoundedRect(
      -width / 2,
      -height / 2,
      width,
      height,
      height / 2
    );
    const text = scene.add
      .text(0, 0, label, {
        fontFamily: FONTS.ui,
        fontSize: `${Math.round(height * 0.4)}px`,
        fontStyle: 'bold',
        color: '#1a1206',
      })
      .setOrigin(0.5)
      .setLetterSpacing(3);
    this.add([glow, background, text]);

    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true });
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OVER, () =>
      this.setScale(1.05)
    );
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_OUT, () => this.setScale(1));
    this.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
      // Make sure the game frame owns keyboard focus before typing starts.
      window.focus();
      onClick();
    });

    scene.tweens.add({
      targets: glow,
      alpha: 0.45,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
    scene.add.existing(this);
  }
}
