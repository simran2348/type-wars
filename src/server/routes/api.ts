import { Hono } from 'hono';
import { context, reddit } from '@devvit/web/server';
import { telemetry } from '@devvit/analytics/server/reddit';
import type {
  CommentScoreResponse,
  ErrorResponse,
  GameMode,
  LeaderboardResponse,
  ResetScoresResponse,
  SubmitScoreResponse,
} from '../../shared/api';
import { isAdmin } from '../core/admin';
import {
  getLastScore,
  getLeaderboard,
  parseMode,
  parseModeQuery,
  parseScore,
  recordLastScore,
  recordScore,
  resetScores,
  setPendingComment,
  takePendingComment,
} from '../core/leaderboard';
import { journeys, parseJourneyId } from './journeys';

export const api = new Hono();

api.route('/telemetry', journeys);

/** How each level is named in a score comment. */
const MODE_LABELS: Record<GameMode, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  ranked: 'Ranked',
};

/** Header the client uses to pass its active Devvit Journeys id. */
const JOURNEY_HEADER = 'x-devvit-journey-id';

/**
 * Ends the run's journey with the server-validated score. A "win" is a new
 * all-time personal best on that level. Analytics never block or fail score submission.
 */
const endRunJourney = async (
  journeyId: string | null,
  score: number,
  personalBest: boolean
): Promise<void> => {
  if (!journeyId) {
    return;
  }
  try {
    const { receipt } = await telemetry.endJourney({
      journeyId,
      complete: true,
      game: { win: personalBest, score },
    });
    if (receipt.status !== 'JOURNEY_RECEIPT_VALID') {
      console.log(`Journey end not recorded: ${receipt.message}`);
    }
  } catch (error) {
    console.error('Journey end failed:', error);
  }
};

/** One level's leaderboard (`?mode=`, ranked by default), plus the viewer's username and last score on it. */
api.get('/leaderboard', async (c) => {
  const mode = parseModeQuery(c.req.query('mode'));
  if (mode === null) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Unknown level' },
      400
    );
  }
  try {
    const username = (await reddit.getCurrentUsername()) ?? null;
    const [leaderboard, lastScore] = await Promise.all([
      getLeaderboard(mode),
      getLastScore(username, mode),
    ]);
    return c.json<LeaderboardResponse>({
      username,
      isAdmin: isAdmin(username),
      lastScore,
      leaderboard,
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
 * Submits the finished run's score and returns its level's leaderboard.
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
  const mode = parseMode(body);
  if (score === null || mode === null) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Invalid score' },
      400
    );
  }

  try {
    const username = (await reddit.getCurrentUsername()) ?? null;
    // Every level has its own leaderboard.
    const recorded = username !== null && score > 0;
    const canComment =
      username !== null && score > 0 && context.postId !== undefined;
    if (username !== null) {
      await recordLastScore(username, { score, mode });
      await setPendingComment(username, canComment ? { score, mode } : null);
    }
    const personalBest = recorded && (await recordScore(username, score, mode));
    await endRunJourney(
      parseJourneyId(c.req.header(JOURNEY_HEADER)),
      score,
      personalBest
    );

    return c.json<SubmitScoreResponse>({
      recorded,
      canComment,
      username,
      isAdmin: isAdmin(username),
      lastScore: username === null ? null : score,
      leaderboard: await getLeaderboard(mode),
    });
  } catch (error) {
    console.error('Score submission failed:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not save score' },
      500
    );
  }
});

/**
 * Posts the player's just-finished score as a comment on this post, from
 * their own account. Only ever called from an explicit button press. The
 * score comes from the server's record of the run, never from the request.
 */
api.post('/score/comment', async (c) => {
  const { postId } = context;
  const username = (await reddit.getCurrentUsername()) ?? null;
  if (username === null || postId === undefined) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Log in to Reddit to comment' },
      401
    );
  }

  const run = await takePendingComment(username);
  if (run === null) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'No score to share' },
      409
    );
  }

  try {
    await reddit.submitComment({
      id: postId,
      text: `🚀 Scored **${run.score.toLocaleString('en-US')}** in Type Wars (${MODE_LABELS[run.mode]}). Can you beat it?`,
      runAs: 'USER',
    });
    return c.json<CommentScoreResponse>({ status: 'ok' });
  } catch (error) {
    console.error('Score comment failed:', error);
    // Give the player another try.
    await setPendingComment(username, run);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Could not post comment' },
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
