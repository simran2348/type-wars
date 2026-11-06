import { reddit, redis } from '@devvit/web/server';

/**
 * Reddit's review rule for score comments: players post them as replies to a
 * single stickied comment on the game post, so they stay out of the main
 * discussion and are easy to report or delete. This keeps one such pinned
 * comment per post, written by the app.
 */

type Comment = Awaited<ReturnType<typeof reddit.submitComment>>;
type CommentId = Comment['id'];
type PostId = Parameters<typeof reddit.submitComment>[0]['id'];

const THREAD_TEXT =
  'Scores: finish a game and tap **COMMENT MY SCORE** to share yours as a reply here.';

const threadKey = (postId: string): string =>
  `type-wars:score-thread:${postId}`;

const isCommentId = (value: string): value is CommentId =>
  value.startsWith('t1_');

/** Whether a stored comment is still on the post (not deleted or removed). */
const isLive = async (id: CommentId): Promise<boolean> => {
  try {
    const comment = await reddit.getCommentById(id);
    return !comment.removed;
  } catch {
    return false;
  }
};

/**
 * Pins the scores comment on a game post, or returns the one already there.
 * If two players finish at the same moment and both create one, the first
 * stored wins and the other is deleted.
 */
export const getScoreThread = async (postId: PostId): Promise<CommentId> => {
  const key = threadKey(postId);
  const stored = await redis.get(key);
  if (stored !== undefined && isCommentId(stored) && (await isLive(stored))) {
    return stored;
  }

  const comment = await reddit.submitComment({
    id: postId,
    text: THREAD_TEXT,
    runAs: 'APP',
  });
  await comment.distinguish(true);

  // Forget a pinned comment that was deleted, unless another request has
  // already replaced it.
  if (stored !== undefined && (await redis.get(key)) === stored) {
    await redis.del(key);
  }
  await redis.set(key, comment.id, { nx: true });
  const winner = await redis.get(key);
  if (winner === undefined || winner === comment.id || !isCommentId(winner)) {
    await redis.set(key, comment.id);
    return comment.id;
  }
  await comment.delete();
  return winner;
};
