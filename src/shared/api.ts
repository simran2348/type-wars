export const LEADERBOARD_SIZE = 10;

/** Upper bound for a single run; anything above is rejected as implausible. */
export const MAX_SCORE = 200_000;

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
};

export type LeaderboardResponse = {
  /** The authenticated player's Reddit username, so the UI can highlight their rows. */
  username: string | null;
  /** Whether the viewer may use admin actions; the server re-checks every call. */
  isAdmin: boolean;
  leaderboards: Leaderboards;
};

export type ResetScoresResponse = {
  status: 'ok';
};

export type SubmitScoreResponse = LeaderboardResponse & {
  /** False when the score was not recorded (e.g. logged-out viewer). */
  recorded: boolean;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
