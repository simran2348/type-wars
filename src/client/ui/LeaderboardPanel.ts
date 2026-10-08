import * as Phaser from 'phaser';
import {
  LEADERBOARD_SIZE,
  type LeaderboardEntry,
  type Leaderboards,
} from '../../shared/api';
import { COLORS, CSS, FONTS } from '../theme';
import { addText } from './text';

const COLUMN_WIDTH = 290;
const COLUMN_GAP = 24;
const PADDING = 14;
const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 29;
const MAX_NAME_LENGTH = 16;

const FRAME_WIDTH = COLUMN_WIDTH + PADDING * 2;

export const LEADERBOARD_PANEL_WIDTH = FRAME_WIDTH * 2 + COLUMN_GAP;
export const LEADERBOARD_PANEL_HEIGHT =
  HEADER_HEIGHT + ROW_HEIGHT * LEADERBOARD_SIZE + PADDING;

/** Shown as `u/name`, shortened so long names don't collide with scores. */
const displayName = (username: string): string => {
  const name =
    username.length > MAX_NAME_LENGTH
      ? `${username.slice(0, MAX_NAME_LENGTH - 1)}…`
      : username;
  return `u/${name}`;
};

/**
 * Today's Best and All Time side by side: Reddit username and score only, no
 * rank numbers. Origin is the panel's top-left corner.
 */
export class LeaderboardPanel extends Phaser.GameObjects.Container {
  private rows: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const frames = scene.add.graphics();
    frames.fillStyle(COLORS.panel, 0.96);
    frames.lineStyle(1, COLORS.panelBorder, 1);
    for (const columnX of this.columns()) {
      frames.fillRoundedRect(
        columnX - PADDING,
        0,
        FRAME_WIDTH,
        LEADERBOARD_PANEL_HEIGHT,
        6
      );
      frames.strokeRoundedRect(
        columnX - PADDING,
        0,
        FRAME_WIDTH,
        LEADERBOARD_PANEL_HEIGHT,
        6
      );
    }
    const [todayX, allTimeX] = this.columns();
    this.add([
      frames,
      this.header(todayX, "TODAY'S BEST"),
      this.header(allTimeX, 'ALL TIME'),
    ]);
    this.showMessage('Loading…');
    scene.add.existing(this);
  }

  showMessage(message: string): void {
    this.replaceRows(
      this.columns().map((columnX) => this.message(columnX, message))
    );
  }

  showBoards(leaderboards: Leaderboards, player: string | null): void {
    const [todayX, allTimeX] = this.columns();
    this.replaceRows([
      ...this.column(todayX, leaderboards.today, player),
      ...this.column(allTimeX, leaderboards.allTime, player),
    ]);
  }

  private columns(): [number, number] {
    // Left edge of each column's content, inside its frame.
    return [PADDING, FRAME_WIDTH + COLUMN_GAP + PADDING];
  }

  private replaceRows(rows: Phaser.GameObjects.GameObject[]): void {
    this.rows.forEach((row) => row.destroy());
    this.rows = rows;
    this.add(rows);
  }

  private header(x: number, label: string): Phaser.GameObjects.Text {
    return addText(this.scene, x, HEADER_HEIGHT / 2, label, {
      fontFamily: FONTS.display,
      fontSize: '15px',
      fontStyle: '900',
      color: CSS.accent,
    })
      .setOrigin(0, 0.5)
      .setLetterSpacing(2);
  }

  private message(x: number, value: string): Phaser.GameObjects.Text {
    return addText(
      this.scene,
      x + COLUMN_WIDTH / 2,
      LEADERBOARD_PANEL_HEIGHT / 2,
      value,
      { fontFamily: FONTS.body, fontSize: '19px', color: CSS.muted }
    ).setOrigin(0.5);
  }

  private column(
    x: number,
    entries: LeaderboardEntry[],
    player: string | null
  ): Phaser.GameObjects.Text[] {
    if (entries.length === 0) {
      return [this.message(x, 'No scores yet')];
    }
    return entries.flatMap((entry, i) => {
      const y = HEADER_HEIGHT + ROW_HEIGHT / 2 + i * ROW_HEIGHT;
      const style = {
        fontFamily: FONTS.mono,
        fontSize: '19px',
        color: entry.username === player ? CSS.accent : CSS.text,
      };
      return [
        addText(this.scene, x, y, displayName(entry.username), style).setOrigin(
          0,
          0.5
        ),
        addText(
          this.scene,
          x + COLUMN_WIDTH,
          y,
          entry.score.toLocaleString('en-US'),
          style
        ).setOrigin(1, 0.5),
      ];
    });
  }
}
