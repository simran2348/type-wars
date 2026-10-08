/**
 * Touch devices only show their on-screen keyboard while a text field is
 * focused, and their key events are unreliable (Android often reports
 * "Unidentified"). On those devices typing goes through an invisible input
 * instead: letters are read from what the field receives, then it is cleared.
 *
 * Many mobile browsers (notably iOS inside Reddit's embedded frame) ignore
 * focus() calls from script, so during play the invisible field is stretched
 * over the game: tapping the screen then focuses it natively, which always
 * opens the keyboard.
 */

import { isTouchDevice } from '../view';

type CharHandler = (char: string) => void;

const ELEMENT_ID = 'touch-keyboard';
const ACTIVE_CLASS = 'active';

class TouchKeyboard {
  private readonly element: HTMLInputElement | null;
  private readonly handlers = new Set<CharHandler>();
  private lastValue = '';
  private composing = false;

  constructor() {
    const element = document.getElementById(ELEMENT_ID);
    this.element = element instanceof HTMLInputElement ? element : null;
    if (!this.element) {
      return;
    }
    this.element.addEventListener('input', () => this.onInput());
    this.element.addEventListener('compositionstart', () => {
      this.composing = true;
    });
    this.element.addEventListener('compositionend', () => {
      this.composing = false;
      this.onInput();
    });
  }

  get enabled(): boolean {
    return this.element !== null && isTouchDevice();
  }

  /** Whether the hidden field has focus, i.e. the on-screen keyboard is up. */
  get isOpen(): boolean {
    return this.element !== null && document.activeElement === this.element;
  }

  /** True when key events come from the hidden field and must be ignored elsewhere. */
  owns(target: EventTarget | null): boolean {
    return target !== null && target === this.element;
  }

  /**
   * Tries to open the on-screen keyboard. Must be called from inside a tap
   * handler; some browsers refuse anyway, which `setActive` covers.
   */
  open(): void {
    window.focus();
    if (this.enabled && this.element) {
      this.reset();
      this.element.focus({ preventScroll: true });
    }
  }

  /** While active, the field covers the play area so any tap focuses it. */
  setActive(active: boolean): void {
    this.element?.classList.toggle(ACTIVE_CLASS, active && this.enabled);
    if (!active) {
      this.element?.blur();
    }
  }

  /** Subscribes to typed characters; returns an unsubscribe function. */
  onChar(handler: CharHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  private onInput(): void {
    if (!this.element) {
      return;
    }
    const value = this.element.value;
    // Only newly appended characters count; deletions are ignored.
    if (value.startsWith(this.lastValue)) {
      for (const char of value.slice(this.lastValue.length)) {
        this.handlers.forEach((handler) => handler(char));
      }
    }
    this.lastValue = value;
    // Clearing mid-composition confuses predictive keyboards, so wait for it to end.
    if (!this.composing) {
      this.reset();
    }
  }

  private reset(): void {
    if (this.element) {
      this.element.value = '';
    }
    this.lastValue = '';
  }
}

export const touchKeyboard = new TouchKeyboard();
