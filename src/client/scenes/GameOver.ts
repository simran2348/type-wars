import * as Phaser from 'phaser';
import { Scene } from 'phaser';
import type { LeaderboardEntry, SubmitScoreResponse } from '../../shared/api';
import { submitScore } from '../api';
import type { RunSummary } from '../systems/ScoreSystem';
import { COLORS, CSS, FONTS } from '../theme';
import { Button } from '../ui/Button';
import { fitToViewport } from '../ui/layout';

const DESIGN_WIDTH = 620;
const DESIGN_HEIGHT = 600;
const COLUMN_WIDTH = 270;
const COLUMN_GAP = 30;
const BOARD_TOP = 222;
const ROW_HEIGHT = 25;
const MAX_NAME_LENGTH = 16;
/** Ignore Enter briefly so a keystroke from the last word can't skip the screen. */
const ENTER_DELAY_MS = 800;

/** Overlay shown on top of the frozen Game scene. */
export class GameOver extends Scene {
  private summary: RunSummary;
  private shade: Phaser.GameObjects.Rectangle;
  private content: Phaser.GameObjects.Container;
  private note: Phaser.GameObjects.Text;
  private shownAt: number;

  constructor() {
    super('GameOver');
  }

  init(data: RunSummary) {
    this.summary = data;
  }

  create() {
    this.shownAt = this.time.now;
    this.shade = this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x03040c, 0.78)
      .setOrigin(0);
    this.content = this.add.container(0, 0);

    const cx = DESIGN_WIDTH / 2;
    const { score, destroyed, accuracy, bestCombo } = this.summary;
    this.content.add([
      this.text(cx, 36, 'GAME OVER', 54, CSS.danger, 'bold').setLetterSpacing(
        4
      ),
      this.text(cx, 96, 'FINAL SCORE', 13, CSS.muted, 'bold').setLetterSpacing(
        3
      ),
      this.text(
        cx,
        132,
        score.toLocaleString('en-US'),
        44,
        CSS.accent,
        'bold',
        FONTS.mono
      ),
      this.text(
        cx,
        176,
        `${destroyed} meteors  ·  ${accuracy}% accuracy  ·  best combo ${bestCombo}`,
        15,
        CSS.muted
      ),
    ]);

    const leftX = (DESIGN_WIDTH - COLUMN_WIDTH * 2 - COLUMN_GAP) / 2;
    const rightX = leftX + COLUMN_WIDTH + COLUMN_GAP;
    const boardHeight = ROW_HEIGHT * 10 + 52;
    const panels = this.add.graphics();
    panels.fillStyle(COLORS.panel, 0.96);
    panels.lineStyle(1, COLORS.panelBorder, 1);
    for (const x of [leftX, rightX]) {
      panels.fillRoundedRect(
        x - 12,
        BOARD_TOP - 14,
        COLUMN_WIDTH + 24,
        boardHeight,
        12
      );
      panels.strokeRoundedRect(
        x - 12,
        BOARD_TOP - 14,
        COLUMN_WIDTH + 24,
        boardHeight,
        12
      );
    }
    const loading = [leftX, rightX].map((x) =>
      this.text(
        x + COLUMN_WIDTH / 2,
        BOARD_TOP + 100,
        'Loading…',
        15,
        CSS.muted
      )
    );
    this.note = this.text(cx, BOARD_TOP + boardHeight + 2, '', 13, CSS.muted);
    this.content.add([
      panels,
      this.header(leftX, "TODAY'S BEST"),
      this.header(rightX, 'ALL TIME'),
      ...loading,
      this.note,
      new Button(this, cx, 556, 'PLAY AGAIN', () => this.playAgain(), 260, 58),
    ]);

    this.content.setAlpha(0);
    this.shade.setAlpha(0);
    this.tweens.add({
      targets: [this.content, this.shade],
      alpha: 1,
      duration: 260,
    });
    this.layout();

    void this.loadLeaderboards(leftX, rightX, loading);

    this.input.keyboard?.on(
      Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
      this.onKeyDown,
      this
    );
    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off(
        Phaser.Input.Keyboard.Events.ANY_KEY_DOWN,
        this.onKeyDown,
        this
      );
      this.scale.off(Phaser.Scale.Events.RESIZE, this.layout, this);
    });
  }

  private async loadLeaderboards(
    leftX: number,
    rightX: number,
    loading: Phaser.GameObjects.Text[]
  ) {
    let response: SubmitScoreResponse;
    try {
      response = await submitScore(this.summary.score);
    } catch (error) {
      console.error(error);
      if (this.sys.isActive()) {
        loading.forEach((text) => text.setText('Leaderboard unavailable'));
      }
      return;
    }
    // The player may already have pressed PLAY AGAIN.
    if (!this.sys.isActive()) {
      return;
    }
    loading.forEach((text) => text.destroy());
    const { leaderboards, username, recorded } = response;
    this.content.add([
      ...this.rows(leftX, leaderboards.today, username),
      ...this.rows(rightX, leaderboards.allTime, username),
    ]);
    if (!recorded && username === null) {
      this.note.setText('Log in to Reddit to save your scores.');
    }
  }

  private header(x: number, label: string): Phaser.GameObjects.Text {
    return this.text(x, BOARD_TOP, label, 14, CSS.accent, 'bold')
      .setOrigin(0, 0.5)
      .setLetterSpacing(2);
  }

  /** Leaderboard rows: username and score only, no rank numbers. */
  private rows(
    x: number,
    entries: LeaderboardEntry[],
    player: string | null
  ): Phaser.GameObjects.Text[] {
    if (entries.length === 0) {
      return [
        this.text(
          x + COLUMN_WIDTH / 2,
          BOARD_TOP + 100,
          'No scores yet',
          15,
          CSS.muted
        ),
      ];
    }
    return entries.flatMap((entry, i) => {
      const y = BOARD_TOP + 34 + i * ROW_HEIGHT;
      const color = entry.username === player ? CSS.accent : CSS.text;
      const name =
        entry.username.length > MAX_NAME_LENGTH
          ? `${entry.username.slice(0, MAX_NAME_LENGTH - 1)}…`
          : entry.username;
      return [
        this.text(x, y, name, 16, color, 'normal', FONTS.mono).setOrigin(
          0,
          0.5
        ),
        this.text(
          x + COLUMN_WIDTH,
          y,
          entry.score.toLocaleString('en-US'),
          16,
          color,
          'bold',
          FONTS.mono
        ).setOrigin(1, 0.5),
      ];
    });
  }

  private text(
    x: number,
    y: number,
    value: string,
    size: number,
    color: string,
    fontStyle = 'normal',
    fontFamily: string = FONTS.ui
  ): Phaser.GameObjects.Text {
    return this.add
      .text(x, y, value, {
        fontFamily,
        fontSize: `${size}px`,
        fontStyle,
        color,
      })
      .setOrigin(0.5);
  }

  private onKeyDown(event: KeyboardEvent) {
    if (
      event.key === 'Enter' &&
      this.time.now - this.shownAt > ENTER_DELAY_MS
    ) {
      this.playAgain();
    }
  }

  private playAgain() {
    // Restarts the Game scene cleanly and closes this overlay.
    this.scene.start('Game');
  }

  private layout() {
    const { width, height } = this.scale;
    this.shade.setSize(width, height);
    fitToViewport(this.content, DESIGN_WIDTH, DESIGN_HEIGHT, width, height);
  }
}
