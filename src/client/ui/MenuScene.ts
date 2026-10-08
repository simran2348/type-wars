import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { applyView } from '../view';
import { fitToViewport } from './layout';

/**
 * Base for the non-gameplay screens: content is built once in fixed design
 * units, then centered and scaled to fit on every resize. Subclasses provide
 * the content and may react to keys.
 */
export abstract class MenuScene extends Scene {
  protected content: Phaser.GameObjects.Container;

  protected abstract readonly designWidth: number;
  protected abstract readonly designHeight: number;

  protected abstract build(): Phaser.GameObjects.GameObject[];

  protected onKey(_event: KeyboardEvent): void {}

  /** Positions content for the logical viewport; override to reserve space. */
  protected layoutContent(width: number, height: number): void {
    fitToViewport(
      this.content,
      this.designWidth,
      this.designHeight,
      width,
      height
    );
  }

  create() {
    this.content = this.add.container(0, 0, this.build());
    this.layout();

    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.onKey,
      this
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(
        Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
        this.onKey,
        this
      );
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private layout() {
    const { width, height } = applyView(this);
    this.layoutContent(width, height);
  }
}
