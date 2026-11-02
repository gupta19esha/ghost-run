# Ghost Run

Ghost Run is a money game set in India: you play the first two years of a working life, one month at a time, in a simulator. Then you pick any choice you made, and the ghost run replays those two years with the other option and shows you how the life you did not live came out.

**Live:** https://ghost-run.vercel.app. The game is at `/game/`. The ghost run on a finished demo life, with nothing to play first, is at `/ghost/`.

## What was built during the hackathon (October 26 to November 4)

| Piece | What it does | Where |
|---|---|---|
| Fork runner | Replays a save, then replays it again with one choice changed. Both go through the same engine, so a fork that takes your own option is byte-identical to the real run | `runner/` |
| Verifier and tokens | Checks a narration before anyone reads it. Every figure must be a token resolved from the fork | `verify/` |
| Ranking | Forks a save at every choice and orders the forks by how surprising they are | `agent/rank.js` |
| Ghost flow | The five steps at `/ghost/`: the run, choose a moment, the split, where it ended, what happened | `web/ghost.js` |
| Daylight theme | The game's visual direction, laid over its original look | `web/daylight.css` |
| The road | The timeline as a road with a stop for each month, walked by a character the player picks. It opens each chapter, and the ghost's road branches off it at the split | `vendor/dry-run-engine/game/screens/timeline.js`, `web/ui.js` |
| Landing page | What this is, a month to try, the chapters, a ghost run | `web/index.html` |
| Certificate | The chapter card, drawn in the browser from the save | `vendor/dry-run-engine/game/certificate.js` |
| Ideas collection | The chapter's twenty concept cards, collected as they are earned | `vendor/dry-run-engine/game/ideas.js` |
| Model layer | The prompt, the retry loop, the cache and the API route | `agent/`, `api/narrate.js`, `cache/narrations/` |

Only chapter one is playable. Chapters two to six are named on the landing page and locked.

## What it is built on

`vendor/dry-run-engine/` is Dry Run, a finance simulation written before the hackathon. It holds the engine (the ledger, the market, the scores), 30 authored decisions with their copy, and the original game UI. **The simulator and its content are not hackathon work.**

The repository's first commit, on October 29, is that code as it stood, so `git diff b6e2e30 HEAD -- vendor/` shows every change since:

- **The simulation:** no change to how it calculates. `engine/` gained 38 lines, mostly read-only helpers that report a chapter's months and concept cards, and a test. `text/` is unchanged. The sheet of decisions is unchanged.
- **The game UI:** changed a lot. `game/` has 28 files changed and about 3,100 lines added. Those are the road, the certificate, the ideas, the desktop layout and the rest of the table above that lives in `vendor/`.

## How the AI works

A model writes one thing: the narration on the last step of the ghost run, telling you how the two lives came apart. It decides no numbers, no outcomes and no ranking. Those all come from the simulator.

The model is forbidden from writing a number. It writes tokens such as `{net_worth_gap}`. The simulator resolves each token for that fork, and only then does the text get its figures.

`verify/verify.js` and `agent/checks.js` reject an attempt that:

- types a digit
- invents a token, or uses one this fork has no value for
- leaves out a later choice the ghost could not take, when the fork has one
- asserts a cause, which the engine never records: a month's change is the sum of every choice, salary, costs, returns and shocks, with no attribution to any one of them
- has a sentence with no token in it (the one exception is the fixed opening line on a fork that ends with the same money)
- omits that fixed opening line on such a fork

A rejected attempt's reasons go back to the model, and it tries again, up to four attempts. The browser checks every attempt again before showing it.

The narrations on the live site were written by Claude Opus 5.5 (`claude-opus-5-5`), for all 64 forks of the demo life, at about $2.70 in API cost. In that final run all 64 passed on the first attempt. The retry has fired on real output in earlier runs, but not in this set. A provider for Meta's model is wired in and has never been run.

**Where no model is involved:** the charts, figures and ranking anywhere, and the ghost run on a player's own finished chapter (the report's "Meet your ghost"). The narrator only takes the demo life, because its forks are finite and can be cached. A player's own fork gets a fixed template filled with its figures, and the page says no model wrote it.

## The honest limit

**The verifier guarantees every figure, not every sentence.** A claim with no number in it can still be wrong.

- **The token rule can be got round.** It requires a token somewhere in each sentence and does not check what the rest of the sentence says. "In month {fork_month} your investment held its value" would pass.
- **The cause rule is a list of phrases:** because, caused, led to, meant that, which is why, as a result, resulted in, due to. A cause claimed in other words passes. The prompt forbids those too, but nothing enforces it.
- **Four false narrations got past the checker and were caught by reading.** They said things like "every rupee of any next salary claimed". Freedom reaches zero at 70% of income committed, not 100%. The fix was to give the model the score's real scale and regenerate all 64.
- **At least one wrong sentence is still live.** D09-A says the ghost's days "read as living" at a Life score of about 38, which other narrations rightly call getting by.
- **Style rules are not enforced.** The limits on length and figures per sentence are prompt instructions only.

## Run it locally

You need Node 20 or later.

```
npm install
npm run dev
```

Then open http://127.0.0.1:3000. This runs with no key, but narration comes from a stub that says it was written without a model. To see the real narrations, still with no key and no network, create `.env.local` containing one line:

```
NARRATE_PROVIDER=claude
```

`npm test` runs every test. `scripts/check-road-fit.mjs` and `scripts/check-game-fit.mjs` check the screens at phone and desktop sizes in headless Chrome.

### How the narration cache works

Every model response is committed in `cache/narrations/claude/<fork>/attempt-<n>.json`, with the model, its token usage, and a digest of the exact request it answered. The route answers from there, with no key and no network, as long as the request still matches. The live site runs this way.

Paid calls happen only with `NARRATE_LIVE=1` and a key, or when you run `npm run narrate:claude` or `npm run narrate:meta`, which regenerate the cache. Changing the prompt or the model changes the request, so the old answers stop matching and every fork has to be generated again.

The route always answers. If the chosen provider has nothing cached for a fork, or its call fails, it falls back to Claude's committed cache, then to the template that says no model wrote it.

More detail, including why chapters three to six cannot start yet, is in [docs/BUILD-NOTES.md](docs/BUILD-NOTES.md).
