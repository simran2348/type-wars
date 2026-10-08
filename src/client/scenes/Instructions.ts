import type * as Phaser from 'phaser';
import { COLORS, CSS, FONTS } from '../theme';
import { Button } from '../ui/Button';
import { MenuScene } from '../ui/MenuScene';
import { addText, addTitle } from '../ui/text';

type Section = { heading: string; body: string };

const INTRO =
  'Meteors are falling toward your starfighter. Each one carries a word. Type the word to blast the meteor out of the sky before it reaches you.';

const SECTIONS: readonly Section[] = [
  {
    heading: 'TYPE TO SHOOT',
    body: 'Just start typing. Every correct letter fires a blaster bolt, and finishing the word destroys the meteor. No aiming or clicking needed, and capital letters never matter.',
  },
  {
    heading: 'LOCKING ON',
    body: 'Your first letter locks onto the most dangerous meteor whose word starts with it. A yellow reticle marks the target and typed letters turn yellow. Finish that word before starting the next.',
  },
  {
    heading: 'MISTAKES',
    body: 'A wrong letter does not advance the word and the target flashes red. Mistakes never cost a life, but they halve your combo.',
  },
  {
    heading: 'LIVES',
    body: 'You have 3 ships. Every meteor that crosses the red line costs one and resets your combo. Lose all 3 and the game is over.',
  },
  {
    heading: 'SCORING & COMBOS',
    body: 'Each meteor is worth 1 point per letter, so a 3-letter word scores 3 and long words pay more. Destroy meteors in a row to build a combo: 5 in a row doubles your points, 10 triples them and 20 quadruples them.',
  },
  {
    heading: 'DIFFICULTY',
    body: 'The longer you survive, the faster and more frequent the meteors become, and longer, harder words start to appear. Short words fall faster; long words fall slower.',
  },
  {
    heading: 'LEADERBOARDS',
    body: "Your best score is saved under your Reddit username on Today's Best (resets at midnight UTC) and All Time.",
  },
  {
    heading: 'ON PHONES & TABLETS',
    body: 'A letter keyboard appears below your ship while you play. Tap the letters to shoot; a physical keyboard works too.',
  },
];

const PADDING_X = 36;
const BODY_WIDTH = 640 - PADDING_X * 2;

export class Instructions extends MenuScene {
  protected readonly designWidth = 640;
  protected designHeight = 0;

  constructor() {
    super('Instructions');
  }

  protected build() {
    const cx = this.designWidth / 2;
    const objects: Phaser.GameObjects.GameObject[] = [
      addTitle(this, cx, 40, 'HOW TO PLAY', 38),
    ];

    const intro = addText(this, cx, 78, INTRO, {
      fontFamily: FONTS.body,
      fontSize: '21px',
      color: CSS.text,
      align: 'center',
      wordWrap: { width: BODY_WIDTH },
      lineSpacing: 2,
    }).setOrigin(0.5, 0);
    objects.push(intro);
    let y = intro.y + intro.height + 22;

    for (const { heading, body } of SECTIONS) {
      const marker = this.add
        .rectangle(PADDING_X, y + 10, 4, 17, COLORS.accent)
        .setOrigin(0, 0.5);
      const headingText = addText(this, PADDING_X + 14, y, heading, {
        fontFamily: FONTS.display,
        fontSize: '17px',
        fontStyle: '900',
        color: CSS.accent,
      }).setLetterSpacing(2);
      const bodyText = addText(this, PADDING_X + 14, y + 26, body, {
        fontFamily: FONTS.body,
        fontSize: '19px',
        color: CSS.muted,
        wordWrap: { width: BODY_WIDTH - 14 },
        lineSpacing: 1,
      });
      objects.push(marker, headingText, bodyText);
      y = bodyText.y + bodyText.height + 16;
    }

    const buttonY = y + 34;
    objects.push(
      new Button(this, cx - 120, buttonY, 'BACK', () => this.back(), {
        width: 200,
        height: 50,
        variant: 'secondary',
      }),
      new Button(this, cx + 120, buttonY, 'PLAY', () => this.play(), {
        width: 200,
        height: 50,
      })
    );
    this.designHeight = buttonY + 46;
    return objects;
  }

  protected override onKey(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Backspace') {
      this.back();
    } else if (event.key === 'Enter') {
      this.play();
    }
  }

  private back() {
    this.scene.start('MainMenu');
  }

  private play() {
    this.scene.start('Game');
  }
}
