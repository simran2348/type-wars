/** Reddit users allowed to run admin actions such as resetting scores. */
const ADMIN_USERNAMES = new Set(['thelipaguss']);

export const isAdmin = (username: string | null | undefined): boolean =>
  username !== null &&
  username !== undefined &&
  ADMIN_USERNAMES.has(username.toLowerCase());
