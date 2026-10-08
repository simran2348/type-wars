export const LEADERBOARD_SIZE = 10;

/** Upper bound for a single run; anything above is rejected as implausible. */
export const MAX_SCORE = 2_000_000;

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

export type SubmitScoreResponse = {
  /** False when the score was not recorded (e.g. logged-out viewer). */
  recorded: boolean;
  /** The authenticated player's name, so the UI can highlight their rows. */
  username: string | null;
  leaderboards: Leaderboards;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
