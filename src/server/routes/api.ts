import { Hono } from 'hono';
import { reddit } from '@devvit/web/server';
import type {
  ErrorResponse,
  LeaderboardResponse,
  SubmitScoreResponse,
} from '../../shared/api';
import { getLeaderboards, parseScore, recordScore } from '../core/leaderboard';

export const api = new Hono();

/** Both leaderboards plus the viewer's Reddit username. */
api.get('/leaderboard', async (c) => {
  try {
    const [username, leaderboards] = await Promise.all([
      reddit.getCurrentUsername(),
      getLeaderboards(),
    ]);
    return c.json<LeaderboardResponse>({
      username: username ?? null,
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
    if (recorded) {
      await recordScore(username, score);
    }

    return c.json<SubmitScoreResponse>({
      recorded,
      username,
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
