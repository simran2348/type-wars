import { requestExpandedMode } from '@devvit/web/client';
import type { LeaderboardEntry } from '../shared/api';
import { fetchLeaderboards } from './api';
import { setupAdmin } from './splashAdmin';

/** The feed card is small, so it shows a shorter list than the full game. */
const SPLASH_ROWS = 5;
const STARS_PER_PIXEL = 1 / 900;

document.getElementById('play-button')?.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});

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

const renderBoard = (
  list: HTMLElement | null,
  entries: LeaderboardEntry[],
  player: string | null
): void => {
  if (!list) {
    return;
  }
  list.replaceChildren();
  if (entries.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'empty';
    empty.textContent = 'No scores yet';
    list.append(empty);
    return;
  }
  for (const entry of entries.slice(0, SPLASH_ROWS)) {
    const row = document.createElement('li');
    if (entry.username === player) {
      row.className = 'me';
    }
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = `u/${entry.username}`;
    const score = document.createElement('span');
    score.className = 'score';
    score.textContent = entry.score.toLocaleString('en-US');
    row.append(name, score);
    list.append(row);
  }
};

let adminReady = false;

const loadBoards = async (): Promise<void> => {
  const today = document.getElementById('board-today');
  const allTime = document.getElementById('board-all-time');
  try {
    const { leaderboards, username, isAdmin } = await fetchLeaderboards();
    renderBoard(today, leaderboards.today, username);
    renderBoard(allTime, leaderboards.allTime, username);
    if (isAdmin && !adminReady) {
      adminReady = true;
      setupAdmin(() => void loadBoards());
    }
  } catch (error) {
    console.error(error);
    for (const list of [today, allTime]) {
      if (list) {
        list.innerHTML = '<li class="empty">Unavailable</li>';
      }
    }
  }
};

const stars = document.getElementById('stars');
if (stars instanceof HTMLCanvasElement) {
  drawStars(stars);
  window.addEventListener('resize', () => drawStars(stars));
}
void loadBoards();
