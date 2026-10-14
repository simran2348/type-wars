export const LEADERBOARD_SIZE = 10;

/** Upper bound for a single run; anything above is rejected as implausible. */
export const MAX_SCORE = 200_000;

/**
 * Levels differ in which meteor types appear. Each one has its own all-time
 * leaderboard and its own "last score" per player.
 */
export const GAME_MODES = ['easy', 'medium', 'hard', 'ranked'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export type LeaderboardEntry = {
  username: string;
  score: number;
};

export type SubmitScoreRequest = {
  score: number;
  mode: GameMode;
};

export type LeaderboardResponse = {
  /** The authenticated player's Reddit username, so the UI can highlight their rows. */
  username: string | null;
  /** Whether the viewer may use admin actions; the server re-checks every call. */
  isAdmin: boolean;
  /** The viewer's most recent score on this level; null if logged out or never played it. */
  lastScore: number | null;
  /** This level's all-time top scores, best first. */
  leaderboard: LeaderboardEntry[];
};

export type ResetScoresResponse = {
  status: 'ok';
};

export type SubmitScoreResponse = LeaderboardResponse & {
  /** True when the score counted for its level's leaderboard: logged in, above zero. */
  recorded: boolean;
  /** True when the player may post this run's score as a comment. */
  canComment: boolean;
};

export type CommentScoreResponse = {
  status: 'ok';
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
