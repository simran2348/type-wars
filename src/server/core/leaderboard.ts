import { redis } from '@devvit/web/server';
import {
  GAME_MODES,
  LEADERBOARD_SIZE,
  MAX_SCORE,
  type GameMode,
  type LeaderboardEntry,
} from '../../shared/api';

/**
 * Every key is namespaced to this app: generic names like `leaderboard:*`
 * already existed with another data type in the playtest subreddit's Redis and
 * made every sorted-set call fail with WRONGTYPE.
 */
const KEY_PREFIX = 'type-wars:scores';
const DAILY_TTL_SECONDS = 60 * 60 * 24 * 3;

/**
 * Every level has its own all-time board. Ranked keeps the original key
 * names, so scores saved before levels existed stay on the ranked board.
 */
const boardPrefix = (mode: GameMode): string =>
  mode === 'ranked' ? KEY_PREFIX : `${KEY_PREFIX}:${mode}`;

const allTimeKey = (mode: GameMode): string => `${boardPrefix(mode)}:all-time`;

/**
 * Daily boards are no longer written or shown; the key is kept only so a
 * reset can clear the ones still waiting to expire.
 */
const dailyKey = (mode: GameMode, now: Date): string =>
  `${boardPrefix(mode)}:daily:${now.toISOString().slice(0, 10)}`;

/** Per-level hash of username -> score of their most recent game on that level. */
const lastScoreKey = (mode: GameMode): string => `${KEY_PREFIX}:last:${mode}`;

/**
 * Older single hash of username -> `score:mode` for their most recent game on
 * any level. Still read as a fallback so nobody's last score disappears.
 */
const LEGACY_LAST_SCORE_KEY = `${KEY_PREFIX}:last`;

/** Hash of username -> finished-run score they may still post as a comment. */
const COMMENT_PENDING_KEY = `${KEY_PREFIX}:comment-pending`;

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
const isGameMode = (value: unknown): value is GameMode =>
  GAME_MODES.some((mode) => mode === value);

/** The run's level. Clients from before levels existed send none: ranked. */
export const parseMode = (body: unknown): GameMode | null => {
  if (typeof body !== 'object' || body === null || !('mode' in body)) {
    return 'ranked';
  }
  return isGameMode(body.mode) ? body.mode : null;
};

/** The level named in a `?mode=` query; none means ranked, unknown is null. */
export const parseModeQuery = (value: string | undefined): GameMode | null =>
  value === undefined ? 'ranked' : isGameMode(value) ? value : null;

const recordOnBoard = async (
  key: string,
  username: string,
  score: number,
  now: Date
): Promise<boolean> => {
  if (!(await isBoard(key))) {
    return false;
  }
  const previous = await redis.zScore(key, username);
  if (previous !== undefined && previous >= score) {
    return false;
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
  return true;
};

/**
 * Records a run on its level's board; resolves true if it is a new personal
 * best on that level.
 */
export const recordScore = (
  username: string,
  score: number,
  mode: GameMode
): Promise<boolean> =>
  recordOnBoard(allTimeKey(mode), username, score, new Date());

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

export type FinishedRun = { score: number; mode: GameMode };

/** Runs are stored as `score:mode`; values from before levels hold only a score. */
const encodeRun = ({ score, mode }: FinishedRun): string => `${score}:${mode}`;

const decodeRun = (value: string): FinishedRun => {
  const [score, mode] = value.split(':');
  return { score: Number(score), mode: isGameMode(mode) ? mode : 'ranked' };
};

/** Remembers a player's most recent run on its level, whether or not it's a best. */
export const recordLastScore = async (
  username: string,
  { score, mode }: FinishedRun
): Promise<void> => {
  await redis.hSet(lastScoreKey(mode), { [username]: String(score) });
};

/** The player's most recent score on one level, or null if they never played it. */
export const getLastScore = async (
  username: string | null,
  mode: GameMode
): Promise<number | null> => {
  if (username === null) {
    return null;
  }
  const value = await redis.hGet(lastScoreKey(mode), username);
  if (value !== undefined) {
    return Number(value);
  }
  const legacy = await redis.hGet(LEGACY_LAST_SCORE_KEY, username);
  if (legacy === undefined) {
    return null;
  }
  const run = decodeRun(legacy);
  return run.mode === mode ? run.score : null;
};

/**
 * Marks the run just finished as commentable (or clears the mark with null),
 * so each run can be shared at most once and only with its real score.
 */
export const setPendingComment = async (
  username: string,
  run: FinishedRun | null
): Promise<void> => {
  if (run === null) {
    await redis.hDel(COMMENT_PENDING_KEY, [username]);
  } else {
    await redis.hSet(COMMENT_PENDING_KEY, { [username]: encodeRun(run) });
  }
};

/** Claims the player's commentable score, or null if there is none left. */
export const takePendingComment = async (
  username: string
): Promise<FinishedRun | null> => {
  const value = await redis.hGet(COMMENT_PENDING_KEY, username);
  if (value === undefined) {
    return null;
  }
  await redis.hDel(COMMENT_PENDING_KEY, [username]);
  return decodeRun(value);
};

/**
 * Deletes every level's leaderboard and last scores, plus any old daily
 * boards that have not expired yet.
 */
export const resetScores = async (): Promise<void> => {
  const now = Date.now();
  const days = Math.ceil(DAILY_TTL_SECONDS / (60 * 60 * 24));
  const boards: string[] = [];
  for (const mode of GAME_MODES) {
    boards.push(allTimeKey(mode));
    for (let back = -1; back <= days; back++) {
      boards.push(dailyKey(mode, new Date(now - back * 24 * 60 * 60 * 1000)));
    }
  }
  await redis.del(
    LEGACY_LAST_SCORE_KEY,
    ...GAME_MODES.map(lastScoreKey),
    COMMENT_PENDING_KEY,
    ...boards.flatMap((key) => [key, timestampsKey(key)])
  );
};

/** One level's all-time top scores, best first. */
export const getLeaderboard = (mode: GameMode): Promise<LeaderboardEntry[]> =>
  topEntries(allTimeKey(mode));
