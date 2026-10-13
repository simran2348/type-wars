import { GAME_MODES, type GameMode } from '../../shared/api';
import { DEFAULT_MODE, MODES, type RunOptions } from '../modes';
import { Button } from '../ui/Button';
import { MenuScene } from '../ui/MenuScene';
import { addTitle } from '../ui/text';

const FIRST_ROW = 130;
const ROW_SPACING = 74;

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
    return [
      addTitle(this, cx, 44, 'CHOOSE LEVEL', 40, this.designWidth - 48),
      ...GAME_MODES.map(
        (mode, i) =>
          new Button(
            this,
            cx,
            FIRST_ROW + i * ROW_SPACING,
            MODES[mode].label,
            () => this.play(mode),
            {
              width: 380,
              height: 54,
              variant: mode === DEFAULT_MODE ? 'primary' : 'secondary',
            }
          )
      ),
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
      this.play(DEFAULT_MODE);
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
