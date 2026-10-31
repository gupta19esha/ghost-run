# Design reference

The approved screens as plain HTML. Open any of them in a browser at 390px wide.

These are the source of truth for look. Where UI.md and these disagree, these win.

| File | Screen |
|---|---|
| Landing.html | Onboarding, built first. Its mark is `dry-run-mark.svg`. The artboard is the still screen; the first time the game opens, the build plays an opening that ends exactly on it (`LANDING-MOTION.md`, A and E). The band above the title, showing D26, is direction B: on phones 640 px tall or more only, with the mark's top space cut from 48 to 28 px on phones 800 px tall or more to give it room. The lede and second bullet are the product owner's rewrites of 30 September 2026, and the name field is cut (`ONBOARDING.md` section 5) |
| dry-run-mark.svg | The logo, standalone: 24 ticks for the 24 months of Chapter 1, 9 marigold and 15 slate, round a circle, on the deep blue ground. No currency symbol. `game/favicon.svg` is a copy |
| Home.html | Four bars, net worth, play button. The line beside Freedom shows a salaried player, "22% committed". While there is no salary, as after the layoff, the game reads "64% of your last salary committed" (ruled 27 September 2026, worded in `text/render.js`). The same holds on HomeLocked and ChapterReport. The bone tick on each track is where good is: Safety 65, Freedom about 43, Life 55, from the engine's `barMarks` (ruled 30 September 2026). It carries no words, and HomeLocked and HomeContinue have it too |
| ChapterStart.html | Before a chapter's first month, once (ruled 31 October 2026, UI.md rule 11): the turn's mark, small and unlit; "Chapter one", the chapter's name and "22 to 24 · 24 months"; the twenty idea titles under "0 of 20 ideas", each locked; the chapter card drawn locked under "Your chapter card"; "Play the month", pinned. It scrolls; the artboard shows its top and, below the fold, the locked card. Every word is existing data or another screen's |
| Ideas.html | Every concept card of the chapter, in order, opened from Home's "3 of 20 ideas" after month 3 (ruled 31 October 2026, UI.md rule 10). Collected cards are month close's card with the month in place of its label; locked ones are a dashed outline with the lock and the month. The heading is the count, the product owner's words. It scrolls; this is its top |
| (The chapter's progress) | A strip across the top of every Home artboard, Decision, Consequence and MonthClose since 31 October 2026 (UI.md rule 10): "Month N of 24" and a 4px bar, months closed in bone-dim, the month being played in the timer's colour. The tops under it close up by about its height. Every Home artboard also carries "3 of 20 ideas" under "How it works", and MonthClose "1 of 20 ideas" at the right of its card's head |
| HomeContinue.html | Home reopened partway through a month (ruled 28 September 2026): "This month so far" over the choices already made, each as the chosen card with its result line, and "Carry on with the month" on the button. Both lines are the product owner's copy. On a short phone the foot is pinned and the list scrolls under it. The choice shown is D07-A, month 4, with its result line from the sheet |
| (How it works) | No artboard, like the progress timeline: built from the landing's lede and bullets and the month 1 close's bar lines, with the timeline's close icon and month close's Close button. Every Home artboard carries its link, top right beside the streak, in marigold like "your life so far" (ruled 30 September 2026) |
| HomeLocked.html | Home once today's month is closed. On phones 700px tall or less it closes up so the whole screen fits, even with the longest hook: "Come back tomorrow" and "One month a day. Month {n} is waiting.", and under them, since 31 October 2026, "Play the next month now" (UI.md rule 9). All three are the product owner's copy, not the sheet's; the month number is the engine's |
| Decision.html | Illustration, situation, option cards. Net worth sits at the right of the month line, in marigold (ruled 28 September 2026, the exception to UI.md rule 1). A decision that would not fit its screen, and every four-option decision, takes the compact layout |
| Consequence.html | Chosen card, result line, bar moving. The first time a bar moves on a result, one slate line under it says what the bar measures, and the screen holds 5 seconds. This artboard shows a Safety move after month 1, so it has none |
| MonthClose.html | Net worth counting, concept card, hook. The card's lock and label are slate: marigold is money only. It is month 1's close, the only one that says what each measures: a slate line under net worth and under each bar, the bars as rows. Every later close has the three bars side by side with no lines. On a 320 by 568 phone this close scrolls, and Close is reached by scrolling (ruled 30 September 2026) |
| ChapterReport.html | After month 24: the chapter in one scrolling screen. Spec in CHAPTER-REPORT.md |
| B-Decision.html | Alternate paper look, for comparison only, not approved |

They are static mockups with fake numbers. Copy the markup, colour values, type sizes,
spacing and SVG illustrations. Do not copy the fake figures.

The colour tokens and type rules in UI.md are taken from these files. If a value here
is not in UI.md, this file is right and UI.md is incomplete.
