import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { TEXTURES } from '../theme';

/** Persistent parallax starfield rendered beneath every other scene. */
export class Background extends Scene {
  private far: Phaser.GameObjects.TileSprite;
  private near: Phaser.GameObjects.TileSprite;
  private nebulae: Phaser.GameObjects.Image[];

  constructor() {
    super('Background');
  }

  create() {
    const { width, height } = this.scale;
    this.nebulae = [
      this.add.image(0, 0, TEXTURES.glow).setTint(0x3b2a8a).setAlpha(0.35),
      this.add.image(0, 0, TEXTURES.glow).setTint(0x0f4f8a).setAlpha(0.3),
    ];
    this.nebulae.forEach((nebula) =>
      nebula.setBlendMode(Phaser.BlendModes.ADD)
    );
    this.far = this.add
      .tileSprite(0, 0, width, height, TEXTURES.starsFar)
      .setOrigin(0);
    this.near = this.add
      .tileSprite(0, 0, width, height, TEXTURES.starsNear)
      .setOrigin(0);

    this.layout(width, height);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
    });
  }

  override update(_time: number, delta: number) {
    const dt = delta / 1000;
    this.far.tilePositionY -= 8 * dt;
    this.near.tilePositionY -= 22 * dt;
  }

  private onResize(size: Phaser.Structs.Size) {
    this.layout(size.width, size.height);
  }

  private layout(width: number, height: number) {
    this.far.setSize(width, height);
    this.near.setSize(width, height);
    const [left, right] = this.nebulae;
    const scale = Math.max(width, height) / 128;
    left?.setPosition(width * 0.15, height * 0.25).setScale(scale * 0.9);
    right?.setPosition(width * 0.9, height * 0.75).setScale(scale * 0.8);
  }
}
