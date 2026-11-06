import { reddit } from '@devvit/web/server';
import { getScoreThread } from './scoreThread';

export const createPost = async () => {
  const post = await reddit.submitCustomPost({
    title: 'Type Wars',
  });
  // Pin the scores comment straight away; if this fails it is created when
  // the first player shares a score instead.
  try {
    await getScoreThread(post.id);
  } catch (error) {
    console.error('Could not pin the scores comment:', error);
  }
  return post;
};
