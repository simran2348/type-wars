## Type Wars

A fast typing space shooter for Reddit, built with Devvit Web and Phaser.

Meteors fall toward your ship, each carrying a word. Type a word to shoot it down:
every correct letter fires a bullet, and finishing the word destroys the meteor.
Let three meteors through and the game ends. Your best score goes onto the
subreddit's **Today's Best** (UTC day) and **All Time** leaderboards.

- [Devvit](https://developers.reddit.com/): Reddit's developer platform (identity, Redis storage)
- [Phaser](https://phaser.io/): game rendering, input and effects
- [Vite](https://vite.dev/): builds the client
- [Hono](https://hono.dev/): server routes

## Project layout

- `src/client/scenes`: Boot (procedural textures), Background (starfield), MainMenu, Game, GameOver (overlay)
- `src/client/entities`: Ship, Meteor, pooled Bullets
- `src/client/systems`: typing, meteor spawning, difficulty, scoring/combo, word picking, effects, sound
- `src/client/data/words.ts`: curated word bank (easy / medium / hard / expert)
- `src/server/core/leaderboard.ts`: score validation and Redis-backed leaderboards
- `src/shared/api.ts`: types shared by client and server

## Commands

- `npm run dev`: Starts a development server where you can develop your application live on Reddit.
- `npm run build`: Builds your client and server projects
- `npm run deploy`: Uploads a new version of your app
- `npm run launch`: Publishes your app for review
- `npm run login`: Logs your CLI into Reddit
- `npm run test:types`: Type checks the client, server and shared code
- `npm run lint`: Lints the source

## Credits

Bootstrapped from the Devvit Phaser template, based on the Phaser team's [Vite TypeScript template](https://github.com/phaserjs/template-vite-ts).
