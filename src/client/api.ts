import type {
  CommentScoreResponse,
  GameMode,
  LeaderboardResponse,
  ResetScoresResponse,
  SubmitScoreRequest,
  SubmitScoreResponse,
} from '../shared/api';

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(path, init);
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status}`);
  }
  const data: T = await response.json();
  return data;
};

/**
 * Submits the final score; the server responds with that level's leaderboard.
 * `headers` carries the run's analytics journey id, if any.
 */
export const submitScore = (
  score: number,
  mode: GameMode,
  headers: Record<string, string> = {}
): Promise<SubmitScoreResponse> => {
  const body: SubmitScoreRequest = { score, mode };
  return request('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
};

/** One level's all-time leaderboard and the viewer's last score on it. */
export const fetchLeaderboards = (
  mode: GameMode = 'ranked'
): Promise<LeaderboardResponse> => request(`/api/leaderboard?mode=${mode}`);

/** Posts the just-finished run's score as a comment from the player's account. */
export const commentScore = (): Promise<CommentScoreResponse> =>
  request('/api/score/comment', { method: 'POST' });

/** Admin only; the server rejects anyone else. */
export const resetAllScores = (): Promise<ResetScoresResponse> =>
  request('/api/admin/reset-scores', { method: 'POST' });
