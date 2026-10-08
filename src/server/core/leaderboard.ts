import { redis } from '@devvit/web/server';
import {
  LEADERBOARD_SIZE,
  MAX_SCORE,
  type LeaderboardEntry,
  type Leaderboards,
} from '../../shared/api';

/**
 * Every key is namespaced to this app: generic names like `leaderboard:*`
 * already existed with another data type in the playtest subreddit's Redis and
 * made every sorted-set call fail with WRONGTYPE.
 */
const KEY_PREFIX = 'type-wars:scores';
const ALL_TIME_KEY = `${KEY_PREFIX}:all-time`;
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 3;

/** Daily boundaries are UTC, derived from server time only. */
const dailyKey = (now: Date): string =>
  `${KEY_PREFIX}:daily:${now.toISOString().slice(0, 10)}`;

/** Per-board hash of username -> ISO timestamp of their best score. */
const timestampsKey = (boardKey: string): string => `${boardKey}:recorded-at`;

/**
 * True when the key is a sorted set or doesn't exist yet. Anything else is
 * logged and skipped, so one bad key can't take down every leaderboard.
 */
const isBoard = async (key: string): Promise<boolean> => {
  const type = await redis.type(key);
  if (type === 'zset' || type === 'none') {
    return true;
  }
  console.error(`Leaderboard key "${key}" holds a ${type}, expected a zset`);
  return false;
};

export const parseScore = (body: unknown): number | null => {
  if (typeof body !== 'object' || body === null || !('score' in body)) {
    return null;
  }
  const { score } = body;
  if (
    typeof score !== 'number' ||
    !Number.isSafeInteger(score) ||
    score < 0 ||
    score > MAX_SCORE
  ) {
    return null;
  }
  return score;
};

/**
 * Records a player's score on one board, keeping only their personal best,
 * then trims the board to the top entries.
 */
const recordOnBoard = async (
  key: string,
  username: string,
  score: number,
  now: Date
): Promise<void> => {
  if (!(await isBoard(key))) {
    return;
  }
  const previous = await redis.zScore(key, username);
  if (previous !== undefined && previous >= score) {
    return;
  }

  await redis.zAdd(key, { member: username, score });
  await redis.hSet(timestampsKey(key), { [username]: now.toISOString() });

  // Ranks are ascending, so the lowest `excess` entries fall off the board.
  const excess = (await redis.zCard(key)) - LEADERBOARD_SIZE;
  if (excess > 0) {
    const dropped = await redis.zRange(key, 0, excess - 1, { by: 'rank' });
    await redis.zRemRangeByRank(key, 0, excess - 1);
    await redis.hDel(
      timestampsKey(key),
      dropped.map((entry) => entry.member)
    );
  }
};

export const recordScore = async (
  username: string,
  score: number
): Promise<void> => {
  const now = new Date();
  const today = dailyKey(now);

  await Promise.all([
    recordOnBoard(ALL_TIME_KEY, username, score, now),
    recordOnBoard(today, username, score, now),
  ]);
  await Promise.all([
    redis.expire(today, DAILY_TTL_SECONDS),
    redis.expire(timestampsKey(today), DAILY_TTL_SECONDS),
  ]);
};

const topEntries = async (key: string): Promise<LeaderboardEntry[]> => {
  if (!(await isBoard(key))) {
    return [];
  }
  const rows = await redis.zRange(key, 0, LEADERBOARD_SIZE - 1, {
    by: 'rank',
    reverse: true,
  });
  return rows.map(({ member, score }) => ({ username: member, score }));
};

export const getLeaderboards = async (): Promise<Leaderboards> => {
  const [today, allTime] = await Promise.all([
    topEntries(dailyKey(new Date())),
    topEntries(ALL_TIME_KEY),
  ]);
  return { today, allTime };
};
