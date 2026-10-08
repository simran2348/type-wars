import { Scene } from 'phaser';
import { createTextures } from '../textures';

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createTextures(this);
    this.scene.launch('Background');
    this.scene.start('MainMenu');
  }
}
