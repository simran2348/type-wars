import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { STARS_RESOLUTION } from '../textures';
import { TEXTURES } from '../theme';
import { applyView } from '../view';

/** Persistent parallax starfield rendered beneath every other scene. */
export class Background extends Scene {
  private far: Phaser.GameObjects.TileSprite;
  private near: Phaser.GameObjects.TileSprite;
  private nebulae: Phaser.GameObjects.Image[];

  constructor() {
    super('Background');
  }

  create() {
    // Deep space stays mostly black; the haze is barely there.
    this.nebulae = [
      this.add.image(0, 0, TEXTURES.glow).setTint(0x1a2c55).setAlpha(0.35),
      this.add.image(0, 0, TEXTURES.glow).setTint(0x4a1016).setAlpha(0.22),
    ];
    this.nebulae.forEach((nebula) =>
      nebula.setBlendMode(Phaser.BlendModes.ADD)
    );
    this.far = this.add
      .tileSprite(0, 0, 1, 1, TEXTURES.starsFar)
      .setOrigin(0)
      .setTileScale(1 / STARS_RESOLUTION);
    this.near = this.add
      .tileSprite(0, 0, 1, 1, TEXTURES.starsNear)
      .setOrigin(0)
      .setTileScale(1 / STARS_RESOLUTION);

    this.layout();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  override update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.far.tilePositionY -= 8 * STARS_RESOLUTION * dt;
    this.near.tilePositionY -= 22 * STARS_RESOLUTION * dt;
  }

  private layout() {
    const { width, height } = applyView(this);
    this.far.setSize(width, height);
    this.near.setSize(width, height);
    const [left, right] = this.nebulae;
    const size = Math.max(width, height);
    left
      ?.setPosition(width * 0.15, height * 0.25)
      .setDisplaySize(size * 0.9, size * 0.9);
    right
      ?.setPosition(width * 0.9, height * 0.75)
      .setDisplaySize(size * 0.8, size * 0.8);
  }
}
