# Ghost Run

Ghost Run takes a finished life from the Chapter 1 simulation and replays it. You can fork it at
any choice to see the ghost, the life you would have had with the other option.

## Layout

- `runner/` replays a save (`replay.js`) and forks it at a choice (`fork.js`). Both timelines run
  through the same engine code, so a fork that takes the player's own option is byte-identical
  to the real run.
- `verify/` checks a narration of a fork. Every figure must be a token resolved from the fork
  result, and `verify/render.js` is the only place figures are formatted.
- `agent/rank.js` forks a save at every choice and orders the forks by a score, `surprise` as
  ruled; `scripts/measure-rank.mjs` measures the candidates.
- `web/demo/save.json` is a finished 24-month save for the UI to load (see `web/demo/README.md`).
- `scripts/measure-forks.mjs` measures how often a fork's ghost cannot take a later real choice.
  `reports/` holds the measurements.
- `web/daylight.css` is the game's visual direction, Daylight, laid over the vendored game.
- `web/index.html` is the landing page, served at the site root (`web/landing.js`,
  `web/landing.css`): what this is and Play, how a month works with month 7 of the demo life to
  try, the six chapters from 22 to 42, the ghost run, and Play, which goes straight into the
  game. Two designs sharing a palette, a typeface and a voice: a phone's single column with a
  sticky Play bar, and from 900px a desktop layout of its own, with a header carrying Play, a
  two-column hero, the month inside a phone frame and the chapters across the width. Its figures
  come from `web/landing-model.js`, and its written words are checked against the engine and the
  chapter plan by `web/test/landing-model.test.js`. Chapter one is open; chapters two to six say
  Locked. The chapter two sign-up is connected to nothing yet, and says so.
- `web/ghost.html` is the ghost flow, served at `/ghost/`: the finished demo life, and any choice
  in it forked in the browser and drawn against the real run, with its narration and every attempt
  at it checked by `verify()`. Five steps, one screen each (`web/ghost.js`): your run, choose a
  moment, the split, where it ended, what happened. `web/ui.js` is the drawing both pages share.
  `/game/` serves the playable game from `vendor/` (see `vercel.json`).
- `agent/narrate.js` asks a model for one candidate narration of a fork, `agent/prompt.js` is what
  the model is told, and `agent/narration-loop.js` retries with the failures, up to four attempts.
  `api/narrate.js` is the Vercel function the browser calls. Responses are cached in
  `cache/narrations/`.

`npm test` runs every test. `npm run dev` serves the site locally with the narration route, as
Vercel does. The one dependency, the Anthropic SDK, is used only by the narration function.

## Narration

The browser posts a fork of the demo life to `/api/narrate`. The function forks the save itself,
asks the narrator, checks each answer with `verify()` and the same-money lead, and on a rejection
sends the reasons back and asks again, up to four attempts. It returns every attempt; the browser
checks each one again before the panel shows it.

Settings are environment variables, in Vercel's project settings or a local `.env.local`, which
git ignores. Keys never go in the repo, the browser or a commit.

| Variable | What it does |
|---|---|
| `NARRATE_PROVIDER` | `meta`, `claude` or `stub` (default). Only the server chooses |
| `NARRATE_LIVE` | `1` lets a paid provider make calls. Otherwise it answers only from `cache/narrations/`, with no network |
| `MODEL_API_KEY` | Meta's Model API key (Meta's own name for it) |
| `ANTHROPIC_API_KEY` | Claude's key |
| `NARRATE_META_MODEL`, `NARRATE_CLAUDE_MODEL` | Override the model: `muse-spark-1.3` and `claude-opus-5-5` by default |
| `NARRATE_STUB_MISTAKES` | `1` makes the stub type a figure on its first attempt, to see a rejection and a retry |

Every paid response is cached on disk by fork and attempt, so running a fork again costs nothing,
and the committed cache lets the demo narrate with no network. Only the demo save is accepted, so
the forks a paid model can be asked about are finite.

## Motion and sound

`web/motion.js` runs the ghost screen's motion with `requestAnimationFrame` and the Web
Animations API, no libraries. The fork screen's hero is the ghost line drawing itself from the
split month, ringing each month where the ghost could not take the real choice as it passes.
Figures count instead of cutting, and bars move from their old value to their new one: a rise
overshoots and settles, a fall is flatter and quicker. The run's 24 month ticks fill. Moving
between steps is a cut, as every change of screen in the game is (`vendor/dry-run-engine/UI.md`,
"Motion, as built"): the motion is inside a step, and plays the first time the step is reached.
The landing page uses the game's landing motion, its title rising and its mark's ticks drawing,
and each section rises in as it comes on screen. It makes no sound.

- Under `prefers-reduced-motion`, everything lands on its finished state at once.
- A tap or key press anywhere finishes every running animation and waiting step first.
- Motion moves transforms, opacity, stroke offsets and widths inside fixed tracks, never layout,
  so it cannot change whether a screen fits.
- Leaving a screen drops its motion where it is, so nothing of it plays over the next one.

`web/sound.js` synthesizes every sound with Web Audio: a tap, a choice, the chapter closing, a bar
rising or falling, and the ghost line landing. The audio context starts on the first tap. Sound is
on by default; the mute control, in the dock at the foot of every step beside Back and Next, is
remembered in `localStorage`.
Choosing a fork and the ghost line landing give a short vibration where `navigator.vibrate`
exists. The mute control is about sound only, so it doesn't turn vibration off.

## vendor/

`vendor/dry-run-engine/` is the prior work Ghost Run is built on: the engine, the sheet's
content, the copy and the game. The folder keeps its original name. For Daylight, two changes
were made to it, and only these:

- The displayed product name, now "Ghost Run" in the game's page title, its favicon title and
  `PRODUCT_NAME` in `game/config.js`.
- One added line in `game/index.html`, `<link rel="stylesheet" href="/web/daylight.css">`, after
  the game's own stylesheets. It loads the Daylight look (`web/daylight.css`, with Baloo 2 in
  `web/fonts/`) as an override: every token in `game/tokens.css` is redefined there, and nothing
  in `tokens.css` or `style.css` is edited. The path is absolute, so a server that does not
  serve `web/` at the root, such as `scripts/screenshot_ui.py`, shows the original dark game.
- One changed line in `game/index.html`: the `theme-color` meta is the Daylight paper ground,
  `#FBF4E6`, so a phone's browser bar matches the page. Together with the link above, these are
  the only two lines of `vendor/` changed for Daylight.

Those changed no engine logic, content, copy or numbers.

Separately, on the `chapter-2` branch only, the game's own content has grown by the opening of
chapter two (sheets v35 and v36), done in
`vendor/` because that is where the game's content, pipeline and checks live. The engine's logic
is unchanged, and so is `text/`. What changed:

- `chapter1_decisions_v34.xlsx` (the name is kept, since four scripts read it): ten decisions,
  D31 to D40, months 25 to 30, exported by `scripts/xlsx_to_json.py` to `data/chapter1.json` and
  `engine/decisions.js`. Every text field is a placeholder, `[PLACEHOLDER <id> <field>. Brief:
  ... States: ...]`, until the copy is written.
- `scripts/check_stated_terms.py` holds the 62 new stated terms to the sheet (rule 16), with one
  new check kind for a payment plan's total.
- `game/screens/illustrations.js`: D31 to D40, in the batches' tokens and style.
- The game: the chapter 1 report leads into chapter 2 through the turn of the chapter, opening
  (its ring has a tick for each of chapter 2's 36 months, `CHAPTER_MONTHS` in `game/config.js`;
  `game/main.js`, `game/screens/report.js`),
  `game/screens/opening-end.js` stands after month 30, and `game/save.js` replays a save past
  chapter 1 instead of dropping it.
- `calibration/`: chapter 2's opening measured to month 30, `REPORT-2026-10-30.md` and
  `REPORT-2026-10-30b.md`, and the findings in the maths doc, section 13. The opening has no ruled
  target. Placeholder copy is listed in `CHAPTER-2-PLACEHOLDERS.md`. Main never carries any of it.
- `scripts/decision_fit.html` renders every decision in the sheet, not only months 1 to 24.
- Tests that took chapter 1 as the whole sheet (`engine/test/`, `calibration/test/`) now say so
  per chapter.

On main and here, the end of chapter one has been added to the game, in `game/` only. Nothing in
`engine/`, `text/` or the sheet changed:

- When month 24 closes, the turn of the chapter plays first (`game/screens/chapter-turn.js`): the
  mark's 24 ticks, the last one lighting, the light running once round the ring, the mark
  settling, and "Chapter one closed", the chapter's title and "22 to 24" rising in, in the
  landing's motion language. It leaves by itself after 4.2 seconds (`CHAPTER_TURN_MS`). A tap
  while it moves finishes the motion; a tap once it is still leaves. Under reduced motion it
  stands still. The same screen opens a chapter (`way: "open"`), for when there is a next one to
  open. Its keyframes are in `game/style.css`, and UI.md's "Motion, as built" records it.
- Then the chapter card (`game/certificate.js` for the figures, `game/screens/certificate.js`
  for the drawing): net worth and its move over the two years, Safety, Freedom and Life with
  the line beside each, the shape of the two years as net worth month by month, and one line of
  the run's own figures. It is drawn on a canvas in the browser from the save, with no server,
  1200 by 627 px for a LinkedIn post, and "Save the card" downloads it as a PNG. Every figure
  comes from the engine and every amount is formatted by `text/`; `game/test/certificate.test.js`
  checks them against the demo life. The chapter report opens the card again ("Your chapter
  card"). The words on the card, its screen and the link are Ghost Run's, not the product owner's
  REPORT-COPY.md.
- `game/labels.js` holds the line beside Safety and Freedom, which `game/main.js` had, so the
  card and the report share it.

## Chapters three to six: the blocker

Chapters three to six are not started. They can't be, because the market isn't written that far.

Broad equity's script runs to month 240, the end of chapter six. Small caps' script stops at
month 40 (`SIMULATION-MATHS.md` section 7: "41 to 240, not yet authored"). The engine refuses to
guess past that point: `engine/market.js` throws "The small_cap script is authored through month
40, not month 41" when a run that holds small caps reaches month 41. Any run that took D20-A, B
or D can hold small caps, and a run still holding them at month 40 stops there.

Chapter three starts at month 61, but the wall is earlier: it falls at month 41, inside chapter
two (months 25 to 60). Chapter two can be written to month 40. Nothing after month 40 can run
for every player until the script is extended.

To lift it:

1. Author small caps from month 41 to month 240 in the section 7 table, regime by regime. The
   broad equity regimes are recovery from 41 to 60, a long rise from 61 to 120, a correction
   from 121 to 132, then mixed. Small caps should take the same events, rougher and with a
   higher long-run drift (about 13% a year against equity's 11%).
2. Regenerate with `python scripts/export_market_script.py`. That writes `data/market-script.json`
   and `engine/market-script.js`. Neither is edited by hand.
3. If a later chapter's copy depends on the market's direction, add a lesson window for it in
   the same section, then run `engine/test/market.test.js`. It checks every window's direction
   over 200 seeds.
4. Measure it: extend the calibration harness past month 30, with targets that section 13 doesn't
   set yet, and rule on the small cap figures that section 14 still lists as uncalibrated.
5. Only then write content past month 40. A callback that lands after month 40 is safe once
   steps 1 to 4 are done.

Until then, a decision whose callbacks land after month 40 can't be written, in chapter two or
later.
