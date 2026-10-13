import { GAME_MODES, type GameMode } from '../../shared/api';
import { MODES, type RunOptions } from '../modes';
import { CSS, FONTS } from '../theme';
import { Button } from '../ui/Button';
import { MenuScene } from '../ui/MenuScene';
import { addText, addTitle } from '../ui/text';

const FIRST_ROW = 150;
const ROW_SPACING = 96;

/** Shown after PLAY: the player picks a level before every first run. */
export class LevelSelect extends MenuScene {
  protected readonly designWidth = 560;
  protected readonly designHeight =
    FIRST_ROW + ROW_SPACING * GAME_MODES.length + 50;

  constructor() {
    super('LevelSelect');
  }

  protected build() {
    const cx = this.designWidth / 2;
    const rows = GAME_MODES.flatMap((mode, i) => {
      const y = FIRST_ROW + i * ROW_SPACING;
      const { label, description, ranked } = MODES[mode];
      return [
        new Button(this, cx, y, label, () => this.play(mode), {
          width: 380,
          height: 54,
          variant: ranked ? 'primary' : 'secondary',
        }),
        addText(this, cx, y + 42, description, {
          fontFamily: FONTS.body,
          fontSize: '18px',
          color: CSS.muted,
        }).setOrigin(0.5),
      ];
    });

    return [
      addTitle(this, cx, 44, 'CHOOSE LEVEL', 40, this.designWidth - 48),
      addText(this, cx, 92, 'Only RANKED scores count on the leaderboards', {
        fontFamily: FONTS.body,
        fontSize: '18px',
        color: CSS.saber,
      }).setOrigin(0.5),
      ...rows,
      new Button(this, cx, this.designHeight - 30, 'BACK', () => this.back(), {
        width: 200,
        height: 46,
        variant: 'secondary',
      }),
    ];
  }

  /** 1-4 pick a level, Enter plays ranked, Escape goes back. */
  protected override onKey(event: KeyboardEvent) {
    const byNumber = GAME_MODES[Number(event.key) - 1];
    if (byNumber) {
      this.play(byNumber);
    } else if (event.key === 'Enter') {
      this.play('ranked');
    } else if (event.key === 'Escape' || event.key === 'Backspace') {
      this.back();
    }
  }

  private play(mode: GameMode) {
    const options: RunOptions = { mode };
    this.scene.start('Game', options);
  }

  private back() {
    this.scene.start('MainMenu');
  }
}
