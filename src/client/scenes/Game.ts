import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  startRun,
  trackDestroyed,
  trackInteraction,
  trackScore,
} from '../analytics';
import { Bullets } from '../entities/Bullets';
import type { Meteor } from '../entities/Meteor';
import { Ship } from '../entities/Ship';
import { letterKeyboard } from '../input/letterKeyboard';
import { playfieldFor, type Playfield } from '../playfield';
import { difficultyFor } from '../systems/Difficulty';
import { Effects } from '../systems/Effects';
import { MeteorSpawner } from '../systems/MeteorSpawner';
import { ScoreSystem } from '../systems/ScoreSystem';
import { Sfx } from '../systems/Sfx';
import { TypingSystem } from '../systems/TypingSystem';
import { WordPicker } from '../systems/WordPicker';
import { COLORS, CSS } from '../theme';
import { applyView } from '../view';
import { Hud } from '../ui/Hud';

const STARTING_LIVES = 3;
const DANGER_PENALTY_MIN = 2;
const DANGER_PENALTY_MAX = 3;
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
  /** Danger and golden meteors past the red line, falling off screen. */
  private passing: Meteor[];
  private unsubscribeLetters: () => void;

  constructor() {
    super('Game');
  }

  create() {
    // Every run starts from a clean slate; the scene instance is reused on restart.
    this.state = 'playing';
    this.lives = STARTING_LIVES;
    this.elapsedSeconds = 0;
    this.passing = [];
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
    this.hud = new Hud(this, STARTING_LIVES, this.sfx.muted, () => {
      const muted = this.sfx.toggleMuted();
      trackInteraction('sound_toggled', muted ? 'off' : 'on');
      return muted;
    });
    this.layout();

    // On touch devices letters come from the on-screen letter pad.
    letterKeyboard.show();
    this.unsubscribeLetters = letterKeyboard.onChar((char) =>
      this.onChar(char)
    );
    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.onKeyDown,
      this
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    // Every Game start is an explicit PLAY / PLAY AGAIN, i.e. a new journey.
    startRun();
  }

  override update(_time: number, delta: number) {
    if (this.state !== 'playing') {
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

    this.passing = this.passing.filter((meteor) => {
      meteor.step(dt, this.field);
      if (meteor.isBelow(this.field)) {
        meteor.destroy();
        return false;
      }
      return true;
    });

    this.bullets.update(dt, (meteor, x, y) =>
      this.onBulletImpact(meteor, x, y)
    );
  }

  private onKeyDown(event: KeyboardEvent) {
    if (
      this.state !== 'playing' ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
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
    this.refreshKeyHint();
  }

  /** Lights up the next letter of the locked word on the touch letter pad. */
  private refreshKeyHint() {
    const target = this.typing.current;
    letterKeyboard.setHint(target ? (target.word[target.typed] ?? null) : null);
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
    const points = this.score.registerDestroyed(meteor.word, meteor.kind);
    trackDestroyed(this.score.destroyed);
    if (meteor.kind !== 'normal') {
      trackInteraction(`${meteor.kind}_destroyed`);
    }
    const golden = meteor.kind === 'golden';
    this.effects.scorePopup(
      meteor.x,
      meteor.y - meteor.radius - 10,
      `+${points}`,
      golden ? CSS.gold : CSS.accent,
      golden ? 30 : 20
    );
    if (golden) {
      this.sfx.bonus();
    }
  }

  private onBulletImpact(meteor: Meteor, x: number, y: number) {
    this.effects.impact(x, y);
    if (meteor.status === 'missed' || meteor.status === 'passed') {
      return;
    }
    if (meteor.absorbBullet()) {
      this.effects.explode(
        meteor.x,
        meteor.y,
        meteor.radius,
        meteor.kind === 'golden'
      );
      this.sfx.explode();
      meteor.destroy();
    }
  }

  private onMeteorReachedShip(meteor: Meteor) {
    this.typing.release(meteor);
    this.refreshKeyHint();
    this.spawner.remove(meteor);

    if (meteor.kind === 'normal') {
      meteor.markMissed();
      meteor.destroy();
      this.effects.shipHit(meteor.x, meteor.y);
    } else {
      // Specials fly on past the red line without a blast; only the rule applies.
      meteor.markPassed();
      this.passing.push(meteor);
      if (meteor.kind === 'danger') {
        this.onDangerPenalty(meteor.x, meteor.y);
        return;
      }
    }

    this.lives -= 1;
    trackInteraction('life_lost', String(this.lives));
    this.score.breakCombo();
    this.sfx.lifeLost();
    this.refreshHud();

    if (this.lives <= 0) {
      this.endGame();
    }
  }

  /** Danger meteors cost 2-3 points instead of a life. */
  private onDangerPenalty(x: number, y: number) {
    const penalty = Phaser.Math.Between(DANGER_PENALTY_MIN, DANGER_PENALTY_MAX);
    this.score.registerPenalty(penalty);
    this.effects.scorePopup(x, y - 30, `-${penalty}`, CSS.danger, 24);
    this.sfx.penalty();
    this.refreshHud();
  }

  private endGame() {
    this.state = 'gameOver';
    // Hide the letter pad so the Game Over screen gets the full height.
    letterKeyboard.hide();
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
    trackScore(this.score.score);
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
    this.ship
      .setPosition(this.field.shipX, this.field.shipY)
      .setScale(this.field.entityScale);
    this.hud.layout(this.field.width, this.field.height);

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
    letterKeyboard.hide();
    this.unsubscribeLetters();
    this.input.keyboard?.off(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.onKeyDown,
      this
    );
    this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
  }
}
