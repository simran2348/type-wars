import { Hono } from 'hono';
import type { Context } from 'hono';
import { telemetry } from '@devvit/analytics/server/reddit';

/**
 * Devvit Journeys endpoints for `@devvit/analytics/client/reddit`, mounted at
 * /api/telemetry. The package ships an Express router; this is the Hono
 * equivalent, with the same paths and payload rules.
 */
export const journeys = new Hono();

/** Journey ids are short opaque tokens; anything else is rejected. */
const MAX_ID_LENGTH = 128;
const MAX_LABEL_LENGTH = 64;

const INVALID_RECEIPT = {
  status: 'JOURNEY_RECEIPT_INVALID',
  message: 'Invalid: Event payload was not recorded.',
} as const;

const UNSPECIFIED_RECEIPT = {
  status: 'JOURNEY_RECEIPT_UNSPECIFIED',
  message: 'Unknown: Telemetry recording status could not be confirmed.',
} as const;

type Body = Record<string, unknown>;

const isRecord = (value: unknown): value is Body =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isText = (value: unknown, max: number): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

/** Validates a journey id taken from a request header or body. */
export const parseJourneyId = (value: unknown): string | null =>
  isText(value, MAX_ID_LENGTH) ? value : null;

const readBody = async (c: Context): Promise<Body | null> => {
  try {
    const body: unknown = await c.req.json();
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
};

const badRequest = (c: Context, error: string) =>
  c.json({ error, receipt: INVALID_RECEIPT }, 400);

const serverError = (c: Context, error: unknown) => {
  console.error('Journey telemetry failed:', error);
  return c.json(
    { error: 'Internal server error', receipt: UNSPECIFIED_RECEIPT },
    500
  );
};

/** Optional label field: absent, or a short non-empty string. */
const optionalLabel = (body: Body, key: string): string | null | undefined => {
  const value = body[key];
  if (value === undefined) {
    return undefined;
  }
  return isText(value, MAX_LABEL_LENGTH) ? value : null;
};

journeys.post('/journey/app-ready', async (c) => {
  try {
    return c.json(await telemetry.appReady());
  } catch (error) {
    return serverError(c, error);
  }
});

journeys.post('/journey/start', async (c) => {
  try {
    const response = await telemetry.startJourney();
    if (!response.journeyId) {
      return serverError(c, new Error('Telemetry journey id missing'));
    }
    return c.json(response);
  } catch (error) {
    return serverError(c, error);
  }
});

journeys.post('/journey/progress', async (c) => {
  const body = await readBody(c);
  if (!body) {
    return badRequest(c, 'Expected a JSON object body.');
  }
  const journeyId = parseJourneyId(body.journeyId);
  const { progress } = body;
  const action = optionalLabel(body, 'action');
  const actionDetails = optionalLabel(body, 'actionDetails');
  if (!journeyId) {
    return badRequest(c, 'journeyId is required.');
  }
  if (
    typeof progress !== 'number' ||
    !Number.isFinite(progress) ||
    progress < 0 ||
    progress > 1
  ) {
    return badRequest(c, 'progress must be a number between 0 and 1.');
  }
  if (action === null || actionDetails === null) {
    return badRequest(c, 'action and actionDetails must be short strings.');
  }
  try {
    return c.json(
      await telemetry.journeyProgress({
        journeyId,
        progress,
        ...(action !== undefined ? { action } : {}),
        ...(actionDetails !== undefined ? { actionDetails } : {}),
      })
    );
  } catch (error) {
    return serverError(c, error);
  }
});

journeys.post('/journey/interaction', async (c) => {
  const body = await readBody(c);
  if (!body) {
    return badRequest(c, 'Expected a JSON object body.');
  }
  const journeyId =
    body.journeyId === undefined ? '' : parseJourneyId(body.journeyId);
  const action = optionalLabel(body, 'action');
  const actionDetails = optionalLabel(body, 'actionDetails');
  if (journeyId === null) {
    return badRequest(c, 'journeyId must be a string.');
  }
  if (!action) {
    return badRequest(c, 'action is required.');
  }
  if (actionDetails === null) {
    return badRequest(c, 'actionDetails must be a short string.');
  }
  try {
    return c.json(
      await telemetry.journeyInteraction({
        journeyId,
        action,
        actionDetails: actionDetails ?? '',
      })
    );
  } catch (error) {
    return serverError(c, error);
  }
});

journeys.post('/journey/end', async (c) => {
  const body = await readBody(c);
  if (!body) {
    return badRequest(c, 'Expected a JSON object body.');
  }
  const journeyId = parseJourneyId(body.journeyId);
  const { complete, game } = body;
  if (!journeyId) {
    return badRequest(c, 'journeyId is required.');
  }
  if (complete !== undefined && typeof complete !== 'boolean') {
    return badRequest(c, 'complete must be a boolean.');
  }
  if (game !== undefined && !isRecord(game)) {
    return badRequest(c, 'game must be an object.');
  }
  try {
    return c.json(
      await telemetry.endJourney({
        journeyId,
        complete: complete ?? false,
        ...(game
          ? {
              game: {
                win: game.win === true,
                score:
                  typeof game.score === 'number' && Number.isFinite(game.score)
                    ? game.score
                    : 0,
              },
            }
          : {}),
      })
    );
  } catch (error) {
    return serverError(c, error);
  }
});
