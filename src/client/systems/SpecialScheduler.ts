import type { MeteorKind } from '../entities/Meteor';
import type { RandomSource } from './WordPicker';

/** Danger meteors arrive after this many normal words (never the same gap twice in a row). */
export const DANGER_GAPS = [4, 5, 6] as const;
/** Golden meteors arrive after this many normal words (never the same gap twice in a row). */
export const GOLDEN_GAPS = [8, 9, 10] as const;
/** Heart meteors arrive after this many normal words played while missing a life. */
export const HEART_GAPS = [14, 15, 16] as const;
/** Cooldown pickups (ranked) arrive after this many normal words played while they're useful. */
export const SLOW_GAPS = [20, 22, 24, 25] as const;

/**
 * Counts normal words until a special meteor is due. Each new gap is drawn at
 * random from `gaps`, excluding the previous one, so the rhythm never repeats.
 */
class Cadence {
  private lastGap: number | null = null;
  private remaining: number;

  constructor(
    private readonly gaps: readonly number[],
    private readonly random: RandomSource
  ) {
    this.remaining = this.drawGap();
  }

  get due(): boolean {
    return this.remaining <= 0;
  }

  countNormal(): void {
    this.remaining -= 1;
  }

  /** The special meteor appeared; start counting toward the next one. */
  restart(): void {
    this.remaining = this.drawGap();
  }

  private drawGap(): number {
    const options = this.gaps.filter((gap) => gap !== this.lastGap);
    const gap =
      options[Math.floor(this.random() * options.length)] ?? this.gaps[0] ?? 1;
    this.lastGap = gap;
    return gap;
  }
}

/** Which special meteors a level allows. */
export type SpecialKinds = {
  danger: boolean;
  golden: boolean;
  heart: boolean;
  slow: boolean;
};

/** What the run looks like right now, for pickups that only appear when useful. */
export type SpawnContext = {
  /** The player has lost a life: heart pickups may appear. */
  missingLife: boolean;
  /** Meteors have sped up and no slow motion is running: cooldowns may appear. */
  slowUseful: boolean;
};

const NO_CONTEXT: SpawnContext = { missingLife: false, slowUseful: false };

/**
 * Decides whether the next meteor is normal, danger, golden, heart or slow.
 * Only normal words count toward a gap. If several are due at once, golden
 * goes first, then heart, then slow, then danger, one per spawn.
 *
 * Heart meteors only count down, and only appear, while the player is missing
 * a life. Cooldown pickups likewise only count down, and appear, once slowing
 * down would help, so the first one never arrives the moment meteors speed up.
 */
export class SpecialScheduler {
  private readonly danger: Cadence;
  private readonly golden: Cadence;
  private readonly heart: Cadence;
  private readonly slow: Cadence;

  constructor(
    private readonly enabled: SpecialKinds = {
      danger: true,
      golden: true,
      heart: false,
      slow: false,
    },
    random: RandomSource = Math.random
  ) {
    this.danger = new Cadence(DANGER_GAPS, random);
    this.golden = new Cadence(GOLDEN_GAPS, random);
    this.heart = new Cadence(HEART_GAPS, random);
    this.slow = new Cadence(SLOW_GAPS, random);
  }

  /** The kind the next meteor should be; call `record` once it has spawned. */
  next(context: SpawnContext = NO_CONTEXT): MeteorKind {
    if (this.enabled.golden && this.golden.due) {
      return 'golden';
    }
    if (this.enabled.heart && context.missingLife && this.heart.due) {
      return 'heart';
    }
    if (this.enabled.slow && context.slowUseful && this.slow.due) {
      return 'slow';
    }
    return this.enabled.danger && this.danger.due ? 'danger' : 'normal';
  }

  /** Records what actually spawned (a special can fall back to normal). */
  record(kind: MeteorKind, context: SpawnContext = NO_CONTEXT): void {
    if (kind === 'golden') {
      this.golden.restart();
    } else if (kind === 'danger') {
      this.danger.restart();
    } else if (kind === 'heart') {
      this.heart.restart();
    } else if (kind === 'slow') {
      this.slow.restart();
    } else {
      this.golden.countNormal();
      this.danger.countNormal();
      if (context.slowUseful) {
        this.slow.countNormal();
      }
      if (context.missingLife) {
        this.heart.countNormal();
      }
    }
  }
}
