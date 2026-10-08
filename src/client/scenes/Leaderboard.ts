import type * as Phaser from 'phaser';
import { fetchLeaderboards } from '../api';
import { CSS, FONTS } from '../theme';
import { Button } from '../ui/Button';
import {
  LEADERBOARD_PANEL_HEIGHT,
  LEADERBOARD_PANEL_WIDTH,
  LeaderboardPanel,
} from '../ui/LeaderboardPanel';
import { MenuScene } from '../ui/MenuScene';
import { addText, addTitle } from '../ui/text';

const PANEL_TOP = 118;

/** Today's Best and All Time, reachable from the start screen. */
export class Leaderboard extends MenuScene {
  protected readonly designWidth = LEADERBOARD_PANEL_WIDTH + 40;
  protected readonly designHeight = PANEL_TOP + LEADERBOARD_PANEL_HEIGHT + 100;

  constructor() {
    super('Leaderboard');
  }

  protected build() {
    const cx = this.designWidth / 2;
    const panel = new LeaderboardPanel(this, 20, PANEL_TOP);
    const note = addText(this, cx, 84, 'Top 10 Reddit pilots', {
      fontFamily: FONTS.body,
      fontSize: '17px',
      color: CSS.muted,
    }).setOrigin(0.5);
    void this.loadBoards(panel, note);

    const buttonY = PANEL_TOP + LEADERBOARD_PANEL_HEIGHT + 52;
    return [
      addTitle(this, cx, 42, 'LEADERBOARD', 38),
      note,
      panel,
      new Button(this, cx - 120, buttonY, 'BACK', () => this.back(), {
        width: 200,
        height: 50,
        variant: 'secondary',
      }),
      new Button(this, cx + 120, buttonY, 'PLAY', () => this.play(), {
        width: 200,
        height: 50,
        opensKeyboard: true,
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
    note: Phaser.GameObjects.Text
  ): Promise<void> {
    try {
      const { leaderboards, username } = await fetchLeaderboards();
      // The player may have left this screen while the request was in flight.
      if (!this.sys.isActive()) {
        return;
      }
      panel.showBoards(leaderboards, username);
      note.setText(
        username
          ? `Playing as u/${username}`
          : 'Log in to Reddit to get on the board'
      );
    } catch (error) {
      console.error(error);
      if (this.sys.isActive()) {
        panel.showMessage('Leaderboard unavailable');
      }
    }
  }

  private back() {
    this.scene.start('MainMenu');
  }

  private play() {
    this.scene.start('Game');
  }
}
