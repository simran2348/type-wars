import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Background } from './scenes/Background';
import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { MainMenu } from './scenes/MainMenu';

const config: Phaser.Types.Core.GameConfig = {
  type: AUTO,
  parent: 'game-container',
  backgroundColor: '#050714',
  scale: {
    // Match the Reddit web-view size exactly; layouts adapt on resize.
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1024,
    height: 768,
  },
  // Scene order is render order: the starfield sits beneath everything and
  // the Game Over overlay above the frozen game.
  scene: [Boot, Background, MainMenu, MainGame, GameOver],
};

document.addEventListener('DOMContentLoaded', () => {
  new Game(config);
});
