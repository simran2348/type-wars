import { isTouchDevice } from '../view';

/**
 * On-screen QWERTY letter pad for touch devices, docked below the game during
 * play. It replaces the device keyboard: letters only, no autocorrect, and the
 * game canvas shrinks to sit above it instead of being covered.
 */

type CharHandler = (char: string) => void;

const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const PRESSED_CLASS = 'pressed';
const PRESS_FLASH_MS = 90;
const HAPTIC_MS = 8;

class LetterKeyboard {
  private readonly element: HTMLElement | null;
  private readonly handlers = new Set<CharHandler>();

  constructor() {
    this.element = document.getElementById('letter-keyboard');
    this.element?.append(...ROWS.map((letters) => this.buildRow(letters)));
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
    if (this.element) {
      this.element.hidden = true;
    }
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
      key.setAttribute('aria-label', letter);
      // pointerdown fires immediately and per finger, so two-thumb typing works.
      key.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        this.press(key, letter);
      });
      row.append(key);
    }
    return row;
  }

  private press(key: HTMLElement, letter: string): void {
    key.classList.add(PRESSED_CLASS);
    setTimeout(() => key.classList.remove(PRESSED_CLASS), PRESS_FLASH_MS);
    navigator.vibrate?.(HAPTIC_MS);
    this.handlers.forEach((handler) => handler(letter));
  }
}

export const letterKeyboard = new LetterKeyboard();
