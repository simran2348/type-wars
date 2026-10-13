import * as Phaser from 'phaser';
import { GAME_MODES, type GameMode } from '../../shared/api';
import { MODES } from '../modes';
import { COLORS, CSS, FONTS } from '../theme';
import { addText } from './text';

const TAB_GAP = 8;
export const MODE_TABS_HEIGHT = 36;

type Tab = {
  mode: GameMode;
  background: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
};

/**
 * A row of level tabs for choosing which leaderboard to view. Origin is the
 * row's top-left corner; the selected tab is filled yellow.
 */
export class ModeTabs extends Phaser.GameObjects.Container {
  private readonly tabs: Tab[];
  private readonly tabWidth: number;
  private selected: GameMode;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    selected: GameMode,
    onSelect: (mode: GameMode) => void
  ) {
    super(scene, x, y);
    this.selected = selected;
    this.tabWidth =
      (width - TAB_GAP * (GAME_MODES.length - 1)) / GAME_MODES.length;

    this.tabs = GAME_MODES.map((mode, i) => {
      const left = i * (this.tabWidth + TAB_GAP);
      const background = scene.add.graphics({ x: left, y: 0 });
      const label = addText(
        scene,
        left + this.tabWidth / 2,
        MODE_TABS_HEIGHT / 2,
        MODES[mode].label,
        { fontFamily: FONTS.display, fontSize: '14px', fontStyle: '900' }
      )
        .setOrigin(0.5)
        .setLetterSpacing(2);
      label.setScale(Math.min(1, (this.tabWidth - 12) / label.width));
      const hitArea = scene.add
        .zone(left, 0, this.tabWidth, MODE_TABS_HEIGHT)
        .setOrigin(0)
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, () => {
          if (mode !== this.selected) {
            this.select(mode);
            onSelect(mode);
          }
        });
      this.add([background, label, hitArea]);
      return { mode, background, label };
    });
    this.redraw();
    scene.add.existing(this);
  }

  /** Highlights a tab without firing the callback. */
  select(mode: GameMode): void {
    this.selected = mode;
    this.redraw();
  }

  private redraw(): void {
    for (const { mode, background, label } of this.tabs) {
      const active = mode === this.selected;
      background.clear();
      background.fillStyle(active ? COLORS.accent : COLORS.panel, 0.96);
      background.fillRoundedRect(0, 0, this.tabWidth, MODE_TABS_HEIGHT, 6);
      background.lineStyle(1.5, COLORS.accent, active ? 1 : 0.6);
      background.strokeRoundedRect(0, 0, this.tabWidth, MODE_TABS_HEIGHT, 6);
      label.setColor(active ? CSS.black : CSS.accent);
    }
  }
}
