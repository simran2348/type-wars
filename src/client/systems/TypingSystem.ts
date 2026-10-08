/** What the typing system needs from a meteor; keeps it free of Phaser. */
export type TypingTarget = {
  readonly word: string;
  readonly typed: number;
  /** False once the meteor has been destroyed or has hit the ship. */
  readonly isTargetable: boolean;
  /** 0 when spawned, 1 when reaching the danger zone. */
  readonly danger: number;
  advance(): void;
  setTargeted(targeted: boolean): void;
};

export type TypingResult<T extends TypingTarget> =
  | { kind: 'hit'; target: T; completed: boolean }
  | { kind: 'miss'; target: T | null };

/**
 * Turns keystrokes into progress on one locked target at a time. With no
 * target, the most dangerous meteor starting with the typed letter is locked.
 */
export class TypingSystem<T extends TypingTarget> {
  private target: T | null = null;

  get current(): T | null {
    return this.target;
  }

  /** `char` must already be a single lowercase letter. */
  handleKey(char: string, candidates: readonly T[]): TypingResult<T> {
    const target = this.target ?? this.acquire(char, candidates);
    if (!target) {
      return { kind: 'miss', target: null };
    }
    if (target.word[target.typed] !== char) {
      return { kind: 'miss', target };
    }

    target.advance();
    const completed = target.typed >= target.word.length;
    if (completed) {
      this.release(target);
    }
    return { kind: 'hit', target, completed };
  }

  /** Drops the lock if `target` is the current one (e.g. it was removed). */
  release(target: T): void {
    if (this.target === target) {
      target.setTargeted(false);
      this.target = null;
    }
  }

  reset(): void {
    this.target?.setTargeted(false);
    this.target = null;
  }

  private acquire(char: string, candidates: readonly T[]): T | null {
    let best: T | null = null;
    for (const candidate of candidates) {
      if (
        candidate.isTargetable &&
        candidate.word[0] === char &&
        (!best || candidate.danger > best.danger)
      ) {
        best = candidate;
      }
    }
    if (best) {
      this.target = best;
      best.setTargeted(true);
    }
    return best;
  }
}
