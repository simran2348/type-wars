import * as Phaser from 'phaser';
import { LEADERBOARD_SIZE, type LeaderboardEntry } from '../../shared/api';
import { COLORS, CSS, FONTS, MEDALS } from '../theme';
import { addText } from './text';

const PADDING = 14;
const HEADER_HEIGHT = 40;
/** Medallion rows for the top three. */
const MEDAL_ROW_HEIGHT = 40;
const MEDAL_ROW_GAP = 6;
const MEDAL_RADIUS = 14;
/** Space for the divider between the medallion rows and the rest. */
const DIVIDER_HEIGHT = 10;
const ROW_HEIGHT = 27;
const LAST_SCORE_GAP = 8;
const LAST_SCORE_HEIGHT = 44;
const MAX_NAME_LENGTH = 16;

const LIST_HEIGHT =
  HEADER_HEIGHT +
  MEDALS.length * (MEDAL_ROW_HEIGHT + MEDAL_ROW_GAP) +
  DIVIDER_HEIGHT +
  (LEADERBOARD_SIZE - MEDALS.length) * ROW_HEIGHT +
  PADDING;
/** Without medallions the ten rows spread over the same height. */
const PLAIN_ROW_HEIGHT =
  (LIST_HEIGHT - HEADER_HEIGHT - PADDING) / LEADERBOARD_SIZE;

export const LEADERBOARD_PANEL_WIDTH = 440;
export const LEADERBOARD_PANEL_HEIGHT =
  LIST_HEIGHT + LAST_SCORE_GAP + LAST_SCORE_HEIGHT;

const CONTENT_WIDTH = LEADERBOARD_PANEL_WIDTH - PADDING * 2;

export type LeaderboardView = {
  /** Top scores, best first. */
  entries: LeaderboardEntry[];
  /** The viewer's username, so their row can be highlighted. */
  player: string | null;
  /** The viewer's most recent score on this level. */
  lastScore: number | null;
  /** Whether the top three get medallions (the ranked board). */
  medals: boolean;
};

/** Shown as `u/name`, shortened so long names don't collide with scores. */
const displayName = (username: string): string => {
  const name =
    username.length > MAX_NAME_LENGTH
      ? `${username.slice(0, MAX_NAME_LENGTH - 1)}…`
      : username;
  return `u/${name}`;
};

const formatScore = (score: number): string => score.toLocaleString('en-US');

/**
 * One level's all-time leaderboard with the viewer's last score in a box
 * below it. Reddit username and score only; the ranked board marks its top
 * three with gold, silver and bronze medallions. Origin is the top-left corner.
 */
export class LeaderboardPanel extends Phaser.GameObjects.Container {
  private rows: Phaser.GameObjects.GameObject[] = [];
  private readonly lastScoreText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    const lastTop = LIST_HEIGHT + LAST_SCORE_GAP;
    const frames = scene.add.graphics();
    frames.fillStyle(COLORS.panel, 0.96);
    frames.lineStyle(1, COLORS.panelBorder, 1);
    for (const [top, height] of [
      [0, LIST_HEIGHT],
      [lastTop, LAST_SCORE_HEIGHT],
    ] as const) {
      frames.fillRoundedRect(0, top, LEADERBOARD_PANEL_WIDTH, height, 6);
      frames.strokeRoundedRect(0, top, LEADERBOARD_PANEL_WIDTH, height, 6);
    }

    this.lastScoreText = addText(
      scene,
      LEADERBOARD_PANEL_WIDTH - PADDING,
      lastTop + LAST_SCORE_HEIGHT / 2,
      '',
      { fontFamily: FONTS.mono, fontSize: '20px', color: CSS.text }
    ).setOrigin(1, 0.5);

    this.add([
      frames,
      this.heading(HEADER_HEIGHT / 2, 'ALL TIME', 15),
      this.heading(lastTop + LAST_SCORE_HEIGHT / 2, 'YOUR LAST SCORE', 13),
      this.lastScoreText,
    ]);
    this.showMessage('Loading…');
    scene.add.existing(this);
  }

  showMessage(message: string): void {
    this.lastScoreText.setText('');
    this.replaceRows([this.message(message)]);
  }

  show({ entries, player, lastScore, medals }: LeaderboardView): void {
    this.lastScoreText
      .setText(
        lastScore !== null
          ? formatScore(lastScore)
          : player === null
            ? 'Log in to track'
            : 'No games yet'
      )
      .setColor(lastScore !== null ? CSS.text : CSS.muted);

    if (entries.length === 0) {
      this.replaceRows([this.message('No scores yet')]);
      return;
    }
    const top = entries.slice(0, LEADERBOARD_SIZE);
    this.replaceRows(
      medals ? this.medalBoard(top, player) : this.plainBoard(top, player)
    );
  }

  private replaceRows(rows: Phaser.GameObjects.GameObject[]): void {
    this.rows.forEach((row) => row.destroy());
    this.rows = rows;
    this.add(rows);
  }

  private heading(
    y: number,
    label: string,
    size: number
  ): Phaser.GameObjects.Text {
    return addText(this.scene, PADDING, y, label, {
      fontFamily: FONTS.display,
      fontSize: `${size}px`,
      fontStyle: '900',
      color: CSS.accent,
    })
      .setOrigin(0, 0.5)
      .setLetterSpacing(2);
  }

  private message(value: string): Phaser.GameObjects.Text {
    return addText(
      this.scene,
      LEADERBOARD_PANEL_WIDTH / 2,
      LIST_HEIGHT / 2,
      value,
      { fontFamily: FONTS.body, fontSize: '19px', color: CSS.muted }
    ).setOrigin(0.5);
  }

  /** Ten evenly spaced rows. */
  private plainBoard(
    entries: LeaderboardEntry[],
    player: string | null
  ): Phaser.GameObjects.GameObject[] {
    return entries.flatMap((entry, i) =>
      this.row(
        entry,
        HEADER_HEIGHT + PLAIN_ROW_HEIGHT * (i + 0.5),
        entry.username === player
      )
    );
  }

  /** Medallion rows for the top three, a divider, then the rest as a list. */
  private medalBoard(
    entries: LeaderboardEntry[],
    player: string | null
  ): Phaser.GameObjects.GameObject[] {
    const medalsBottom =
      HEADER_HEIGHT + MEDALS.length * (MEDAL_ROW_HEIGHT + MEDAL_ROW_GAP);
    const divider = this.scene.add.graphics();
    divider.lineStyle(1, COLORS.panelBorder, 1);
    divider.lineBetween(
      PADDING,
      medalsBottom + DIVIDER_HEIGHT / 2 - MEDAL_ROW_GAP / 2,
      LEADERBOARD_PANEL_WIDTH - PADDING,
      medalsBottom + DIVIDER_HEIGHT / 2 - MEDAL_ROW_GAP / 2
    );

    return [
      divider,
      ...entries.flatMap((entry, i) => {
        const medal = MEDALS[i];
        const isPlayer = entry.username === player;
        if (medal) {
          const top = HEADER_HEIGHT + i * (MEDAL_ROW_HEIGHT + MEDAL_ROW_GAP);
          return this.medalRow(entry, i + 1, top, medal, isPlayer);
        }
        const y =
          medalsBottom +
          DIVIDER_HEIGHT +
          ROW_HEIGHT * (i - MEDALS.length + 0.5);
        return this.row(entry, y, isPlayer);
      }),
    ];
  }

  private row(
    entry: LeaderboardEntry,
    y: number,
    isPlayer: boolean
  ): Phaser.GameObjects.Text[] {
    const style = {
      fontFamily: FONTS.mono,
      fontSize: '19px',
      color: isPlayer ? CSS.accent : CSS.text,
    };
    return [
      addText(
        this.scene,
        PADDING,
        y,
        displayName(entry.username),
        style
      ).setOrigin(0, 0.5),
      addText(
        this.scene,
        PADDING + CONTENT_WIDTH,
        y,
        formatScore(entry.score),
        style
      ).setOrigin(1, 0.5),
    ];
  }

  private medalRow(
    entry: LeaderboardEntry,
    place: number,
    top: number,
    medal: (typeof MEDALS)[number],
    isPlayer: boolean
  ): Phaser.GameObjects.GameObject[] {
    const y = top + MEDAL_ROW_HEIGHT / 2;
    const medalX = PADDING + 8 + MEDAL_RADIUS;
    const art = this.scene.add.graphics();
    // Tinted row
    art.fillStyle(medal.color, 0.14);
    art.fillRoundedRect(PADDING, top, CONTENT_WIDTH, MEDAL_ROW_HEIGHT, 6);
    art.lineStyle(1.5, medal.color, 1);
    art.strokeRoundedRect(PADDING, top, CONTENT_WIDTH, MEDAL_ROW_HEIGHT, 6);
    // Medallion: a soft halo, a dark rim, the disc and a highlight
    art.fillStyle(medal.color, 0.25);
    art.fillCircle(medalX, y, MEDAL_RADIUS + 4);
    art.fillStyle(medal.rim, 1);
    art.fillCircle(medalX, y, MEDAL_RADIUS + 1.5);
    art.fillStyle(medal.color, 1);
    art.fillCircle(medalX, y, MEDAL_RADIUS);
    art.fillStyle(0xffffff, 0.55);
    art.fillCircle(medalX - 4, y - 5, 4);

    return [
      art,
      addText(this.scene, medalX, y, String(place), {
        fontFamily: FONTS.display,
        fontSize: '15px',
        fontStyle: '900',
        color: '#1a1200',
      }).setOrigin(0.5),
      addText(
        this.scene,
        medalX + MEDAL_RADIUS + 12,
        y,
        displayName(entry.username),
        { fontFamily: FONTS.mono, fontSize: '20px', color: medal.css }
      ).setOrigin(0, 0.5),
      addText(
        this.scene,
        PADDING + CONTENT_WIDTH - 10,
        y,
        formatScore(entry.score),
        {
          fontFamily: FONTS.mono,
          fontSize: '20px',
          color: isPlayer ? CSS.accent : CSS.text,
        }
      ).setOrigin(1, 0.5),
    ];
  }
}
