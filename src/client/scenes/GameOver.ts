import type * as Phaser from 'phaser';
import { submitScore } from '../api';
import type { RunSummary } from '../systems/ScoreSystem';
import { CSS, FONTS } from '../theme';
import { Button } from '../ui/Button';
import {
  LEADERBOARD_PANEL_HEIGHT,
  LEADERBOARD_PANEL_WIDTH,
  LeaderboardPanel,
} from '../ui/LeaderboardPanel';
import { MenuScene } from '../ui/MenuScene';
import { addText } from '../ui/text';

const PANEL_TOP = 214;
/** Ignore Enter briefly so a keystroke from the last word can't skip the screen. */
const ENTER_DELAY_MS = 800;

/** Overlay shown on top of the frozen Game scene. */
export class GameOver extends MenuScene {
  protected readonly designWidth = LEADERBOARD_PANEL_WIDTH + 40;
  protected readonly designHeight = PANEL_TOP + LEADERBOARD_PANEL_HEIGHT + 104;
  private summary: RunSummary;
  private shade: Phaser.GameObjects.Rectangle;
  private shownAt: number;

  constructor() {
    super('GameOver');
  }

  init(data: RunSummary) {
    this.summary = data;
  }

  override create() {
    this.shownAt = this.time.now;
    this.shade = this.add.rectangle(0, 0, 1, 1, 0x000000, 0.8).setOrigin(0);
    super.create();
    this.content.setAlpha(0);
    this.shade.setAlpha(0);
    this.tweens.add({
      targets: [this.content, this.shade],
      alpha: 1,
      duration: 260,
    });
  }

  protected build() {
    const cx = this.designWidth / 2;
    const { score, destroyed, accuracy, bestCombo } = this.summary;
    const panel = new LeaderboardPanel(this, 20, PANEL_TOP);
    const note = addText(
      this,
      cx,
      PANEL_TOP + LEADERBOARD_PANEL_HEIGHT + 16,
      '',
      { fontFamily: FONTS.body, fontSize: '18px', color: CSS.muted }
    ).setOrigin(0.5);
    void this.submit(panel, note);

    return [
      addText(this, cx, 36, 'GAME OVER', {
        fontFamily: FONTS.display,
        fontSize: '46px',
        fontStyle: '900',
        color: CSS.danger,
      })
        .setOrigin(0.5)
        .setLetterSpacing(5),
      addText(this, cx, 90, 'FINAL SCORE', {
        fontFamily: FONTS.display,
        fontSize: '14px',
        fontStyle: '700',
        color: CSS.muted,
      })
        .setOrigin(0.5)
        .setLetterSpacing(3),
      addText(this, cx, 126, score.toLocaleString('en-US'), {
        fontFamily: FONTS.mono,
        fontSize: '50px',
        color: CSS.accent,
      }).setOrigin(0.5),
      addText(
        this,
        cx,
        172,
        `${destroyed} meteors  ·  ${accuracy}% accuracy  ·  best combo ${bestCombo}`,
        { fontFamily: FONTS.body, fontSize: '20px', color: CSS.muted }
      ).setOrigin(0.5),
      panel,
      note,
      new Button(
        this,
        cx,
        this.designHeight - 40,
        'PLAY AGAIN',
        () => this.playAgain(),
        { width: 260, height: 56, opensKeyboard: true }
      ),
    ];
  }

  protected override layoutContent(width: number, height: number) {
    this.shade.setSize(width, height);
    super.layoutContent(width, height);
  }

  protected override onKey(event: KeyboardEvent) {
    if (
      event.key === 'Enter' &&
      this.time.now - this.shownAt > ENTER_DELAY_MS
    ) {
      this.playAgain();
    }
  }

  private async submit(
    panel: LeaderboardPanel,
    note: Phaser.GameObjects.Text
  ): Promise<void> {
    try {
      const { leaderboards, username, recorded } = await submitScore(
        this.summary.score
      );
      // The player may already have pressed PLAY AGAIN.
      if (!this.sys.isActive()) {
        return;
      }
      panel.showBoards(leaderboards, username);
      if (!recorded && username === null) {
        note.setText('Log in to Reddit to save your scores.');
      }
    } catch (error) {
      console.error(error);
      if (this.sys.isActive()) {
        panel.showMessage('Leaderboard unavailable');
      }
    }
  }

  private playAgain() {
    // Restarts the Game scene cleanly and closes this overlay.
    this.scene.start('Game');
  }
}
