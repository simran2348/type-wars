import { Scene } from 'phaser';
import { appReady } from '../analytics';
import { createTextures } from '../textures';
import { FONT_FACES } from '../theme';

/** Don't hold the game hostage if a font fails to load; fall back instead. */
const FONT_TIMEOUT_MS = 3000;

export class Boot extends Scene {
  constructor() {
    super('Boot');
  }

  create() {
    createTextures(this);
    // Phaser bakes text into textures, so fonts must be ready beforehand.
    const fonts = Promise.all(
      FONT_FACES.map((face) => document.fonts.load(face))
    );
    const timeout = new Promise((resolve) =>
      setTimeout(resolve, FONT_TIMEOUT_MS)
    );
    void Promise.race([fonts, timeout])
      .catch((error: unknown) => console.warn('Font loading failed', error))
      .then(() => {
        this.scene.launch('Background');
        this.scene.start('MainMenu');
        appReady();
      });
  }
}
