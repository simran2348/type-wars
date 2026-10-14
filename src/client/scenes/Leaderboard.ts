import type * as Phaser from 'phaser';
import type { GameMode } from '../../shared/api';
import { fetchLeaderboards } from '../api';
import { DEFAULT_MODE, MODES } from '../modes';
import { CSS, FONTS } from '../theme';
import { Button } from '../ui/Button';
import {
  LEADERBOARD_PANEL_HEIGHT,
  LEADERBOARD_PANEL_WIDTH,
  LeaderboardPanel,
} from '../ui/LeaderboardPanel';
import { MenuScene } from '../ui/MenuScene';
import { MODE_TABS_HEIGHT, ModeTabs } from '../ui/ModeTabs';
import { addText, addTitle } from '../ui/text';

const TABS_TOP = 112;
const PANEL_TOP = TABS_TOP + MODE_TABS_HEIGHT + 10;

/** The all-time leaderboard for a chosen level, reachable from the start screen. */
export class Leaderboard extends MenuScene {
  protected readonly designWidth = 560;
  protected readonly designHeight = PANEL_TOP + LEADERBOARD_PANEL_HEIGHT + 100;

  /** The level whose boards are on screen; guards against stale responses. */
  private viewing: GameMode = DEFAULT_MODE;

  constructor() {
    super('Leaderboard');
  }

  protected build() {
    const cx = this.designWidth / 2;
    const left = (this.designWidth - LEADERBOARD_PANEL_WIDTH) / 2;
    const panel = new LeaderboardPanel(this, left, PANEL_TOP);
    const note = addText(this, cx, 84, 'Top 10 Reddit pilots', {
      fontFamily: FONTS.body,
      fontSize: '20px',
      color: CSS.muted,
    }).setOrigin(0.5);
    this.viewing = DEFAULT_MODE;
    const tabs = new ModeTabs(
      this,
      left,
      TABS_TOP,
      LEADERBOARD_PANEL_WIDTH,
      this.viewing,
      (mode) => {
        this.viewing = mode;
        panel.showMessage('Loading…');
        void this.loadBoards(panel, note, mode);
      }
    );
    void this.loadBoards(panel, note, this.viewing);

    const buttonY = PANEL_TOP + LEADERBOARD_PANEL_HEIGHT + 52;
    return [
      addTitle(this, cx, 42, 'LEADERBOARD', 38, this.designWidth - 48),
      note,
      tabs,
      panel,
      new Button(this, cx - 120, buttonY, 'BACK', () => this.back(), {
        width: 200,
        height: 50,
        variant: 'secondary',
      }),
      new Button(this, cx + 120, buttonY, 'PLAY', () => this.play(), {
        width: 200,
        height: 50,
      }),
    ];
  }

  protected override onKey(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      this.back();
    } else if (event.key === 'Enter') {
      this.play();
    }
  }

  private async loadBoards(
    panel: LeaderboardPanel,
    note: Phaser.GameObjects.Text,
    mode: GameMode
  ): Promise<void> {
    try {
      const { leaderboard, username, lastScore } =
        await fetchLeaderboards(mode);
      // The player may have left this screen or picked another level while
      // the request was in flight.
      if (!this.sys.isActive() || mode !== this.viewing) {
        return;
      }
      panel.show({
        entries: leaderboard,
        player: username,
        lastScore,
        medals: MODES[mode].medals,
      });
      note.setText(
        username
          ? `Playing as u/${username}`
          : 'Log in to Reddit to get on the board'
      );
    } catch (error) {
      console.error(error);
      if (this.sys.isActive() && mode === this.viewing) {
        panel.showMessage('Leaderboard unavailable');
      }
    }
  }

  private back() {
    this.scene.start('MainMenu');
  }

  private play() {
    this.scene.start('LevelSelect');
  }
}
