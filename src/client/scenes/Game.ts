import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import {
  startRun,
  trackDestroyed,
  trackInteraction,
  trackScore,
} from '../analytics';
import { Bullets } from '../entities/Bullets';
import type { GameMode } from '../../shared/api';
import type { Meteor } from '../entities/Meteor';
import { Ship } from '../entities/Ship';
import { letterKeyboard } from '../input/letterKeyboard';
import { DEFAULT_MODE, MODES, type RunOptions } from '../modes';
import { playfieldFor, type Playfield } from '../playfield';
import { difficultyFor } from '../systems/Difficulty';
import { Effects } from '../systems/Effects';
import { MeteorSpawner } from '../systems/MeteorSpawner';
import { ScoreSystem, type RunSummary } from '../systems/ScoreSystem';
import { Sfx } from '../systems/Sfx';
import { TypingSystem } from '../systems/TypingSystem';
import { WordPicker } from '../systems/WordPicker';
import { COLORS, CSS, TEXTURES } from '../theme';
import { TEXTURE_SCALE } from '../textures';
import { applyView } from '../view';
import { Hud } from '../ui/Hud';

const STARTING_LIVES = 3;
const DANGER_PENALTY_MIN = 2;
const DANGER_PENALTY_MAX = 3;
const GAME_OVER_DELAY_MS = 1100;
const LETTER = /^[a-z]$/;
/** A cooldown pickup halves every meteor's speed for this long... */
const SLOW_SECONDS = 10;
const SLOW_FACTOR = 0.5;
/** ...then eases back to full speed over this last stretch. */
const SLOW_EASE_SECONDS = 1;
/** Cooldowns only appear once normal meteors fall faster than this (start is 10s). */
const SLOW_USEFUL_TRAVEL_SECONDS = 8.5;
/** How far the frost reaches in from each edge during slow motion. */
const FROST_BAND = 32;

type PlayState = 'playing' | 'gameOver';

/** What the Game Over screen receives. */
export type RunResult = RunSummary & { mode: GameMode };

export class Game extends Scene {
  private state: PlayState;
  private mode: GameMode = DEFAULT_MODE;
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
  /** Seconds of slow motion left from a cooldown pickup. */
  private slowRemaining: number;
  /** Frosted edges and a light snowfall while slow motion runs. */
  private frost: Phaser.GameObjects.Container;
  private snow: Phaser.GameObjects.Particles.ParticleEmitter;
  /** Slow-motion timer: a cyan bar along the red line that shrinks to nothing. */
  private slowBar: Phaser.GameObjects.Graphics;
  private unsubscribeLetters: () => void;

  constructor() {
    super('Game');
  }

  /** PLAY AGAIN passes the same level back in. */
  init(data: Partial<RunOptions>) {
    this.mode = data.mode ?? DEFAULT_MODE;
  }

  create() {
    // Every run starts from a clean slate; the scene instance is reused on restart.
    this.state = 'playing';
    this.lives = STARTING_LIVES;
    this.elapsedSeconds = 0;
    this.passing = [];
    this.slowRemaining = 0;
    const view = applyView(this);
    this.field = playfieldFor(view.width, view.height);
    this.score = new ScoreSystem();
    this.typing = new TypingSystem<Meteor>();
    this.spawner = new MeteorSpawner(this, new WordPicker(), MODES[this.mode]);
    this.bullets = new Bullets(this);
    this.effects = new Effects(this);
    this.sfx = new Sfx(this.sound);

    this.dangerLine = this.add.graphics();
    // One frost strip per edge; only a thin band, the middle stays clear.
    this.frost = this.add
      .container(0, 0, [
        this.add.image(0, 0, TEXTURES.frostTop).setOrigin(0),
        this.add.image(0, 0, TEXTURES.frostTop).setOrigin(0).setFlipY(true),
        this.add.image(0, 0, TEXTURES.frostLeft).setOrigin(0),
        this.add.image(0, 0, TEXTURES.frostLeft).setOrigin(0).setFlipX(true),
      ])
      .setAlpha(0)
      .setDepth(0);
    // A light snowfall: a few small flakes, never enough to hide a word.
    this.snow = this.add
      .particles(0, 0, TEXTURES.flake, {
        lifespan: 7000,
        frequency: 260,
        speedY: { min: 22, max: 48 },
        speedX: { min: -10, max: 10 },
        rotate: { min: 0, max: 360 },
        scale: { min: 0.55 * TEXTURE_SCALE, max: 1 * TEXTURE_SCALE },
        alpha: { start: 0.65, end: 0 },
        tint: [0xffffff, COLORS.ice],
        emitting: false,
      })
      .setDepth(0);
    this.slowBar = this.add.graphics().setDepth(3);
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
    startRun(this.mode);
  }

  override update(_time: number, delta: number) {
    if (this.state !== 'playing') {
      return;
    }
    const dt = delta / 1000;
    this.elapsedSeconds += dt;
    // Slow motion scales meteor movement and spawning, not run progress.
    this.slowRemaining = Math.max(0, this.slowRemaining - dt);
    const pace = this.pace();
    this.showSlowMotion();

    const difficulty = difficultyFor(
      {
        elapsedSeconds: this.elapsedSeconds,
        destroyed: this.score.destroyed,
        score: this.score.score,
      },
      MODES[this.mode]
    );
    this.spawner.update(delta * pace, difficulty, this.field, {
      missingLife: this.lives < STARTING_LIVES,
      slowUseful:
        MODES[this.mode].slow &&
        this.slowRemaining === 0 &&
        difficulty.baseTravelSeconds <= SLOW_USEFUL_TRAVEL_SECONDS,
    });

    for (const meteor of [...this.spawner.meteors]) {
      meteor.step(dt * pace, this.field);
      if (meteor.hasReachedDanger) {
        this.onMeteorReachedShip(meteor);
        if (this.state !== 'playing') {
          return;
        }
      }
    }

    this.passing = this.passing.filter((meteor) => {
      meteor.step(dt * pace, this.field);
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
    this.reward(meteor);
    if (meteor.kind === 'golden' && MODES[this.mode].goldenClears) {
      this.clearScreen(meteor);
    }
  }

  /** Scores a destroyed meteor: its usual points, or a life for a heart. */
  private reward(meteor: Meteor) {
    const points = this.score.registerDestroyed(meteor.word, meteor.kind);
    trackDestroyed(this.score.destroyed);
    if (meteor.kind !== 'normal') {
      trackInteraction(`${meteor.kind}_destroyed`);
    }
    if (meteor.kind === 'heart') {
      this.onHeartCollected(meteor);
      return;
    }
    if (meteor.kind === 'slow') {
      this.onSlowCollected(meteor);
      return;
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

  /**
   * Hard and ranked: finishing a golden word destroys every other meteor in
   * play. Each one pays out as if it had been typed, so a heart on screen
   * gives its life back.
   */
  private clearScreen(golden: Meteor) {
    const cleared = [...this.spawner.meteors];
    for (const meteor of cleared) {
      this.typing.release(meteor);
      this.spawner.remove(meteor);
      // Marked missed so bolts already flying at it land harmlessly.
      meteor.markMissed();
      this.reward(meteor);
      this.effects.explode(meteor.x, meteor.y, meteor.radius);
      meteor.destroy();
    }
    this.refreshKeyHint();
    this.refreshHud();
    this.effects.goldenBlast(golden.x, golden.y);
    if (cleared.length > 0) {
      this.sfx.explode();
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
      // A missed heart or cooldown pickup costs nothing; another comes later.
      if (meteor.kind === 'heart' || meteor.kind === 'slow') {
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

  /** Typing a heart meteor's word gives one lost life back. */
  private onHeartCollected(meteor: Meteor) {
    this.lives = Math.min(STARTING_LIVES, this.lives + 1);
    this.effects.scorePopup(
      meteor.x,
      meteor.y - meteor.radius - 10,
      '+1 LIFE',
      CSS.danger,
      26
    );
    this.sfx.bonus();
    this.refreshHud();
  }

  /** Typing "cooldown" (ranked) slows every meteor down for a while. */
  private onSlowCollected(meteor: Meteor) {
    this.slowRemaining = SLOW_SECONDS;
    this.effects.scorePopup(
      meteor.x,
      meteor.y - meteor.radius - 10,
      'SLOW MOTION',
      CSS.ice,
      24
    );
    this.sfx.bonus();
  }

  /** Meteor speed multiplier: 1 normally, SLOW_FACTOR during slow motion. */
  private pace(): number {
    if (this.slowRemaining <= 0) {
      return 1;
    }
    const easing = Math.min(1, this.slowRemaining / SLOW_EASE_SECONDS);
    return 1 - (1 - SLOW_FACTOR) * easing;
  }

  private showSlowMotion() {
    const active = this.slowRemaining > 0;
    // Fades in and out with the slow motion itself.
    this.frost.setAlpha(active ? (1 - this.pace()) * 2 : 0);
    if (active && !this.snow.emitting) {
      this.snow.start();
    } else if (!active && this.snow.emitting) {
      this.snow.stop();
    }
    this.slowBar.clear();
    if (active) {
      // Shrinks toward the middle as the slow motion runs out.
      const width = this.field.width * (this.slowRemaining / SLOW_SECONDS);
      const left = (this.field.width - width) / 2;
      this.slowBar.fillStyle(COLORS.ice, 0.25);
      this.slowBar.fillRect(left, this.field.dangerY - 3, width, 6);
      this.slowBar.fillStyle(COLORS.ice, 1);
      this.slowBar.fillRect(left, this.field.dangerY - 1.5, width, 3);
    }
  }

  /** Danger meteors cost 2-3 points instead of a life. */
  private onDangerPenalty(x: number, y: number) {
    const penalty = Phaser.Math.Between(DANGER_PENALTY_MIN, DANGER_PENALTY_MAX);
    this.score.registerPenalty(penalty);
    this.effects.scorePopup(x, y - 30, `-${penalty}`, CSS.violet, 24);
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
      const result: RunResult = { ...this.score.summary(), mode: this.mode };
      this.scene.launch('GameOver', result);
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
    this.layoutFrost();
    // Flakes start just above the play area, anywhere across its width.
    const { width } = this.field;
    const snowZone: Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig =
      {
        type: 'random',
        source: {
          getRandomPoint: (point) => {
            point.x = Math.random() * width;
            point.y = -12;
          },
        },
      };
    this.snow.clearEmitZones();
    this.snow.addEmitZone(snowZone);

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

  /** Places the frost strips along the four edges of the play area. */
  private layoutFrost() {
    const { width, height } = this.field;
    const band = FROST_BAND;
    const [top, bottom, left, right] = this.frost.list;
    if (
      top instanceof Phaser.GameObjects.Image &&
      bottom instanceof Phaser.GameObjects.Image &&
      left instanceof Phaser.GameObjects.Image &&
      right instanceof Phaser.GameObjects.Image
    ) {
      top.setPosition(0, 0).setDisplaySize(width, band);
      bottom.setPosition(0, height - band).setDisplaySize(width, band);
      left.setPosition(0, 0).setDisplaySize(band, height);
      right.setPosition(width - band, 0).setDisplaySize(band, height);
    }
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
