import type { SubmitScoreRequest, SubmitScoreResponse } from '../shared/api';

/** Submits the final score; the server responds with both leaderboards. */
export const submitScore = async (
  score: number
): Promise<SubmitScoreResponse> => {
  const body: SubmitScoreRequest = { score };
  const response = await fetch('/api/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Score submission failed: ${response.status}`);
  }
  const data: SubmitScoreResponse = await response.json();
  return data;
};
