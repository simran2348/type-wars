import type { MeteorKind } from '../entities/Meteor';
import type { RandomSource } from './WordPicker';

/** Danger meteors arrive after this many normal words (never the same gap twice in a row). */
export const DANGER_GAPS = [4, 5, 6] as const;
/** Golden meteors arrive after this many normal words (never the same gap twice in a row). */
export const GOLDEN_GAPS = [8, 9, 10] as const;

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

/**
 * Decides whether the next meteor is normal, danger or golden. Only normal
 * words count toward either gap. If both are due at once, golden goes first
 * and danger follows on the next spawn.
 */
export class SpecialScheduler {
  private readonly danger: Cadence;
  private readonly golden: Cadence;

  constructor(random: RandomSource = Math.random) {
    this.danger = new Cadence(DANGER_GAPS, random);
    this.golden = new Cadence(GOLDEN_GAPS, random);
  }

  /** The kind the next meteor should be; call `record` once it has spawned. */
  next(): MeteorKind {
    if (this.golden.due) {
      return 'golden';
    }
    return this.danger.due ? 'danger' : 'normal';
  }

  /** Records what actually spawned (a special can fall back to normal). */
  record(kind: MeteorKind): void {
    if (kind === 'golden') {
      this.golden.restart();
    } else if (kind === 'danger') {
      this.danger.restart();
    } else {
      this.golden.countNormal();
      this.danger.countNormal();
    }
  }
}
