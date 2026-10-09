import * as Phaser from 'phaser';
import { TEXTURE_SCALE } from '../textures';
import { TEXTURES } from '../theme';
import type { Meteor } from './Meteor';

const SPEED = 2200;

type Shot = {
  sprite: Phaser.GameObjects.Image;
  target: Meteor;
  /** Last known target position, used if the meteor disappears mid-flight. */
  aimX: number;
  aimY: number;
};

export type ImpactHandler = (meteor: Meteor, x: number, y: number) => void;

/** Pooled homing bullets: one per correct keystroke. */
export class Bullets {
  private readonly pool: Phaser.GameObjects.Image[] = [];
  private shots: Shot[] = [];

  constructor(private readonly scene: Phaser.Scene) {}

  fire(x: number, y: number, target: Meteor): void {
    const sprite =
      this.pool.pop() ??
      this.scene.add
        .image(0, 0, TEXTURES.bullet)
        .setScale(TEXTURE_SCALE)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(5);
    sprite.setPosition(x, y).setActive(true).setVisible(true);
    target.trackBullet();
    this.shots.push({ sprite, target, aimX: target.x, aimY: target.y });
  }

  update(dt: number, onImpact: ImpactHandler): void {
    const step = SPEED * dt;
    this.shots = this.shots.filter((shot) => {
      if (
        shot.target.status === 'active' ||
        shot.target.status === 'destroyed'
      ) {
        shot.aimX = shot.target.x;
        shot.aimY = shot.target.y;
      }
      const { sprite } = shot;
      const dx = shot.aimX - sprite.x;
      const dy = shot.aimY - sprite.y;
      const distance = Math.hypot(dx, dy);
      const hitDistance = shot.target.radius * 0.6;

      if (distance - step <= hitDistance) {
        const ratio =
          distance > 0 ? Math.max(0, distance - hitDistance) / distance : 0;
        const x = sprite.x + dx * ratio;
        const y = sprite.y + dy * ratio;
        this.recycle(sprite);
        onImpact(shot.target, x, y);
        return false;
      }

      sprite.x += (dx / distance) * step;
      sprite.y += (dy / distance) * step;
      sprite.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
      return true;
    });
  }

  clear(): void {
    this.shots.forEach((shot) => this.recycle(shot.sprite));
    this.shots = [];
  }

  private recycle(sprite: Phaser.GameObjects.Image): void {
    sprite.setActive(false).setVisible(false);
    this.pool.push(sprite);
  }
}
