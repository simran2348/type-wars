import type {
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

/** Submits the final score; the server responds with both leaderboards. */
export const submitScore = (score: number): Promise<SubmitScoreResponse> => {
  const body: SubmitScoreRequest = { score };
  return request('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
};

export const fetchLeaderboards = (): Promise<LeaderboardResponse> =>
  request('/api/leaderboard');

/** Admin only; the server rejects anyone else. */
export const resetAllScores = (): Promise<ResetScoresResponse> =>
  request('/api/admin/reset-scores', { method: 'POST' });
