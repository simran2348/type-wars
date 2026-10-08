import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import { Bullets } from '../entities/Bullets';
import type { Meteor } from '../entities/Meteor';
import { Ship } from '../entities/Ship';
import { touchKeyboard } from '../input/touchKeyboard';
import { playfieldFor, type Playfield } from '../playfield';
import { difficultyFor } from '../systems/Difficulty';
import { Effects } from '../systems/Effects';
import { MeteorSpawner } from '../systems/MeteorSpawner';
import { ScoreSystem } from '../systems/ScoreSystem';
import { Sfx } from '../systems/Sfx';
import { TypingSystem } from '../systems/TypingSystem';
import { WordPicker } from '../systems/WordPicker';
import { COLORS, CSS, FONTS } from '../theme';
import { addText } from '../ui/text';
import { applyView } from '../view';
import { Hud } from '../ui/Hud';

const STARTING_LIVES = 3;
const GAME_OVER_DELAY_MS = 1100;
const LETTER = /^[a-z]$/;

type PlayState = 'playing' | 'gameOver';

export class Game extends Scene {
  private state: PlayState;
  private field: Playfield;
  private lives: number;
  private elapsedSeconds: number;
  private ship: Ship;
  private dangerLine: Phaser.GameObjects.Graphics;
  private score: ScoreSystem;
  private typing: TypingSystem<Meteor>;
  private spawner: MeteorSpawner;
  private bullets: Bullets;
  private effects: Effects;
  private sfx: Sfx;
  private hud: Hud;
  private keyboardHint: Phaser.GameObjects.Text;
  private unsubscribeTouch: () => void;

  constructor() {
    super('Game');
  }

  create() {
    // Every run starts from a clean slate; the scene instance is reused on restart.
    this.state = 'playing';
    this.lives = STARTING_LIVES;
    this.elapsedSeconds = 0;
    const view = applyView(this);
    this.field = playfieldFor(view.width, view.height);
    this.score = new ScoreSystem();
    this.typing = new TypingSystem<Meteor>();
    this.spawner = new MeteorSpawner(this, new WordPicker());
    this.bullets = new Bullets(this);
    this.effects = new Effects(this);
    this.sfx = new Sfx(this.sound);

    this.dangerLine = this.add.graphics();
    this.ship = new Ship(this, this.field.shipX, this.field.shipY).setDepth(4);
    this.hud = new Hud(this, STARTING_LIVES, this.sfx.muted, () =>
      this.sfx.toggleMuted()
    );
    this.keyboardHint = addText(this, 0, 0, 'TAP HERE TO TYPE', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      fontStyle: '900',
      color: CSS.saber,
    })
      .setOrigin(0.5)
      .setDepth(100)
      .setVisible(false);
    this.tweens.add({
      targets: this.keyboardHint,
      alpha: 0.35,
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
    this.layout();

    // Tapping anywhere re-opens the on-screen keyboard if it was dismissed.
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      if (this.state === 'playing') {
        touchKeyboard.open();
      }
    });
    touchKeyboard.setActive(true);
    this.unsubscribeTouch = touchKeyboard.onChar((char) => this.onChar(char));
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.onKeyDown,
      this
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  override update(_time: number, delta: number) {
    if (this.state !== 'playing') {
      return;
    }
    // On touch devices the game waits while the on-screen keyboard is closed.
    const waitingForKeyboard = touchKeyboard.enabled && !touchKeyboard.isOpen;
    this.keyboardHint.setVisible(waitingForKeyboard);
    if (waitingForKeyboard) {
      return;
    }
    const dt = delta / 1000;
    this.elapsedSeconds += dt;

    const difficulty = difficultyFor({
      elapsedSeconds: this.elapsedSeconds,
      destroyed: this.score.destroyed,
      score: this.score.score,
    });
    this.spawner.update(delta, difficulty, this.field);

    for (const meteor of [...this.spawner.meteors]) {
      meteor.step(dt, this.field);
      if (meteor.hasReachedDanger) {
        this.onMeteorReachedShip(meteor);
        if (this.state !== 'playing') {
          return;
        }
      }
    }

    this.bullets.update(dt, (meteor, x, y) =>
      this.onBulletImpact(meteor, x, y)
    );
  }

  private onKeyDown(event: KeyboardEvent) {
    if (
      this.state !== 'playing' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      // Keys typed into the touch keyboard field arrive via onChar instead.
      touchKeyboard.owns(event.target)
    ) {
      return;
    }
    // Keep the browser from scrolling or opening quick-find while typing.
    if (event.key.length === 1 || event.key === 'Backspace') {
      event.preventDefault();
    }
    if (!event.repeat) {
      this.onChar(event.key);
    }
  }

  /** Shared by physical keyboards and the on-screen touch keyboard. */
  private onChar(key: string) {
    const char = key.toLowerCase();
    if (this.state !== 'playing' || !LETTER.test(char)) {
      return;
    }

    const result = this.typing.handleKey(char, this.spawner.meteors);
    if (result.kind === 'hit') {
      this.score.registerCorrectKey();
      this.fireAt(result.target);
      if (result.completed) {
        this.onWordCompleted(result.target);
      }
    } else {
      this.score.registerMistake();
      if (result.target) {
        result.target.flashError();
      } else {
        this.ship.flashError();
      }
      this.sfx.error();
    }
    this.refreshHud();
  }

  private fireAt(meteor: Meteor) {
    this.ship.aimAt(meteor.x, meteor.y);
    this.ship.recoil();
    const muzzle = this.ship.muzzle;
    this.bullets.fire(muzzle.x, muzzle.y, meteor);
    this.sfx.shoot();
  }

  private onWordCompleted(meteor: Meteor) {
    meteor.markDestroyed();
    this.spawner.remove(meteor);
    const points = this.score.registerDestroyed(meteor.word);
    this.effects.scorePopup(
      meteor.x,
      meteor.y - meteor.radius - 10,
      `+${points}`
    );
  }

  private onBulletImpact(meteor: Meteor, x: number, y: number) {
    this.effects.impact(x, y);
    if (meteor.status === 'missed') {
      return;
    }
    if (meteor.absorbBullet()) {
      this.effects.explode(meteor.x, meteor.y, meteor.radius);
      this.sfx.explode();
      meteor.destroy();
    }
  }

  private onMeteorReachedShip(meteor: Meteor) {
    this.typing.release(meteor);
    this.spawner.remove(meteor);
    meteor.markMissed();
    this.effects.shipHit(meteor.x, meteor.y);
    meteor.destroy();

    this.lives -= 1;
    this.score.breakCombo();
    this.sfx.lifeLost();
    this.refreshHud();

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  private endGame() {
    this.state = 'gameOver';
    // Drop the on-screen keyboard so the leaderboard is visible.
    touchKeyboard.setActive(false);
    this.keyboardHint.setVisible(false);
    this.typing.reset();
    this.bullets.clear();
    this.effects.shipDestroyed(this.ship.x, this.ship.y);
    this.ship.setVisible(false);
    this.sfx.gameOver();

    this.time.delayedCall(GAME_OVER_DELAY_MS, () => {
      this.scene.launch('GameOver', this.score.summary());
    });
  }

  private refreshHud() {
    this.hud.update({
      score: this.score.score,
      combo: this.score.combo,
      multiplier: this.score.multiplier,
      lives: this.lives,
    });
  }

  private layout() {
    const view = applyView(this);
    this.field = playfieldFor(view.width, view.height);
    this.ship.setPosition(this.field.shipX, this.field.shipY);
    this.hud.layout(this.field.width, this.field.height);
    this.keyboardHint.setPosition(
      this.field.width / 2,
      this.field.height * 0.4
    );

    // Faint warning band marking where meteors hit the ship.
    this.dangerLine.clear();
    this.dangerLine.fillStyle(COLORS.danger, 0.06);
    this.dangerLine.fillRect(
      0,
      this.field.dangerY,
      this.field.width,
      this.field.height - this.field.dangerY
    );
    this.dangerLine.lineStyle(1, COLORS.danger, 0.35);
    this.dangerLine.lineBetween(
      0,
      this.field.dangerY,
      this.field.width,
      this.field.dangerY
    );
  }

  private cleanup() {
    touchKeyboard.setActive(false);
    this.unsubscribeTouch();
    this.input.keyboard?.off(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.onKeyDown,
      this
    );
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
