import { isTouchDevice } from '../view';

/**
 * On-screen QWERTY letter pad for touch devices, docked below the game during
 * play. It replaces the device keyboard: letters only, no autocorrect, and the
 * game canvas shrinks to sit above it instead of being covered.
 *
 * Taps are matched to the nearest key, so the gaps between keys and the pad's
 * edges never swallow a press. A preview bubble shows the letter above the
 * finger, and the next letter of the locked word glows as a hint.
 */

type CharHandler = (char: string) => void;

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const PRESSED_CLASS = 'pressed';
const HINT_CLASS = 'hint';
const PRESS_FLASH_MS = 110;
const HAPTIC_MS = 8;

class LetterKeyboard {
  private readonly element: HTMLElement | null;
  private readonly keys = new Map<string, HTMLElement>();
  private readonly preview = document.createElement('div');
  private readonly handlers = new Set<CharHandler>();
  private hinted: HTMLElement | null = null;
  private previewTimer = 0;

  constructor() {
    this.element = document.getElementById('letter-keyboard');
    if (!this.element) {
      return;
    }
    this.preview.className = 'key-preview';
    this.preview.setAttribute('aria-hidden', 'true');
    this.element.append(
      ...ROWS.map((letters) => this.buildRow(letters)),
      this.preview
    );
    // pointerdown fires immediately and per finger, so two-thumb typing works.
    this.element.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      const key = this.nearestKey(event.clientX, event.clientY);
      if (key) {
        this.press(key);
      }
    });
  }

  get enabled(): boolean {
    return this.element !== null && isTouchDevice();
  }

  show(): void {
    if (this.enabled && this.element) {
      this.element.hidden = false;
    }
  }

  hide(): void {
    this.setHint(null);
    if (this.element) {
      this.element.hidden = true;
    }
  }

  /** Highlights the key for `letter`, or clears the highlight with null. */
  setHint(letter: string | null): void {
    const key = letter === null ? null : (this.keys.get(letter) ?? null);
    if (key === this.hinted) {
      return;
    }
    this.hinted?.classList.remove(HINT_CLASS);
    key?.classList.add(HINT_CLASS);
    this.hinted = key;
  }

  /** Subscribes to tapped letters; returns an unsubscribe function. */
  onChar(handler: CharHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private buildRow(letters: string): HTMLElement {
    const row = document.createElement('div');
    row.className = 'keyboard-row';
    for (const letter of letters) {
      const key = document.createElement('button');
      key.type = 'button';
      key.className = 'key';
      key.textContent = letter;
      key.dataset.letter = letter;
      key.setAttribute('aria-label', letter);
      this.keys.set(letter, key);
      row.append(key);
    }
    return row;
  }

  /** The key closest to a touch point, measured to each key's edges. */
  private nearestKey(x: number, y: number): HTMLElement | null {
    let best: HTMLElement | null = null;
    let bestDistance = Infinity;
    for (const key of this.keys.values()) {
      const rect = key.getBoundingClientRect();
      const dx = Math.max(rect.left - x, 0, x - rect.right);
      const dy = Math.max(rect.top - y, 0, y - rect.bottom);
      const distance = dx * dx + dy * dy;
      if (distance < bestDistance) {
        best = key;
        bestDistance = distance;
      }
    }
    return best;
  }

  private press(key: HTMLElement): void {
    const letter = key.dataset.letter;
    if (!letter) {
      return;
    }
    key.classList.add(PRESSED_CLASS);
    setTimeout(() => key.classList.remove(PRESSED_CLASS), PRESS_FLASH_MS);
    this.showPreview(key, letter);
    navigator.vibrate?.(HAPTIC_MS);
    this.handlers.forEach((handler) => handler(letter));
  }

  /** Pops the letter up above the finger so it is visible while pressed. */
  private showPreview(key: HTMLElement, letter: string): void {
    if (!this.element) {
      return;
    }
    const pad = this.element.getBoundingClientRect();
    const rect = key.getBoundingClientRect();
    this.preview.textContent = letter;
    this.preview.style.left = `${rect.left - pad.left + rect.width / 2}px`;
    this.preview.style.top = `${rect.top - pad.top}px`;
    this.preview.classList.add('visible');
    clearTimeout(this.previewTimer);
    this.previewTimer = window.setTimeout(
      () => this.preview.classList.remove('visible'),
      PRESS_FLASH_MS * 2
    );
  }
}

export const letterKeyboard = new LetterKeyboard();
