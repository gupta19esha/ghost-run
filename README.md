# Ghost Run

Ghost Run takes a finished life from the Chapter 1 simulation and replays it. You can fork it at
any choice to see the ghost, the life you would have had with the other option.

## Layout

- `runner/` replays a save (`replay.js`) and forks it at a choice (`fork.js`). Both timelines run
  through the same engine code, so a fork that takes the player's own option is byte-identical
  to the real run.
- `verify/` checks a narration of a fork. Every figure must be a token resolved from the fork
  result, and `verify/render.js` is the only place figures are formatted.
- `agent/rank.js` forks a save at every choice and orders the forks by a score. Which score is
  not ruled yet; `scripts/measure-rank.mjs` measures the candidates.
- `web/demo/save.json` is a finished 24-month save for the UI to load (see `web/demo/README.md`).
- `scripts/measure-forks.mjs` measures how often a fork's ghost cannot take a later real choice.
  `reports/` holds the measurements.
- `web/daylight.css` is the game's visual direction, Daylight, laid over the vendored game.
- `index.html` is a temporary holding page. `/game/` serves the playable game from `vendor/`
  (see `vercel.json`).

`npm test` runs every test. There are no dependencies.

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
