import * as Phaser from 'phaser';
import { COLORS, CSS, FONTS } from '../theme';
import { Button } from '../ui/Button';
import { fitToViewport } from '../ui/layout';
import { MenuScene } from '../ui/MenuScene';
import { addText, addTitle } from '../ui/text';

type Tone = 'accent' | 'danger' | 'gold' | 'violet' | 'ice';

type Section = {
  heading: string;
  body: string;
  /** Heading colour; matches the meteor it describes. */
  tone?: Tone;
};

const INTRO =
  'Meteors fall toward your ship, each with a word on it. Type the word to destroy the meteor before it crosses the red line.';

const SECTIONS: readonly Section[] = [
  {
    heading: 'LOCKING ON',
    body: 'The first letter you type picks a meteor that starts with it. Its word turns yellow as you type. Finish that word before starting another.',
  },
  {
    heading: 'DANGER WORDS',
    tone: 'violet',
    body: 'Violet meteors are fast and bounce off the sides. Their words are short. If one gets past you, you lose 2 or 3 points, but no heart.',
  },
  {
    heading: 'GOLDEN WORDS',
    tone: 'gold',
    body: 'Gold meteors are slow and carry long words. Finish one for 25 points. On HARD and RANKED it also destroys every other meteor on screen, and you score each one as usual (a heart on screen gives you its life). If one gets past you, you lose a heart.',
  },
  {
    heading: 'HEARTS',
    tone: 'danger',
    body: 'You start with 3 hearts. On EASY, MEDIUM and HARD, a red heart sometimes falls after you lose one. Type "heart" to get a heart back. Missing it costs nothing.',
  },
  {
    heading: 'COOLDOWN',
    tone: 'ice',
    body: 'On RANKED, once meteors speed up, an ice meteor with the word "cooldown" sometimes falls. Type it to freeze the sky: every meteor slows to half speed for 10 seconds. Missing it costs nothing.',
  },
  {
    heading: 'LEVELS',
    body: 'EASY: normal meteors only. MEDIUM: adds danger meteors. HARD: adds golden meteors. RANKED: the full game, where meteors keep getting faster and there are no hearts to collect. Each level has its own leaderboard.',
  },
  {
    heading: 'SCORING & COMBOS',
    body: 'You get 1 point per letter. Destroy meteors in a row to multiply your points: x2 at 5 in a row, x3 at 10 and x4 at 20. A wrong letter cuts your streak in half, and losing a heart resets it.',
  },
];

const DESIGN_WIDTH = 640;
const PADDING_X = 32;
const BODY_WIDTH = DESIGN_WIDTH - PADDING_X * 2;
/** Height of the pinned BACK / PLAY bar, in design units. */
const FOOTER_HEIGHT = 96;
const SCROLL_STEP = 60;
/** A pointer that moves further than this is scrolling, not tapping a button. */
const DRAG_THRESHOLD = 8;

/**
 * Long, readable instructions: the text keeps a comfortable size and scrolls
 * (wheel, drag, arrow keys) instead of shrinking to fit; BACK and PLAY stay
 * pinned at the bottom.
 */
export class Instructions extends MenuScene {
  protected readonly designWidth = DESIGN_WIDTH;
  protected designHeight = 0;
  private footer: Phaser.GameObjects.Container;
  private footerShade: Phaser.GameObjects.Rectangle;
  private scrollHint: Phaser.GameObjects.Text;
  private scroll = 0;
  private maxScroll = 0;
  private dragStartY: number | null = null;
  private dragStartScroll = 0;
  private dragged = false;

  constructor() {
    super('Instructions');
  }

  override create() {
    this.scroll = 0;
    this.dragged = false;
    this.dragStartY = null;
    super.create();

    this.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) =>
        this.scrollTo(this.scroll + dy)
    );
    this.input.on(
      Phaser.Input.Events.POINTER_DOWN,
      (pointer: Phaser.Input.Pointer) => {
        // worldY is in logical units (pointer.y is in device pixels).
        this.dragStartY = pointer.worldY;
        this.dragStartScroll = this.scroll;
        this.dragged = false;
      }
    );
    this.input.on(
      Phaser.Input.Events.POINTER_MOVE,
      (pointer: Phaser.Input.Pointer) => {
        if (this.dragStartY === null || !pointer.isDown) {
          return;
        }
        const moved = this.dragStartY - pointer.worldY;
        if (Math.abs(moved) > DRAG_THRESHOLD) {
          this.dragged = true;
        }
        if (this.dragged) {
          this.scrollTo(this.dragStartScroll + moved / this.content.scaleY);
        }
      }
    );
    this.input.on(Phaser.Input.Events.POINTER_UP, () => {
      this.dragStartY = null;
    });
  }

  protected build() {
    const cx = this.designWidth / 2;
    const objects: Phaser.GameObjects.GameObject[] = [
      addTitle(this, cx, 44, 'HOW TO PLAY', 46, this.designWidth - 48),
    ];

    const intro = addText(this, cx, 88, INTRO, {
      fontFamily: FONTS.body,
      fontSize: '26px',
      color: CSS.text,
      align: 'center',
      wordWrap: { width: BODY_WIDTH },
      lineSpacing: 3,
    }).setOrigin(0.5, 0);
    objects.push(intro);
    let y = intro.y + intro.height + 28;

    for (const { heading, body, tone = 'accent' } of SECTIONS) {
      const marker = this.add
        .rectangle(PADDING_X, y + 12, 5, 21, COLORS[tone])
        .setOrigin(0, 0.5);
      const headingText = addText(this, PADDING_X + 16, y, heading, {
        fontFamily: FONTS.display,
        fontSize: '21px',
        fontStyle: '900',
        color: CSS[tone],
      }).setLetterSpacing(2);
      const bodyText = addText(this, PADDING_X + 16, y + 32, body, {
        fontFamily: FONTS.body,
        fontSize: '24px',
        color: CSS.muted,
        wordWrap: { width: BODY_WIDTH - 16 },
        lineSpacing: 2,
      });
      objects.push(marker, headingText, bodyText);
      y = bodyText.y + bodyText.height + 22;
    }
    this.designHeight = y + 8;

    this.buildFooter(cx);
    return objects;
  }

  /** Content scales to the width only (never up) and scrolls vertically. */
  protected override layoutContent(width: number, height: number) {
    const scale = Math.min(1, width / this.designWidth);
    const footerHeight = FOOTER_HEIGHT * scale;
    this.content.setScale(scale);
    this.content.setX((width - this.designWidth * scale) / 2);
    this.maxScroll = Math.max(
      0,
      this.designHeight - (height - footerHeight) / scale
    );

    this.footerShade
      .setPosition(0, height - footerHeight)
      .setSize(width, footerHeight);
    fitToViewport(
      this.footer,
      this.designWidth,
      FOOTER_HEIGHT,
      width,
      footerHeight
    );
    this.footer.setY(height - footerHeight);
    this.scrollTo(this.scroll);
  }

  protected override onKey(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      this.scene.start('MainMenu');
    } else if (event.key === 'Enter') {
      this.scene.start('LevelSelect');
    } else if (event.key === 'ArrowDown') {
      this.scrollTo(this.scroll + SCROLL_STEP);
    } else if (event.key === 'ArrowUp') {
      this.scrollTo(this.scroll - SCROLL_STEP);
    } else if (event.key === 'PageDown' || event.key === ' ') {
      this.scrollTo(this.scroll + SCROLL_STEP * 5);
    } else if (event.key === 'PageUp') {
      this.scrollTo(this.scroll - SCROLL_STEP * 5);
    }
  }

  private buildFooter(cx: number) {
    this.footerShade = this.add
      .rectangle(0, 0, 1, 1, 0x000000, 1)
      .setOrigin(0)
      .setDepth(10);
    this.scrollHint = addText(this, cx, 10, 'SCROLL FOR MORE', {
      fontFamily: FONTS.display,
      fontSize: '11px',
      fontStyle: '700',
      color: CSS.muted,
    })
      .setOrigin(0.5)
      .setLetterSpacing(3);
    const buttonY = FOOTER_HEIGHT / 2 + 8;
    this.footer = this.add
      .container(0, 0, [
        this.scrollHint,
        new Button(this, cx - 120, buttonY, 'BACK', () => this.back(), {
          width: 200,
          height: 54,
          variant: 'secondary',
        }),
        new Button(this, cx + 120, buttonY, 'PLAY', () => this.play(), {
          width: 200,
          height: 54,
        }),
      ])
      .setDepth(11);
  }

  private scrollTo(value: number) {
    this.scroll = Phaser.Math.Clamp(value, 0, this.maxScroll);
    this.content.setY(-this.scroll * this.content.scaleY);
    this.scrollHint.setVisible(this.scroll < this.maxScroll - 1);
  }

  /** Button handler; ignores the tap that ends a drag-scroll over it. */
  private back() {
    if (!this.dragged) {
      this.scene.start('MainMenu');
    }
  }

  /** Button handler; ignores the tap that ends a drag-scroll over it. */
  private play() {
    if (!this.dragged) {
      this.scene.start('LevelSelect');
    }
  }
}
