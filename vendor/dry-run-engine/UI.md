# UI build brief, version 2

**This replaces version 1 entirely.** Delete the old UI.md. Anything built to it is a
starting point, not a spec to preserve.

The design is settled and exists as screens. Open the canvas linked in HANDOFF.md before
building anything. It is the source of truth for look, and where this document and the
screens disagree, the screens win.

---

## What changed from version 1, and why

Version 1 produced a screen with text on black and nothing else. Three calls in it were
wrong:

| Version 1 said | Why it was wrong | Version 2 |
|---|---|---|
| No illustration | Removed the main visual element and put nothing in its place | Flat geometric SVG, drawn in code, one per decision |
| No onboarding | The player opened straight into a decision with no idea what they were playing | A landing screen, built first |
| Bars in step 3 | The bars are the feedback. Without them, choices produce no visible result | Bars in step 2, on every screen with room |

---

## Stack

Unchanged from version 1. It was not the problem.

| Layer | Choice |
|---|---|
| Everything | Plain HTML, CSS, ES modules. No build step, no npm |
| Engine | Imported as-is from `engine/`. Never reach past its interfaces |
| Formatting | `text/`. The engine returns numbers, `text/` returns words |
| Save | `localStorage`, one key |

---

## The look

### Colour

| Token | Hex | Job |
|---|---|---|
| `--ink` | `#0E1016` | Ground |
| `--ink-raised` | `#1A1E29` | Cards, bar troughs |
| `--bone` | `#F2ECE0` | Primary text |
| `--slate` | `#7C8296` | Secondary text, labels |
| `--marigold` | `#F0A830` | Money. The single loudest colour in the product |
| `--teal` | `#4FB79E` | A bar moving the right way |
| `--vermilion` | `#D6402C` | A bar moving the wrong way, danger |
| `--deep` | `#1B3A5C` | Illustration ground |

Marigold is reserved for money and the primary action. If it starts appearing on labels
and icons it stops meaning anything.

### Type

Two families, both carrying Devanagari, so Hindi and Tamil later are a
content job and not a redesign.

| Face | Role | Weights |
|---|---|---|
| Noto Serif Devanagari | Display: situation text, money figures, headings, the play button | 500, 700, 800 |
| Mukta | Body: option labels, secondary text, everything small | 400, 600 |

Money uses `font-variant-numeric: tabular-nums` everywhere. Without equal-width digits the
number changes width as it counts and the animation jitters. Noto Serif Devanagari has no
`tnum` feature: its digits are one width at every weight by default, which is what keeps a
counting figure steady. Any replacement display face must pass the same fontTools check:
Devanagari, the rupee sign, and equal-width digits, by default or through `tnum`.

### Illustration

Flat geometric SVG, written as code in the page, not sourced files. The payslip in the
month 1 screen is rectangles. The Dry Run mark is 24 lines round a circle.

Rules:

1. One illustration per decision, filling the top third, on a solid colour block.
2. Built from rectangles, circles and simple paths. No gradients, no shadows, no emoji,
   no icon fonts.
3. On the consequence screen the same illustration stays, desaturated, so the player
   knows they are still in the same moment.
4. If a decision has no illustration yet, the colour block ships empty. Never filler.
5. The block bleeds: it always runs the full width of the screen, edge to edge, and the
   lighter disc behind each drawing runs off the screen at its corner, at every size of block
   (ruled 31 October 2026). The disc and the subject are two layers: the disc keeps to its
   corner, and the subject is scaled to the block's height and centred on its own bounds.
   Before, on a phone shorter than the artboard, the block was wider than the drawing and the
   whole drawing was shrunk into its middle, so the disc floated short of the edge and a
   subject composed to lean away from its disc, such as D01's payslip, sat left of centre
   with an empty field beside it. In iOS Safari the block also came in from both edges and
   cut the disc, because it was sized by an aspect-ratio under a max-height
   (`game/screens/illustrations.js`). On a phone the decision's illustration takes whatever
   the words and options leave, so there is no empty space above the options (style.css,
   "The decision, on a phone").

This scales to 30 decisions without hiring anyone, and stays consistent because the
vocabulary is small.

---

## Screens

Six exist as designed artboards. Build them to match.

| Screen | Purpose | Leaves |
|---|---|---|
| Landing | Says what the game is and what it tracks, starts the run | Tap Begin |
| Home | Four bars, net worth, month and age, streak, one button. Top right, "How it works". Waiting for tomorrow, a second, smaller action under the button: "Play the next month now" (rule 9) | Tap play |
| How it works | The landing's lede and bullets, and what each of the four measures, read-only. Testers only: "Start again" | Close, top or foot |
| Month card | "Month 14. You are 23." Salary line, when there is salary | Auto, 2s |
| Decision | Illustration, situation, 2 to 4 option cards | Tap an option |
| Consequence | Chosen card stays, result line, the affected bar visibly moves. The first time a bar moves, one line says what it measures | Auto, 2.5s, tappable. 5s when it carries a bar's line |
| Callback | Deferred text on a bare ground | Auto, 3.5s, tappable |
| Month close | Net worth counts, three bars, concept card, the hook. Month 1 only: a line under net worth and each bar says what it measures | Tap to close |

### The landing screen

Built first, not last. It carries:

- What the game is, in three lines
- Three bullets: choices pay out later, the four things the player is tracked on, no real money
- One button
- The disclaimer: educational simulation, not investment advice

**No name field.** Cut 30 September 2026 (`ONBOARDING.md` section 5): nothing read it, it was a
decision before the first real one, and it was the only personal data the game collected.

**On age.** The player does not choose one. Everyone starts at 22, because every decision,
every constant in section 12 and the whole 240-month arc is written for that age. Starting
at 30 would mean Chapter 1 explaining a first payslip ten years late, an arc ending at 50,
and a different value for every constant. The landing copy should make clear the player is
stepping into a life, not entering their own details. Different starting situations are
scenario packs, Phase 2, and a content job rather than a settings screen.

---

## The rules that matter

1. One thing on screen at a time. No bars visible during a decision.
   **One named exception, ruled 28 September 2026: net worth on the decision screen.** It
   sits at the right of the month line, in marigold. A player choosing rent, the largest
   commitment in the chapter, with no balance on screen was the single worst gap in the
   first session, and a number at the top of the screen is not a bar. It is the engine's
   figure before the choice and does not move there; the month close is still where it
   counts. **Narrowed 29 September 2026: not on the month card.** Each screen has one job.
   The month card's is where you are and what is coming; the decision screen's is what you
   have. Net worth on the month card also contradicted it: it showed ₹20,000 above "Salary
   credited. ₹41,300 in.", when the salary is not in that figure until the month runs.
   Net worth is not cash: whether the player should see cash, net worth or both is open
   (`FIRST-SESSION.md` section 6).
   **On a desktop window (900 px and up, 31 October 2026):** net worth and the bars stand in a
   rail beside the screens (`game/rail.js`, `game/desktop.css`). The rule holds there: during a
   decision the rail shows where the player is and net worth, and its bars stand down until the
   result.
2. Never make the player tap Continue on a consequence. It auto-advances.
3. Money is the largest type in the product and animates when it changes.
4. A falling number is vermilion, a rising one teal. The colour arrives before the player
   has read the number. Bar colour means change, not level, everywhere in the product: teal
   rose, vermilion fell, slate did not move. How full the bar is shows the level. One
   exception: Safety below `SAFETY_DANGER_MONTHS` of runway (maths doc section 12) is
   vermilion whatever it did this month. That is a warning, not a level. The engine answers
   it with `safetyInDanger`, so the threshold is never a number in the UI.
5. One-handed thumb operation. Option cards sit in the bottom half. 6 to 12 taps per
   session.
6. Every screen works at 320px. Test at 320 by 568, 360 by 640 and 390 by 844: the height
   matters as much as the width. A decision whose last card would end below the screen
   takes the compact layout four-option decisions always use, measured once it is on the
   page (ruled 28 September 2026). At 320 by 568, in Daylight, that is D01, D02, D03, D04,
   D05, D11, D15, D16, D19, D21 and D29, besides the four-option D07, D14, D17 and D28. If the
   compact layout still runs over, the illustration gives up the rest, down to a 64px strip:
   at 320 by 568 only D14 needs it, as two of its four cards take two lines.
   Checked for all 30 decisions at all three sizes, with the game's own stylesheets and
   fonts (scripts/check_decision_fit.py); the words are never cut to fit.
7. Colour never appears on an unchosen option. Every option card has the same neutral left
   edge. Teal means good and vermilion means bad, so a coloured option tells the player the
   answer before they have thought about it, and no option is obviously correct at the
   moment of choosing. Colour arrives after the choice, on the consequence screen, where it
   means something.
   The same holds for illustrations: an illustration never colours one option's object
   differently from another's, and never uses teal or vermilion to mean good or bad.
   Colour used because that is what the object looks like is fine: a vermilion payslip
   header, a jewellery box lining, a seal, a low battery. It took four fixes to learn
   this: D16's teal seedling, D04's teal coin, D24's marigold door knob and D29's marigold
   doorway. An earlier, stricter wording, "colour in an illustration belongs to money, or
   to nothing", was the product owner's and was wrong: it would have stripped colour from
   thirteen drawings where the colour points at no option.
8. **Explain the board, never the moves.** Ruled 30 September 2026. The player is told what
   the pieces are and what the game is for. They are never told which choice is right.
   - **Explain nothing:** the decision screen, results, callbacks and concept cards. These
     are the moves. A hint of the right answer here breaks the product and the SEBI
     position: education, never advice.
   - **Explain the board:** the landing, the month card, the month close and Home. These
     say what the game is, what a month is, what each bar measures and what the player is
     aiming at.
   - **One place the board appears on a move screen:** the first time a bar moves on a
     result, one line says what that bar measures. It explains the bar, never the choice:
     nothing in it says whether the move was good.

   This replaces the spec's "nothing is explained". That principle was right about the moves
   and wrong about the board: a new player who did not know what the game was or what the
   bars meant left in seconds (`ONBOARDING.md`).

   Built 30 September 2026: each bar's line under it the first time it moves on a result
   (the result holds 5 seconds instead of 2.5), all four at the month 1 close, once per player
   (`game/screens/bar-lines.js`, `game/save.js`). Every line is slate and the same whichever
   way the bar moved, so it never reads as a verdict. Home marks where good is on each bar,
   with no words (`barMarks`, maths doc section 12).

   The month 1 close carries the most of any screen. On a 320 by 568 phone it scrolls, by
   about 104 px, and Close is reached by scrolling: once per player, on a screen with no timer
   (ruled 30 September 2026). It is the one exception to the button staying in reach. The hook
   stays on every close, month 1's included: it is the reason to come back tomorrow.
9. **One month a day is the pace, not a wall.** Ruled 31 October 2026 by the product owner,
   deliberately relaxing step 5's one session per day. Until then a closed month locked Home
   until the next calendar day, from month 1 on, with no way past it.
   - **The first sitting:** a new run plays its first three months in one go
     (`FIRST_SITTING_MONTHS` in `game/config.js`). Home first waits for tomorrow once month 3
     has closed.
   - **Play the next month now:** every Home that waits for tomorrow keeps "Come back
     tomorrow" as its button, the main thing on the screen, and under "One month a day. Month
     {n} is waiting." offers "Play the next month now". It is a line of text, not a second
     button the size of the first, so it reads as the exception. It costs nothing: the
     streak counts days, so another month the same day leaves it where it was, and nothing
     marks the month as played early.
   - **The days it took:** the save records the day the run began and the day each chapter
     closed. The chapter report says how long the chapter took, plainly and without a
     verdict: "24 months, played over nine days." A run begun before the save recorded its
     first day shows the months alone; its days are not known, and are not guessed.

   Why: a gate that stops a player who wants to carry on teaches them that the game stops
   them, and after one month a new player has seen too little to know what the game is: the
   point of it is that choices pay out months later. One month a day stays the way the game
   is meant to be played, and the default; playing on is offered, never pushed, and the
   report shows which the player chose without judging it.

   The save format did not change version: the new fields sit beside the old ones and an
   older save is read with them filled in, so no existing run is lost (`game/save.js`). A save
   that no longer reads or replays is set aside under its own key, not deleted.

---

## Motion, as built

Recorded 28 September 2026, ruled by the product owner: **the first ninety seconds of the game
contain about two seconds of movement.** This is a design fact, not a bug. No animation is to
be added until the product owner decides to, with these numbers in front of them.

Measured on the built site in Chrome with reduced motion off, choosing D01-A then D02-A, every
animated element sampled every 100 ms in real time (`FIRST-SESSION.md` section 2).

| When, roughly | Screen | What moves | How long |
|---|---|---|---|
| 0 to ~20 s | Landing | **Since 30 September 2026, the first time only:** the title's lines rise in, the lede and bullets fade in, then the mark's ticks draw round and the first nine turn marigold (`LANDING-MOTION.md`, A and E). On phones 640 px tall or more, a band above the title fades through D10, D23 and D22 and stops on D26 (B), about 10 s. Any tap finishes all of it. After that, nothing. The button dips 1 px while pressed | Opening about 1.8 s, once |
| ~20 s | Month card | Nothing | Held 2.0 s, cannot be tapped away |
| ~22 s | D01 decision | Nothing | |
| ~40 s | D01 consequence | The timer line along the bottom. No bar after D01-A or D01-B; D01-C moves Freedom 100 to 91 | Timer 2.5 s, linear. Bar, D01-C only: waits 0.3 s, moves 0.7 s |
| ~43 s | D02 decision | Nothing | |
| ~60 s | D02 consequence | Timer line, and the Freedom bar falls: to 40 for the studio, 70 for the shared flat, 80 for the room | Bar still for 0.3 s, moving 0.3 s to 1.0 s. Screen leaves at 2.5 s |
| ~63 s | Month 1 close | Net worth counts up from ₹20,000. Safety, Freedom and Life move | Count 1.2 s, easing out. Bars wait 0.2 s, move 0.9 s |
| After Close | Home | Nothing | |

Added 30 October 2026, at the product owner's request, after the ninety seconds above: **the
turn of a chapter.** When month 24 closes, a screen of its own stands between the close and the
chapter card (`game/screens/chapter-turn.js`). The mark's 24 ticks are lit but the last; the last
lights (0.3 s), the light runs once round the ring (about 1.2 s), the mark settles with a small
overshoot (0.5 s), and the label, the title and the ages rise in as the landing's title does.
About 2.6 s of movement; the screen leaves at 4.2 s. A tap while it moves finishes it, a tap once
it is still leaves, and under reduced motion it stands still. The screens either side of it are
still cuts.

Every change of screen is a cut, with no transition. In total: at most two bar movements of
0.7 s each and one 1.2 s count, and nothing at all on the landing screen, the month card, the
decisions or Home, where the player spends almost all of the ninety seconds.

Two things make it less in practice. Most choices move no bar at the moment of choosing,
because most effects land when the month runs (maths doc section 14): in month 2, five of six
options move nothing, and the sixth moves Safety by 2.8 points. And a tap on "tap to continue"
leaves the consequence at once, before its bar has started.

With reduced motion on, the bars jump and net worth appears at its final figure
(`game/style.css`, `game/screens/month-close.js`).

---

## Build order

Each step works and is shown before the next begins.

| Step | What | Done when |
|---|---|---|
| 1 | Landing screen, name field, colour tokens and type loaded | It matches the artboard at all three widths |
| 2 | Decision and consequence, with illustration and a moving bar | D01-C plays and the Freedom bar visibly moves |
| 3 | The full session loop, month card through hook | Month 1 plays end to end |
| 4 | Home with four live bars and net worth | The bars match the engine |
| 5 | Save and resume, one session per day (relaxed 31 October 2026: rule 9) | Closing and reopening continues where you were. Since 28 September 2026 reopening always lands on Home; partway through a month, Home lists the choices made so far with their result lines, and its button replays the month card and continues (`FIRST-SESSION.md` section 1) |
| 6 | Progress timeline | Tap any month, see what you chose |
| 7 | Streak, concept unlocks, chapter report | Chapter 1 is playable start to finish |

Stop after each. Screenshot at all three widths.

---

## Rules for the build

1. The UI never computes a game number. Ask the engine.
2. The UI never formats a number. Ask `text/`. The one exception is intermediate frames of
   a counting animation, which are display only and always end on the engine's figure.
3. If a screen needs content the sheet does not have, stop and ask. Do not write copy.
4. Same seed, same choices, same run.
   The decision screen shows the options `decisionsForMonth` returns, which are only those the
   player's state offers (maths doc rule 29). The UI never lists options from the sheet itself.
5. Colour tokens live in one CSS file. No hex values scattered through the markup.
6. The design never disagrees with what shipped. When a ruling changes the build away from
   an artboard, the artboard in `design/` is updated in the same change.

---

## Still open

- **The product name.** Closed: Dry Run, in `PRODUCT_NAME` in `game/config.js`. Decided, not
  trademark-checked (HANDOFF.md section 7).
- **Concept card text.** Built: `concept_title` and `concept_body` on the sheet (v24), the
  product owner's copy, 20 cards. Months 7, 13, 19 and 23 carry none, deliberately.
- **The hook line.** Built: `hook_line` on the sheet (v23), the product owner's copy, under the artboard's "Next month" label. Month
  24's close has none; the chapter report goes there. It goes on the locked Home as well as
  at month close: "Next month, your mother's friend has a policy
  she wants you to sign" belongs on the screen a returning player sees most, because that
  is where the reason to come back should live. The locked Home (`design/HomeLocked.html`)
  has "Come back tomorrow" and "One month a day. Month {n} is waiting."; the hook sits
  with them. Since 31 October 2026 "Play the next month now" sits under them (rule 9).

- **The timeline's own artboard.** Step 6 built the progress timeline from other screens'
  parts: Home's heading and month line, the consequence's chosen card, month close's chip.
  It is the share screen, the one players screenshot, and it deserves a design of its own.
- **Words for a continued month.** Closed 28 September 2026: "Carry on with the month" on
  the button and "This month so far" over the list, the product owner's copy. Drawn in
  `design/HomeContinue.html`.
- **Dark or paper.** The canvas holds a paper version of the decision screen for
  comparison. Dark is the default until decided otherwise.
