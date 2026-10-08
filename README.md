# Type Wars

A fast typing space shooter for Reddit, built with [Devvit Web](https://developers.reddit.com/) and [Phaser](https://phaser.io/).

Meteors fall toward your ship, each carrying a word. Every correct letter fires a blaster bolt; finish the word to destroy the meteor. Let three through and it's game over.

- **Scoring:** 1 point per letter, with combo multipliers (×2 at 5 in a row, ×3 at 10, ×4 at 20).
- **Leaderboards:** Today's Best (UTC) and All Time, top 10 by Reddit username.
- **Mobile:** an on-screen letter pad appears below the ship on touch devices.
- **Admin:** the configured admin can reset all scores from the splash screen.

## Development

```bash
npm install
npm run login   # once
npm run dev     # playtest live on Reddit
```

| Command              | Description             |
| -------------------- | ----------------------- |
| `npm run build`      | Build client and server |
| `npm run test:types` | Type-check              |
| `npm run lint`       | Lint                    |
| `npm run deploy`     | Upload a new version    |
| `npm run launch`     | Publish for review      |

## Project layout

- `src/client`: Phaser game (`scenes/`, `entities/`, `systems/`, `ui/`) and the feed splash page
- `src/server`: Hono API: score submission, leaderboards (Redis), admin reset
- `src/shared/api.ts`: types shared by client and server

Admins are listed in `src/server/core/admin.ts`; words live in `src/client/data/words.ts`.

## Credits

Bootstrapped from the Devvit Phaser template, based on Phaser's [Vite TypeScript template](https://github.com/phaserjs/template-vite-ts).
