import { requestExpandedMode } from '@devvit/web/client';

const playButton = document.getElementById('play-button');

playButton?.addEventListener('click', (event) => {
  requestExpandedMode(event, 'game');
});
