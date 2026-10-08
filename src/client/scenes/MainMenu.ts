import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { Ship } from '../entities/Ship';
import { playfieldFor } from '../playfield';
import { COLORS, CSS, FONTS, TEXTURES } from '../theme';
import { Button } from '../ui/Button';
import { fitToViewport } from '../ui/layout';

const DESIGN_WIDTH = 560;
const DESIGN_HEIGHT = 420;

export class MainMenu extends Scene {
  private content: Phaser.GameObjects.Container;
  private ship: Ship;

  constructor() {
    super('MainMenu');
  }

  create() {
    const cx = DESIGN_WIDTH / 2;
    const glow = this.add
      .image(cx, 92, TEXTURES.glow)
      .setTint(COLORS.cyan)
      .setAlpha(0.18)
      .setDisplaySize(520, 200)
      .setBlendMode(Phaser.BlendModes.ADD);
    const title = this.add
      .text(cx, 92, 'TYPE WARS', {
        fontFamily: FONTS.ui,
        fontSize: '72px',
        fontStyle: 'bold italic',
        color: CSS.text,
        stroke: '#1d3b8f',
        strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setLetterSpacing(4);
    const subtitle = this.add
      .text(cx, 160, 'A TYPING SPACE SHOOTER', {
        fontFamily: FONTS.ui,
        fontSize: '16px',
        fontStyle: 'bold',
        color: CSS.cyan,
      })
      .setOrigin(0.5)
      .setLetterSpacing(5);
    const play = new Button(this, cx, 262, 'PLAY', () => this.startGame());
    const hint = this.add
      .text(cx, 352, 'Type the words on the meteors to destroy them.', {
        fontFamily: FONTS.ui,
        fontSize: '17px',
        color: CSS.muted,
      })
      .setOrigin(0.5);

    this.content = this.add.container(0, 0, [
      glow,
      title,
      subtitle,
      play,
      hint,
    ]);
    this.ship = new Ship(this, 0, 0);

    this.layout();
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.onKeyDown,
      this
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(
        Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
        this.onKeyDown,
        this
      );
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.startGame();
    }
  }

  private startGame() {
    this.scene.start('Game');
  }

  private layout() {
    const { width, height } = this.scale;
    const field = playfieldFor(width, height);
    // Center the menu in the space above the ship.
    fitToViewport(
      this.content,
      DESIGN_WIDTH,
      DESIGN_HEIGHT,
      width,
      field.dangerY
    );
    this.ship.setPosition(field.shipX, field.shipY);
  }
}
