import { showToast } from '@devvit/web/client';
import { resetAllScores } from './api';

/** The reset button must be tapped twice within this window to fire. */
const CONFIRM_WINDOW_MS = 4000;
const RESET_LABEL = 'Reset all scores';

/**
 * Admin panel on the splash card. Only shown when the server says the viewer
 * is an admin; the reset endpoint re-checks that on every call.
 */
export const setupAdmin = (onReset: () => void): void => {
  const toggle = document.getElementById('admin-toggle');
  const panel = document.getElementById('admin-panel');
  const reset = document.getElementById('admin-reset');
  if (!toggle || !panel || !(reset instanceof HTMLButtonElement)) {
    return;
  }

  let armedUntil = 0;
  const disarm = () => {
    armedUntil = 0;
    reset.textContent = RESET_LABEL;
    reset.classList.remove('armed');
  };

  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    disarm();
  });

  reset.addEventListener('click', async () => {
    if (Date.now() > armedUntil) {
      armedUntil = Date.now() + CONFIRM_WINDOW_MS;
      reset.textContent = 'Tap again to confirm';
      reset.classList.add('armed');
      setTimeout(() => {
        if (Date.now() >= armedUntil) {
          disarm();
        }
      }, CONFIRM_WINDOW_MS);
      return;
    }

    reset.disabled = true;
    reset.textContent = 'Resetting…';
    try {
      await resetAllScores();
      showToast('All scores have been reset');
      panel.hidden = true;
      onReset();
    } catch (error) {
      console.error(error);
      showToast('Reset failed, please try again');
    } finally {
      reset.disabled = false;
      disarm();
    }
  });
};
