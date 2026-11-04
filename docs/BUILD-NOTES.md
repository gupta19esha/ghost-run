# Build notes

The detail behind the [README](../README.md): the layout of the code, motion and sound, what changed in
`vendor/` and why, and the blocker on chapters three to six. Written as the work went, so where a
passage here and the README disagree about `vendor/`, the README is right.


Ghost Run takes a finished life from the Chapter 1 simulation and replays it. You can fork it at
any choice to see the ghost, the life you would have had with the other option.

## Layout

- `runner/` replays a save (`replay.js`) and forks it at a choice (`fork.js`). Both timelines run
  through the same engine code, so a fork that takes the player's own option is byte-identical
  to the real run.
- `verify/` checks a narration of a fork. Every figure must be a token resolved from the fork
  result, every sentence must hold a token and claim no cause, and `verify/render.js` is the only place figures are
  formatted. Each figure has one displayed value across the ghost flow: net worth to the rupee,
  bars in whole points, and a gap is the difference of the two values shown. A gap of nothing
  reads "the same as you".
- `verify/tokens.js` also gives a narration the middle of the run, each null where the run has
  none: when the money was furthest apart, the months the ghost led, the first bar to part, the
  ghost's lowest month after the split, the layoff and where each life stood, and whether the lead changed hands.
- `agent/rank.js` forks a save at every choice and orders the forks by a score, `surprise` as
  ruled; `scripts/measure-rank.mjs` measures the candidates.
- `web/demo/save.json` is a finished 24-month save for the UI to load (see `web/demo/README.md`).
- `scripts/measure-forks.mjs` measures how often a fork's ghost cannot take a later real choice.
  `reports/` holds the measurements.
- `web/daylight.css` is the game's visual direction, Daylight, laid over the vendored game.
- `web/index.html` is the landing page, served at the site root (`web/landing.js`,
  `web/landing.css`): what this is and its two ways in, "Start at month 1" and "Try it on a finished
  life", how a month works with month 7 of the demo life to
  try (with one line giving a reader outside India the scale of its rupees, in the game's
  figures, never converted), the six chapters from 22 to 42, the ghost run, and "Start at month 1", which goes straight into the
  game. Two designs sharing a palette, a typeface and a voice: a phone's single column with a
  sticky Play bar, and from 900px a desktop layout of its own, with a header carrying Play, a
  two-column hero, the month inside a phone frame and the chapters across the width. Its figures
  come from `web/landing-model.js`, and its written words are checked against the engine and the
  chapter plan by `web/test/landing-model.test.js`. Chapter one is open; chapters two to six say
  Locked. The chapter two sign-up posts the address to Formspree, and the line under it says the address is used only to tell you when chapter two is ready.
- `web/ghost.html` is the ghost flow, served at `/ghost/`: the finished demo life, and any choice
  in it forked in the browser and drawn against the real run, with its narration and every attempt
  at it checked by `verify()`. Five steps, one screen each (`web/ghost.js`): your run, choose a
  moment, the split (the landing hero's road, the ghost's branching off it), where it ended, what happened. `web/ui.js` is the drawing both pages share.
  `/game/` serves the playable game from `vendor/` (see `vercel.json`).
- `agent/narrate.js` asks a model for one candidate narration of a fork, `agent/prompt.js` is what
  the model is told, and `agent/narration-loop.js` retries with the failures, up to four attempts.
  `api/narrate.js` is the Vercel function the browser calls. Responses are cached in
  `cache/narrations/`.

`npm test` runs every test. `npm run dev` serves the site locally with the narration route, as
Vercel does. The one dependency, the Anthropic SDK, is used only by the narration function.

## Narration

The browser posts a fork of the demo life, or of the player's own finished run, to `/api/narrate`. The function forks the save itself,
asks the narrator, checks each answer with `verify()` and the same-money lead, and on a rejection
sends the reasons back and asks again, up to four attempts. It returns every attempt; the browser
checks each one again before the panel shows it.

Settings are environment variables, in Vercel's project settings or a local `.env.local`, which
git ignores. Keys never go in the repo, the browser or a commit.

| Variable | What it does |
|---|---|
| `NARRATE_PROVIDER` | `meta`, `claude` or `stub` (default). Only the server chooses |
| `NARRATE_LIVE` | `1` lets a paid provider make calls, for a player's own run only. The demo life is always answered from `cache/narrations/`, with no network |
| `MODEL_API_KEY` | Meta's Model API key (Meta's own name for it) |
| `ANTHROPIC_API_KEY` | Claude's key |
| `NARRATE_META_MODEL`, `NARRATE_CLAUDE_MODEL` | Override the model: `muse-spark-1.3` and `claude-opus-5-5` by default |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | The Redis that keeps the live-narration counts, set by Vercel's Upstash integration (`UPSTASH_REDIS_REST_*` also work). Without them nothing is narrated live |
| `NARRATE_STUB_MISTAKES` | `1` makes the stub type a figure on its first attempt, to see a rejection and a retry |

Every paid response for the demo is cached on disk by fork and attempt, and the committed cache is
all the demo is ever served from. A player's own run is narrated live within two limits kept in
Redis (`agent/limits.js`): `LIVE_PER_RUN`, 5 forks a run, and `LIVE_CALL_CEILING`, 3000 model
calls across everyone, counted before each call. A live narration that passed is kept in Redis for
90 days, so the same fork asked again costs nothing. Past a limit, or with no key or store, an own
run gets the template, and the page says why when a limit was the reason.

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

Separately, the end of chapter one has been added to the game, in `game/` only. Nothing in
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
  the line beside each, the shape of the two years as net worth month by month, one line of
  the run's own figures, and the twenty ideas the chapter taught, numbered, in order (UI.md rule
  10). It is drawn on a canvas in the browser from the save, with no server, 1200 by 1000 px,
  and "Save the card" downloads it as a PNG. Every figure
  comes from the engine and every amount is formatted by `text/`; `game/test/certificate.test.js`
  checks them against the demo life. The chapter report opens the card again ("Your chapter
  card"). The words on the card, its screen and the link are Ghost Run's, not the product owner's
  REPORT-COPY.md.
- `game/labels.js` holds the line beside Safety and Freedom, which `game/main.js` had, so the
  card and the report share it.

The game also has a desktop layout of its own, from 900 px wide (`game/desktop.css`, linked in
`game/index.html` after Daylight, and `game/rail.js`). Below 900 px nothing changes: screenshots
of the same screens before and after are identical at 360, 390 and 899 px wide.

- **The rail** holds where the player is, net worth and Safety, Freedom and Life, and stays put
  while the screens change beside it. From 1200 px it runs down the left; from 900 to 1199 px it
  is a band across the top, because a column there would leave the illustration about 220 px
  wide. Bars move in it as they do on the result screen, net worth counts in it as the month
  close counts, and the first-time line under a bar shows under the rail's bar. `game/main.js`
  says what it holds on each screen (`board()`), from the engine.
- **UI.md rule 1 holds:** during a decision the rail shows where the player is and net worth (the
  rule's one exception) and its bars stand down; they come back with the result.
- **The decision and the result split:** the illustration large on the left, in the shape it was
  drawn in, and the month, situation and options, or the chosen card and the result, on the
  right at a reading width. The month close splits the same way, net worth counting on the left
  in place of the drawing. The landing splits its pictures from its words, the chapter report
  reads in two columns, and Home, the timeline and How it works sit in a column of their own.

The timeline is a road, the landing hero's, in `game/` only (`game/screens/timeline.js`,
`game/timeline.js`'s `roadStops`, its styles in `game/style.css` and `game/desktop.css`). It runs
down a phone and across a desktop window. It opens each chapter, all dark, in place of a separate
screen (UI.md rule 11), and the chapter's progress opens it from Home, a decision and a month's close.
UI.md, "the timeline's own artboard", says what it holds.

After the chapter report, the one primary action is "Meet your ghost": `/ghost/?run=mine` runs the ghost
flow on the player's own save. An own run's narration is asked for live when the player reaches a
fork's last step, not at the split as the demo's is, since each fork counts against the run's five.
Past the limits it is `agent/plain.js`, built from the fork's tokens with no model, checked by
`verify()` in the browser and saying that it is a stand-in. Bare `/ghost/` is the demo life, and says so in its first line.
`scripts/check-road-fit.mjs` checks it and the split step's road at every size.

`scripts/check-game-fit.mjs` is the fit check for every screen at any size: it plays chapter one
through the real game in headless Chrome on virtual time, on two paths (each decision's first
option and its last), and fails if anything scrolls sideways, if a screen's button, timer or
last option ends below the window, or if the rail overflows. Desktop sizes by default (900 by
600 to 1920 by 1080), `--phone` for 320 by 568, 360 by 640 and 390 by 844.
`node --experimental-websocket scripts/check-game-fit.mjs` on Node 20.

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

## The narration on Meta's model

Meta's Muse Spark 1.3 writes the shipped narrations. Its docs were checked on 3 November 2026: `POST https://api.meta.ai/v1/chat/completions`, `Authorization: Bearer` with `MODEL_API_KEY`, a `developer` message for standing rules, `reasoning_effort`, `max_completion_tokens`, and backoff on 429, 500 and 503.

Standard mode is deliberate: `muse-spark-1.3-contributor` is far cheaper, but lets Meta train on prompts and responses.

**What it took.** Rules alone did not hold Spark to correct sentences, at low or medium reasoning. Medium cost three times as much and did no better, and it used up a 4,000-token cap on reasoning and returned no text, so the cap is now 16,000. What worked is `metaBrief` in `agent/prompt.js`, which gives the shape of each narration sentence by sentence. `META_SYSTEM` and `metaBrief` are Meta's alone, so the shared prompt, and the digest of every cached Claude response, stays as it is.

**To regenerate** (about $0.52, needing `MODEL_API_KEY` in `.env.local`):

1. `npm run narrate:meta -- --dry-run` shows what is cached, for free.
2. `npm run narrate:meta -- --only=D16-B,D19-A` tries two forks. Read them before going on.
3. `npm run narrate:meta` runs the rest, four at a time. It resumes if run again, and exits 0 only when all 64 are accepted.
4. Read all 64 against the engine. The verifier guarantees figures, not sentences.
5. `npm test`, then commit `cache/narrations/meta` and push.

**To serve it:** in Vercel, under the project's Settings, Environment Variables, set `NARRATE_PROVIDER` to `meta` for Production. Keep `NARRATE_LIVE` set to `1` and `MODEL_API_KEY` set on Production, with the Upstash store connected: a player's own run is narrated live with them, and the demo never uses them. Leave `NARRATE_META_MODEL` unset. Redeploy from Deployments, because a variable only applies to a new deployment. Then run `node scripts/check-live-narrations.mjs --provider=meta`, which must end "Every fork matches the meta cache."

**To go back:** set `NARRATE_PROVIDER` to `claude`, redeploy, and run `node scripts/check-live-narrations.mjs`.
