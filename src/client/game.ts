import * as Phaser from 'phaser';
import { AUTO, Game } from 'phaser';
import { Background } from './scenes/Background';
import { Boot } from './scenes/Boot';
import { Game as MainGame } from './scenes/Game';
import { GameOver } from './scenes/GameOver';
import { Instructions } from './scenes/Instructions';
import { Leaderboard } from './scenes/Leaderboard';
import { MainMenu } from './scenes/MainMenu';
import { pixelRatio } from './view';

const container = (): HTMLElement => {
  const element = document.getElementById('game-container');
  if (!element) {
    throw new Error('Missing #game-container');
  }
  return element;
};

document.addEventListener('DOMContentLoaded', () => {
  const parent = container();
  const ratio = pixelRatio();

  // The canvas is sized in device pixels and displayed at 1/ratio, so it is
  // sharp on high-density screens. Scenes zoom their cameras to match (view.ts).
  const game = new Game({
    type: AUTO,
    parent,
    backgroundColor: '#000000',
    scale: {
      mode: Phaser.Scale.NONE,
      width: parent.clientWidth * ratio,
      height: parent.clientHeight * ratio,
      zoom: 1 / ratio,
    },
    // Scene order is render order: the starfield sits beneath everything and
    // the Game Over overlay above the frozen game.
    scene: [
      Boot,
      Background,
      MainMenu,
      Instructions,
      Leaderboard,
      MainGame,
      GameOver,
    ],
  });

  // Follow the container's size: window resizes, rotation, and the letter
  // pad appearing or disappearing below the game all change it.
  new ResizeObserver(() => {
    const next = pixelRatio();
    game.scale.setZoom(1 / next);
    game.scale.resize(parent.clientWidth * next, parent.clientHeight * next);
  }).observe(parent);
});
