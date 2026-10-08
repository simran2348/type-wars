import { WORDS, WORD_TIERS, type WordTier } from '../data/words';

export type TierWeights = Record<WordTier, number>;

/** Returns a float in [0, 1). */
export type RandomSource = () => number;

/**
 * Chooses meteor words for the current difficulty.
 *
 * The random source is injectable so a future Daily Challenge can pass a
 * date-seeded generator and give every player the same word sequence.
 */
export class WordPicker {
  constructor(private readonly random: RandomSource = Math.random) {}

  /**
   * Picks a word that is not already on screen. Words whose first letter is
   * already taken are avoided when possible, so the first keystroke always
   * identifies a single meteor.
   */
  pick(weights: TierWeights, activeWords: ReadonlySet<string>): string {
    const preferred = this.rollTier(weights);
    const tiers = [preferred, ...WORD_TIERS.filter((t) => t !== preferred)];

    for (const avoidInitials of [true, false]) {
      for (const tier of tiers) {
        const word = this.pickIn(tier, activeWords, avoidInitials);
        if (word) {
          return word;
        }
      }
    }
    throw new Error('Word bank exhausted');
  }

  /** A word strictly from one tier, or null if every one is on screen. */
  pickFromTier(
    tier: WordTier,
    activeWords: ReadonlySet<string>
  ): string | null {
    return (
      this.pickIn(tier, activeWords, true) ??
      this.pickIn(tier, activeWords, false)
    );
  }

  private pickIn(
    tier: WordTier,
    activeWords: ReadonlySet<string>,
    avoidInitials: boolean
  ): string | null {
    const usedInitials = new Set([...activeWords].map((word) => word[0]));
    const candidates = WORDS[tier].filter(
      (word) =>
        !activeWords.has(word) && !(avoidInitials && usedInitials.has(word[0]))
    );
    return candidates[Math.floor(this.random() * candidates.length)] ?? null;
  }

  private rollTier(weights: TierWeights): WordTier {
    const total = WORD_TIERS.reduce((sum, tier) => sum + weights[tier], 0);
    let roll = this.random() * total;
    for (const tier of WORD_TIERS) {
      roll -= weights[tier];
      if (roll < 0) {
        return tier;
      }
    }
    return 'easy';
  }
}
