import { requestExpandedMode } from '@devvit/web/client';
import {
  LEADERBOARD_SIZE,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from '../shared/api';
import { fetchLeaderboards } from './api';
import { setupAdmin } from './splashAdmin';

const STARS_PER_PIXEL = 1 / 900;

const element = (id: string): HTMLElement | null => document.getElementById(id);

const drawStars = (canvas: HTMLCanvasElement): void => {
  const ratio = window.devicePixelRatio || 1;
  const { clientWidth: width, clientHeight: height } = canvas;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return;
  }
  ctx.scale(ratio, ratio);
  const count = Math.round(width * height * STARS_PER_PIXEL);
  for (let i = 0; i < count; i++) {
    // Mostly faint pinpricks, with the occasional bright star.
    const bright = Math.random() < 0.08;
    const radius = bright
      ? 0.9 + Math.random() * 0.8
      : 0.3 + Math.random() * 0.6;
    const alpha = bright
      ? 0.8 + Math.random() * 0.2
      : 0.25 + Math.random() * 0.5;
    const tint = Math.random() < 0.15 ? '200,220,255' : '255,255,255';
    ctx.fillStyle = `rgba(${tint},${alpha})`;
    ctx.beginPath();
    ctx.arc(
      Math.random() * width,
      Math.random() * height,
      radius,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }
};

const messageRow = (text: string): HTMLLIElement => {
  const row = document.createElement('li');
  row.className = 'empty';
  row.textContent = text;
  return row;
};

/** Username and score only, no rank numbers. */
const renderBoard = (
  list: HTMLElement | null,
  entries: LeaderboardEntry[],
  player: string | null
): void => {
  if (!list) {
    return;
  }
  if (entries.length === 0) {
    list.replaceChildren(messageRow('No scores yet'));
    return;
  }
  list.replaceChildren(
    ...entries.slice(0, LEADERBOARD_SIZE).map((entry) => {
      const row = document.createElement('li');
      if (entry.username === player) {
        row.className = 'me';
      }
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = `u/${entry.username}`;
      const score = document.createElement('span');
      score.textContent = entry.score.toLocaleString('en-US');
      row.append(name, score);
      return row;
    })
  );
};

const renderLastScore = ({ username, lastScore }: LeaderboardResponse) => {
  const target = element('last-score');
  if (!target) {
    return;
  }
  target.textContent =
    username === null
      ? 'Log in to track your score'
      : lastScore === null
        ? 'No games yet'
        : lastScore.toLocaleString('en-US');
};

let adminReady = false;

const loadBoards = async (): Promise<void> => {
  const today = element('board-today');
  const allTime = element('board-all-time');
  try {
    const response = await fetchLeaderboards();
    renderBoard(today, response.leaderboards.today, response.username);
    renderBoard(allTime, response.leaderboards.allTime, response.username);
    renderLastScore(response);
    if (response.isAdmin && !adminReady) {
      adminReady = true;
      setupAdmin(() => void loadBoards());
    }
  } catch (error) {
    console.error(error);
    today?.replaceChildren(messageRow('Unavailable'));
    allTime?.replaceChildren(messageRow('Unavailable'));
  }
};

/** Swaps between the home and leaderboard screens inside the feed card. */
const showScreen = (screen: 'home' | 'leaderboard'): void => {
  const home = element('home-screen');
  const leaderboard = element('leaderboard-screen');
  if (home && leaderboard) {
    home.hidden = screen !== 'home';
    leaderboard.hidden = screen !== 'leaderboard';
  }
};

element('play-button')?.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});
element('leaderboards-button')?.addEventListener('click', () => {
  showScreen('leaderboard');
  // Refresh so the boards and last score reflect any games just played.
  void loadBoards();
});
element('back-button')?.addEventListener('click', () => showScreen('home'));

const stars = element('stars');
if (stars instanceof HTMLCanvasElement) {
  drawStars(stars);
  window.addEventListener('resize', () => drawStars(stars));
}
// Loads up front too, so the admin panel can appear on the home screen.
void loadBoards();
