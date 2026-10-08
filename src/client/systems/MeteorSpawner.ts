import * as Phaser from 'phaser';
import { Meteor, type MeteorPath } from '../entities/Meteor';
import type { Playfield } from '../playfield';
import { travelSecondsFor, type Difficulty } from './Difficulty';
import type { WordPicker } from './WordPicker';

/** Delay before the first meteor and when the screen is empty. */
const QUICK_SPAWN_MS = 600;
const SPAWN_ATTEMPTS = 8;
/** New meteors keep at least this much horizontal distance from recent ones. */
const MIN_SPAWN_GAP = 0.18;

/** A fresh, independent route for every meteor so no two paths repeat. */
const randomPath = (startX: number): MeteorPath => ({
  startX,
  bendX: Phaser.Math.FloatBetween(0.05, 0.95),
  endX: Phaser.Math.FloatBetween(0.12, 0.88),
  swayAmplitude: Phaser.Math.FloatBetween(0, 40),
  swayCycles: Phaser.Math.FloatBetween(0.5, 3),
  swayPhase: Phaser.Math.FloatBetween(0, Math.PI * 2),
});

/**
 * Owns the live meteors and the words on screen, and decides when, where and
 * with which word the next meteor appears.
 */
export class MeteorSpawner {
  readonly meteors: Meteor[] = [];
  private readonly activeWords = new Set<string>();
  private sinceLastSpawnMs = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly words: WordPicker
  ) {}

  update(deltaMs: number, difficulty: Difficulty, field: Playfield): void {
    this.sinceLastSpawnMs += deltaMs;
    const due =
      this.meteors.length === 0
        ? Math.min(QUICK_SPAWN_MS, difficulty.spawnIntervalMs)
        : difficulty.spawnIntervalMs;

    if (
      this.meteors.length < difficulty.maxActiveMeteors &&
      this.sinceLastSpawnMs >= due
    ) {
      this.spawn(difficulty, field);
      this.sinceLastSpawnMs = 0;
    }
  }

  /** Stops tracking a meteor and frees its word. Does not destroy the object. */
  remove(meteor: Meteor): void {
    const index = this.meteors.indexOf(meteor);
    if (index !== -1) {
      this.meteors.splice(index, 1);
    }
    this.activeWords.delete(meteor.word);
  }

  private spawn(difficulty: Difficulty, field: Playfield): void {
    const word = this.words.pick(difficulty.tierWeights, this.activeWords);
    const startX = this.pickStartX(field);
    this.activeWords.add(word);
    this.meteors.push(
      new Meteor(
        this.scene,
        {
          word,
          path: randomPath(startX),
          travelSeconds: travelSecondsFor(word, difficulty),
          fontSize: field.wordFontSize,
        },
        field
      )
    );
  }

  /**
   * Picks a random spawn point clear of meteors still near the top, so labels
   * don't overlap. Takes the first clear spot rather than the widest gap, which
   * would keep reusing the same few lanes.
   */
  private pickStartX(field: Playfield): number {
    const recent = this.meteors
      .filter((m) => m.travel < 0.35)
      .map((m) => m.x / field.width);
    let best = Phaser.Math.FloatBetween(0.1, 0.9);
    let bestGap = -1;
    for (let i = 0; i < SPAWN_ATTEMPTS; i++) {
      const candidate = Phaser.Math.FloatBetween(0.1, 0.9);
      const gap = Math.min(1, ...recent.map((x) => Math.abs(x - candidate)));
      if (gap >= MIN_SPAWN_GAP) {
        return candidate;
      }
      if (gap > bestGap) {
        best = candidate;
        bestGap = gap;
      }
    }
    return best;
  }
}
