import * as Phaser from 'phaser';
import { Meteor, type MeteorKind } from '../entities/Meteor';
import {
  bouncePath,
  type BouncePath,
  type CurvePath,
  type MeteorPath,
} from '../entities/meteorPath';
import type { Playfield } from '../playfield';
import type { NormalTier } from '../data/words';
import type { Difficulty } from './Difficulty';
import { SpecialScheduler, type SpecialKinds } from './SpecialScheduler';
import type { WordPicker } from './WordPicker';

/** Delay before the first meteor and when the screen is empty. */
const QUICK_SPAWN_MS = 600;
const SPAWN_ATTEMPTS = 8;
/** New meteors keep at least this much horizontal distance from recent ones. */
const MIN_SPAWN_GAP = 0.18;

/**
 * The only three speeds in the game, as travel-time multipliers: below 1 is
 * faster, above 1 is slower. Word length never changes a meteor's speed.
 */
const TRAVEL_FACTOR: Record<MeteorKind, number> = {
  normal: 1,
  danger: 0.6,
  golden: 1.8,
};

/** Danger meteors carry short words: 3 or 4 letters. */
const DANGER_TIERS: readonly NormalTier[] = ['easy', 'medium'];

/** Golden meteors: a fresh, independent curve so no two paths repeat. */
const randomCurve = (startX: number): CurvePath => ({
  kind: 'curve',
  startX,
  bendX: Phaser.Math.FloatBetween(0.05, 0.95),
  endX: Phaser.Math.FloatBetween(0.12, 0.88),
  swayAmplitude: Phaser.Math.FloatBetween(0, 40),
  swayCycles: Phaser.Math.FloatBetween(0.5, 3),
  swayPhase: Phaser.Math.FloatBetween(0, Math.PI * 2),
});

/** Danger meteors bounce off the side walls three times on the way down. */
const randomBounce = (startX: number): BouncePath =>
  bouncePath(
    startX,
    Math.random() < 0.5 ? 1 : -1,
    Phaser.Math.FloatBetween(0.15, 0.85)
  );

/** Normal meteors fly straight at the ship from a random start. */
const pathFor = (kind: MeteorKind, startX: number): MeteorPath => {
  switch (kind) {
    case 'normal':
      return { kind: 'line', startX };
    case 'danger':
      return randomBounce(startX);
    case 'golden':
      return randomCurve(startX);
  }
};

/**
 * Owns the live meteors and the words on screen, and decides when, where and
 * with which word the next meteor appears.
 */
export class MeteorSpawner {
  readonly meteors: Meteor[] = [];
  private readonly activeWords = new Set<string>();
  private sinceLastSpawnMs = 0;
  private readonly specials: SpecialScheduler;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly words: WordPicker,
    /** Which special meteors the current level allows. */
    specialKinds: SpecialKinds
  ) {
    this.specials = new SpecialScheduler(specialKinds);
  }

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
    const { kind, word } = this.pickKindAndWord(difficulty);
    const startX = this.pickStartX(field);
    this.activeWords.add(word);
    this.specials.record(kind);
    this.meteors.push(
      new Meteor(
        this.scene,
        {
          word,
          kind,
          path: pathFor(kind, startX),
          travelSeconds: difficulty.baseTravelSeconds * TRAVEL_FACTOR[kind],
          fontSize: field.wordFontSize,
        },
        field
      )
    );
  }

  /**
   * Danger and golden meteors arrive on a schedule (see SpecialScheduler).
   * Danger words are easy or medium (3-4 letters); golden ones are longer than 8.
   */
  private pickKindAndWord(difficulty: Difficulty): {
    kind: MeteorKind;
    word: string;
  } {
    const kind = this.specials.next();
    if (kind !== 'normal') {
      const word =
        kind === 'golden'
          ? this.words.pickFromTier('golden', this.activeWords)
          : this.pickDangerWord();
      if (word) {
        return { kind, word };
      }
    }
    return {
      kind: 'normal',
      word: this.words.pick(difficulty.tierWeights, this.activeWords),
    };
  }

  /** A word from a random danger tier, falling back to the other one. */
  private pickDangerWord(): string | null {
    const tiers = Phaser.Utils.Array.Shuffle([...DANGER_TIERS]);
    for (const tier of tiers) {
      const word = this.words.pickFromTier(tier, this.activeWords);
      if (word) {
        return word;
      }
    }
    return null;
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
