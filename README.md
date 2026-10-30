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
- `web/index.html` is the ghost screen, served at the site root: the finished demo life, and any
  choice in it forked in the browser and drawn against the real run, with its narration and every
  attempt at it checked by `verify()`. `/game/` serves the playable game from `vendor/` (see
  `vercel.json`).
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
overshoots and settles, a fall is flatter and quicker. Screens slide forward into a fork and back
to the run, and the tapped choice travels into place. The run's 24 month ticks fill on first view.

- Under `prefers-reduced-motion`, everything lands on its finished state at once.
- A tap or key press anywhere finishes every running animation and waiting step first.
- Motion moves transforms, opacity, stroke offsets and widths inside fixed tracks, never layout,
  so it cannot change whether a screen fits.
- Leaving a screen drops its motion where it is, so nothing of it plays over the next one.

`web/sound.js` synthesizes every sound with Web Audio: a tap, a choice, the chapter closing, a bar
rising or falling, and the ghost line landing. The audio context starts on the first tap. Sound is
on by default; the mute control, top right on every view, is remembered in `localStorage`.
Choosing a fork and the ghost line landing give a short vibration where `navigator.vibrate`
exists. The mute control is about sound only, so it doesn't turn vibration off.

## vendor/

`vendor/dry-run-engine/` is the prior work Ghost Run is built on: the engine, the sheet's
content, the copy and the game. The folder keeps its original name. Two changes have been made
to it, and only these:

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

No engine logic, content, copy or numbers were changed, and nothing in `engine/` or `text/`.
