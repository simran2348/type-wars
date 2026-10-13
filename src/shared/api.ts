export const LEADERBOARD_SIZE = 10;

/** Upper bound for a single run; anything above is rejected as implausible. */
export const MAX_SCORE = 200_000;

/**
 * Levels. Easy, medium and hard are practice levels that differ in which
 * meteor types appear; only ranked runs go on the leaderboards.
 */
export const GAME_MODES = ['easy', 'medium', 'hard', 'ranked'] as const;
export type GameMode = (typeof GAME_MODES)[number];

export type LeaderboardEntry = {
  username: string;
  score: number;
};

export type Leaderboards = {
  today: LeaderboardEntry[];
  allTime: LeaderboardEntry[];
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
  /** The viewer's most recent score, or null if logged out or never played. */
  lastScore: number | null;
  leaderboards: Leaderboards;
};

export type ResetScoresResponse = {
  status: 'ok';
};

export type SubmitScoreResponse = LeaderboardResponse & {
  /** True when the score went on the leaderboards: ranked, logged in, above zero. */
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
