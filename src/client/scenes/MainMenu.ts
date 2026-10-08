import * as Phaser from 'phaser';
import { Ship } from '../entities/Ship';
import { playfieldFor } from '../playfield';
import { COLORS, CSS, FONTS, TEXTURES } from '../theme';
import { Button } from '../ui/Button';
import { fitToViewport } from '../ui/layout';
import { MenuScene } from '../ui/MenuScene';
import { addText, addTitle } from '../ui/text';

export class MainMenu extends MenuScene {
  protected readonly designWidth = 560;
  protected readonly designHeight = 450;
  private ship: Ship;

  constructor() {
    super('MainMenu');
  }

  protected build() {
    const cx = this.designWidth / 2;
    this.ship = new Ship(this, 0, 0);
    return [
      this.add
        .image(cx, 92, TEXTURES.glow)
        .setTint(COLORS.accent)
        .setAlpha(0.12)
        .setDisplaySize(560, 200)
        .setBlendMode(Phaser.BlendModes.ADD),
      addTitle(this, cx, 92, 'TYPE WARS', 64),
      addText(this, cx, 158, 'A TYPING SPACE SHOOTER', {
        fontFamily: FONTS.display,
        fontSize: '14px',
        fontStyle: '700',
        color: CSS.saber,
      })
        .setOrigin(0.5)
        .setLetterSpacing(5),
      new Button(this, cx, 250, 'PLAY', () => this.scene.start('Game'), {
        opensKeyboard: true,
      }),
      new Button(
        this,
        cx - 128,
        334,
        'HOW TO PLAY',
        () => this.scene.start('Instructions'),
        { width: 236, height: 48, variant: 'secondary' }
      ),
      new Button(
        this,
        cx + 128,
        334,
        'LEADERBOARD',
        () => this.scene.start('Leaderboard'),
        { width: 236, height: 48, variant: 'secondary' }
      ),
      addText(this, cx, 410, 'Type the words on the meteors to destroy them.', {
        fontFamily: FONTS.body,
        fontSize: '18px',
        color: CSS.muted,
      }).setOrigin(0.5),
    ];
  }

  protected override onKey(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.scene.start('Game');
    }
  }

  /** Centers the menu in the space above the ship. */
  protected override layoutContent(width: number, height: number) {
    const field = playfieldFor(width, height);
    fitToViewport(
      this.content,
      this.designWidth,
      this.designHeight,
      width,
      field.dangerY
    );
    this.ship.setPosition(field.shipX, field.shipY);
  }
}
