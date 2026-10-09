import { createTelemetryClient } from '@devvit/analytics/client/reddit';

/**
 * Devvit Journeys telemetry for the developer dashboard (Analytics tab).
 *
 * One run of the game is one journey:
 * - App.Ready: the game finished loading and the menu is interactive.
 * - Journey.Start: the player pressed PLAY or PLAY AGAIN.
 * - Journey.Progress: meteor milestones (10, 25, 50, 75, 100 destroyed).
 * - Journey.Interaction: golden/danger meteor destroyed, life lost, sound toggled.
 * - Journey.End: game over, ended server-side with the validated score
 *   (see /api/score); or `complete: false` if the player leaves mid-run.
 *
 * Telemetry is best-effort: every call swallows its own errors so analytics
 * can never break the game. No user-identifying data is sent.
 */

/** keepalive lets the abandon event finish while the page is unloading. */
const telemetry = createTelemetryClient({
  fetch: (input, init) => fetch(input, { ...init, keepalive: true }),
});

/** Meteors destroyed that count as journey progress; the last one is 1.0. */
const MILESTONES = [10, 25, 50, 75, 100];
const FINAL_MILESTONE = MILESTONES[MILESTONES.length - 1] ?? 1;

export type RunInteraction =
  'golden_destroyed' | 'danger_destroyed' | 'life_lost' | 'sound_toggled';

type Receipted = { receipt: { status: string; message: string } };

let appReadySent = false;
let runActive = false;
let lastScore = 0;
/** Only the first non-recorded receipt is logged, to keep the console quiet. */
let reportedReceipt = false;

const send = (call: () => Promise<Receipted>): void => {
  call()
    .then(({ receipt }) => {
      if (receipt.status !== 'JOURNEY_RECEIPT_VALID' && !reportedReceipt) {
        reportedReceipt = true;
        console.info(`[journeys] ${receipt.status}: ${receipt.message}`);
      }
    })
    .catch((error: unknown) => console.warn('[journeys] failed', error));
};

/** Progress and interactions would auto-start a journey; only send mid-run. */
const inRun = (): boolean =>
  runActive && telemetry.getActiveJourneyId() !== undefined;

export const appReady = (): void => {
  if (!appReadySent) {
    appReadySent = true;
    send(() => telemetry.appReady());
  }
};

/** A new run began from an explicit PLAY / PLAY AGAIN. */
export const startRun = (): void => {
  // A journey left over from an earlier run is closed before a fresh one.
  if (telemetry.getActiveJourneyId() !== undefined) {
    telemetry.clearJourneyId();
  }
  runActive = true;
  lastScore = 0;
  send(() => telemetry.startJourney());
};

export const trackScore = (score: number): void => {
  lastScore = score;
};

export const trackDestroyed = (destroyed: number): void => {
  if (inRun() && MILESTONES.includes(destroyed)) {
    send(() =>
      telemetry.progress({
        progress: Math.min(1, destroyed / FINAL_MILESTONE),
        action: 'meteors_destroyed',
        actionDetails: String(destroyed),
      })
    );
  }
};

export const trackInteraction = (
  action: RunInteraction,
  actionDetails?: string
): void => {
  if (inRun()) {
    send(() =>
      telemetry.interaction({
        action,
        ...(actionDetails !== undefined ? { actionDetails } : {}),
      })
    );
  }
};

/**
 * Game over: the server ends the journey when the score is submitted. Returns
 * the header that carries the journey id, then forgets the id locally.
 */
export const finishRun = (): Record<string, string> => {
  const journeyId = runActive ? telemetry.getActiveJourneyId() : undefined;
  runActive = false;
  telemetry.clearJourneyId();
  return journeyId ? { 'x-devvit-journey-id': journeyId } : {};
};

/** The player left mid-run (closed the game or navigated away). */
const abandonRun = (): void => {
  if (!inRun()) {
    return;
  }
  runActive = false;
  send(() =>
    telemetry.endJourney({
      complete: false,
      game: { win: false, score: lastScore },
    })
  );
};

window.addEventListener('pagehide', abandonRun);
