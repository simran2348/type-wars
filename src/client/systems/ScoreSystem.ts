/** Combo tiers: 5 in a row doubles points, 10 triples, 20 quadruples. */
export const multiplierFor = (combo: number): number =>
  combo >= 20 ? 4 : combo >= 10 ? 3 : combo >= 5 ? 2 : 1;

export const pointsFor = (word: string, combo: number): number =>
  word.length * 10 * multiplierFor(combo);

export type RunSummary = {
  score: number;
  destroyed: number;
  accuracy: number;
  bestCombo: number;
};

export class ScoreSystem {
  score = 0;
  combo = 0;
  bestCombo = 0;
  destroyed = 0;
  private correctKeys = 0;
  private wrongKeys = 0;

  get multiplier(): number {
    return multiplierFor(this.combo);
  }

  /** Percentage of keystrokes that were correct, 0-100. */
  get accuracy(): number {
    const total = this.correctKeys + this.wrongKeys;
    return total === 0 ? 100 : Math.round((this.correctKeys / total) * 100);
  }

  registerCorrectKey(): void {
    this.correctKeys += 1;
  }

  /** A typo halves the combo: a penalty, but not a full reset. */
  registerMistake(): void {
    this.wrongKeys += 1;
    this.combo = Math.floor(this.combo / 2);
  }

  /** Returns the points awarded for the destroyed meteor. */
  registerDestroyed(word: string): number {
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    this.destroyed += 1;
    const points = pointsFor(word, this.combo);
    this.score += points;
    return points;
  }

  breakCombo(): void {
    this.combo = 0;
  }

  summary(): RunSummary {
    return {
      score: this.score,
      destroyed: this.destroyed,
      accuracy: this.accuracy,
      bestCombo: this.bestCombo,
    };
  }
}
