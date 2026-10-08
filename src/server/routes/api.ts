import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import type {
  ErrorResponse,
  LeaderboardResponse,
  ResetScoresResponse,
  SubmitScoreResponse,
} from '../../shared/api';
import { isAdmin } from '../core/admin';
import {
  getLastScore,
  getLeaderboards,
  parseScore,
  recordLastScore,
  recordScore,
  resetScores,
} from '../core/leaderboard';

export const api = new Hono();

/** Both leaderboards plus the viewer's Reddit username. */
api.get('/leaderboard', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) ?? null;
    const [leaderboards, lastScore] = await Promise.all([
      getLeaderboards(),
      getLastScore(username),
    ]);
    return c.json<LeaderboardResponse>({
      username,
      isAdmin: isAdmin(username),
      lastScore,
      leaderboards,
    });
  } catch (error) {
    console.error('Leaderboard fetch failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not load leaderboards' },
      500
    );
  }
});

/**
 * Submits the finished run's score and returns both leaderboards.
 * Identity and timestamps come from the server, never from the client.
 */
api.post('/score', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Invalid JSON body' },
      400
    );
  }

  const score = parseScore(body);
  if (score === null) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Invalid score' },
      400
    );
  }

  try {
    const username = (await reddit.getCurrentUsername()) ?? null;
    const recorded = username !== null && score > 0;
    if (username !== null) {
      await recordLastScore(username, score);
    }
    if (recorded) {
      await recordScore(username, score);
    }

    return c.json<SubmitScoreResponse>({
      recorded,
      username,
      isAdmin: isAdmin(username),
      lastScore: username === null ? null : score,
      leaderboards: await getLeaderboards(),
    });
  } catch (error) {
    console.error('Score submission failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not save score' },
      500
    );
  }
});

/** Admin only: wipes every leaderboard. The caller's identity is re-checked here. */
api.post('/admin/reset-scores', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!isAdmin(username)) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Not allowed' },
      403
    );
  }
  try {
    await resetScores();
    console.log(`Leaderboards reset by u/${username}`);
    return c.json<ResetScoresResponse>({ status: 'ok' });
  } catch (error) {
    console.error('Score reset failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not reset scores' },
      500
    );
  }
});
