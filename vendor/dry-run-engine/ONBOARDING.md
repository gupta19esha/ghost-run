# Onboarding: why a new player leaves, and the shape of a fix

30 September 2026. Proposals only. Nothing in the game changed, and no copy is written here:
every line a player would read is the product owner's to write.

The problem, in the product owner's words: they opened the game, had no idea what it was, what
the four bars meant or what they were playing toward, and closed it in seconds. That is the
product's bounce rate as it stands. The measured detail behind it is in `FIRST-SESSION.md`
section 3.

**The budget.** The spec sets a session at 3 to 4 minutes, and "if a session runs past 6 minutes,
cut content" (HANDOFF section 4). Month 1 has two decisions, and the first session runs about
ninety seconds from the landing screen to the month close. So session one has roughly two minutes
of room before it reaches the spec's length. Anything added to the first session fits inside
that; anything added to every session does not.

---

## 1. Where a new player learns what the four bars are

The four bars: Net worth (a figure, not a bar), Safety, Freedom and Life. Today a player meets
them in this order: Net worth on the decision's month line from D01; Freedom as a moving bar on
D02's consequence, or D01-C's; all three bars together only at the month 1 close; their figures
("months of runway", "% committed") only on Home. Nowhere is any of them defined.

| Option | What it is | Screens added | Taps added | First session | Later sessions | Tag |
|---|---|---|---|---|---|---|
| A. On the landing screen | The landing names each bar in a line, replacing or beside today's bullets | 0 | 0 | About +10 s of reading | None | MVP |
| B. At the first month close | Month 1's close is the first screen with all three bars and net worth moving together. Each gets a line under it, once | 0 | 0 | About +15 s, at the moment the bars mean something: they have just moved | None | MVP |
| C. A first-run-only screen | One screen after the landing, before month 1, showing the four with a line each | 1 | 1 | About +15 s, before the player has seen anything move | None | MVP |
| D. Progressively, as each bar first moves | The first time a bar moves on a consequence, the consequence carries one line on what that bar is. Freedom at D02 (or D01-C); Safety and Life at the first time they move; net worth at the first close | 0 | 0 | About +5 s at each of two or three screens | Occasional, the first time each bar moves | MVP |
| E. On Home, tap to explain | Each bar on Home can be tapped for a line on what it measures | 0 | Optional | None unless tapped | None unless tapped | MVP |

**What each costs besides time.**

- **A** teaches before anything has happened, so the definitions are abstract. The landing is also
  the screen with the most competition for attention, and it is the Phase 0 harness's weakest
  match: the harness has no landing.
- **B** teaches at the right moment, but only after two decisions made without knowing. A player
  who closes the app in the first seconds, as the product owner did, never reaches it.
- **C** is the cheapest to build and the most reliable to be seen, but it is exactly the "tutorial
  before the game" the spec avoids, and it delays the first choice.
- **D** teaches each bar when the player is looking at it move, which is the principle of learning
  by living with consequences applied to the interface. It needs the engine to say which bar moved
  for the first time, which it already does for the consequence screen. The cost is that Safety and
  Life may not move until month 2 or later, so a player can make several choices before they learn
  what those two mean.
- **E** costs nothing unless used, but a new player does not know there is anything to tap.

**Combinations that fit the budget.** D with B: each bar defined the first time it moves, and the
first month close as the one screen that shows all four with their meaning. Or C with E: one short
screen before month 1, then Home as the reference. D with B keeps the first decision at the same
point it is today; C with E moves it one screen later.

---

## 2. What the player is playing toward

Today: the landing's "Money is not the only score. So are safety, freedom and your life." After
that, no score is shown until the chapter report at month 24, and even there it is the four bars,
not one figure. The league score (maths doc §11) exists in the engine and is never shown.

| Option | What the player is told they aim at | Where | Tag |
|---|---|---|---|
| A. One score | The league score, a single 0 to 100 figure combining the four (§11), shown on Home and moving at each month close | Home, month close | MVP |
| B. Four marks, no single score | Each bar shows a mark for "good": for Safety, six months of runway; for Freedom, the committed share at which it starts to fall; for net worth, the chapter's median target. The player aims to reach the marks | Home, month close | MVP |
| C. A chapter goal | A plain aim for Chapter 1, stated at the start and checked at the chapter report: for example, where a sensible 24-year-old would be on each bar. The copy is the product owner's | Landing or month 1, chapter report | MVP |
| D. Compared with others | How the player's choice or bars compare with other players: the spec's "India chose" reveal | Consequence, month close | Phase 1, needs players and a server |
| E. The player's own goal | The player picks what they are aiming at at the start, such as a safe life or a free one, and the game reports against it | A first-run screen, chapter report | Phase 1 |

**What each costs.**

- **A** gives a clear number to beat, and the engine already computes it. But a single score tells
  the player there is a best answer, which pulls against "no option is obviously correct" (spec
  writing rules), and its weights (0.35, 0.25, 0.20, 0.20) become the lesson whether meant or not.
- **B** keeps four separate aims, which is closer to the product's point that money is not the only
  score. It needs one mark per bar, three of which already exist as calibration or formula figures.
  Life has none: it has no figure behind it (maths doc §14).
- **C** gives a destination without a running score, and it pays off at the chapter report, which
  already exists. It says nothing month to month.
- **D** is the strongest motivator in the spec's own research, and cannot exist until there are
  players and somewhere to store their choices.
- **E** makes the goal the player's, which fits "money is not the only score", but it adds a choice
  before the first month, and the four bars would need to be understood first.

---

## 3. "Nothing is explained": where it is right and where it costs the player

**The line that separates them: explain the board, never the moves.** A player should be told what
the pieces are and what the game is for. They should never be told which choice is right. The
principle is right about moves and wrong about the board.

**Right, and should stay:**

| Screen | Why the principle holds there |
|---|---|
| Decision screen | No hint of the right answer, every option the same colour (UI.md rule 7). This is the product, and it is also the SEBI position: education, never advice |
| Consequence | The result line says what happened, not whether it was wise. Callbacks months later let the player find out what a choice cost by living with it |
| Callbacks | A deferred consequence arriving unexplained is the lesson landing |
| Concept cards at month close | Named after the player has felt the thing, not before |

**Wrong, and costing the player:**

| Screen | What is missing | Why it costs the player |
|---|---|---|
| Landing | What the game is for, and what the bars are. Its own lede says "Nothing is explained" | The one screen every new player reads tells them not to expect help. The product owner left here |
| Month card | That a month is a few decisions, then the month runs, then a summary, then one month a day | The shape of the session is learned only by reaching "Come back tomorrow" |
| First consequence with a bar | What the bar that just moved measures | D02's Freedom drop, the biggest movement of the opening, means nothing to a player who does not know Freedom is committed income |
| First month close | What the three bars and net worth are, together, the first time they are all on one screen | The close shows everything moving and explains none of it |
| Home | What Life means (no figure), and what the player is aiming at | Home is the screen a returning player sees most; it shows levels with no sense of good or bad |

---

## 4. What earns its place in the first ninety seconds

The first ninety seconds today: the logo, three title lines, the lede, three bullets, the name
field, the button, the month card, then D01.

| Element | Earns its place? | Why |
|---|---|---|
| Logo | Keep, small | Identity, and it costs no reading. It says nothing about what the game is |
| Title: "Twenty years of your money life. Four minutes a day." | **Keep** | The best line on the screen: it says what the game is and what it asks of the player |
| Lede | **Rewrite** | Its first two sentences orient the player. "Nothing is explained. You find out what things cost by living with them." works against a player who is deciding whether to stay |
| Bullet 1: every choice pays out later | Keep | It sets the core promise, delayed consequences |
| Bullet 2: money is not the only score | **Rewrite or replace** | It names three bars without saying what they are, and promises a score the game never shows. It is where option 1A or 2 could live |
| Bullet 3: no real money, nothing to buy | Keep, or move | It reassures and it is a legal point (Online Gaming Act, SEBI). It could sit with the disclaimer at the foot |
| Name field | **Cut** | Nothing in the game reads it (`game/screens/landing.js`). It adds a decision before the first real one, and it is personal data the DPDP notice would have to cover, for nothing |
| "Begin at 22" button | Keep | Clear, one tap |
| Disclaimer line | Keep | Required: educational, not investment advice (HANDOFF section 3) |
| Month card | Keep, and consider adding one line | Two seconds of orientation: month, age, salary. It is also the natural place for the shape of the session, the part the player now learns only at "Come back tomorrow" |
| D01 as the first decision | **Consider swapping** | It opens on a tax declaration and the EPF, the most jargon-heavy decision of the month, explained only at the month's close. D02, choosing a flat, is concrete and immediate. Their order is content, the product owner's to rule on |

---

## What I would try first

Not a decision, a starting point for one:

1. **Cut the name field** and rewrite the lede's last two sentences and the second bullet. No screen
   is added and the landing gets shorter.
2. **Define each bar the first time it moves (1D), and make the month 1 close the one screen that
   shows all four with their meaning (1B).** No screen or tap added; about twenty seconds added to
   session one only.
3. **Give each bar a mark for good on Home (2B)** rather than a single score, so the player has
   something to aim at without the game implying a right answer.
4. **Test it with people before building more.** The Phase 0 gate, twelve of twenty asking "what
   happens next?", is the measure. Without analytics there is no other way to know whether the
   bounce has changed.

All the words in these options are the product owner's to write.

---

## 5. Rulings of 30 September 2026, and the drafts they asked for

Every player-facing line below is **drafted by Claude for the product owner's approval**. None is
in the game.

| # | Ruling | Status |
|---|---|---|
| 0 | "Explain the board, never the moves", recorded in UI.md with where it applies | **Recorded, UI.md rule 8** |
| 1 | Cut the name field | Built 30 September 2026, section 6 |
| 2 | Bars: each explained the first time it moves, plus the first month close showing all four with their meaning | Drafted, 5.2 |
| 3 | Goal: a good mark on each bar on Home, not one score | Drafted, 5.3, with Life's options |
| 4 | Draft the two rewrites | Drafted, 5.4 |
| 5 | D01 stays before D02 | Recorded. It makes ruling 2 matter more: D01-C moves Freedom on the very first result |
| 6 | Build nothing yet | Nothing in the game changed |

**One rule interaction, settled in UI.md rule 8.** Ruling 2 puts a bar's explanation on a result,
which rule 8 lists among the screens that explain nothing. They fit because the line explains the
bar, never the choice: what Freedom measures, not whether dropping it was wise. Rule 8 says so.

### 5.1 Cutting the name field: what it involves

| Where | Change |
|---|---|
| `game/screens/landing.js` | Remove the field, its label "Your name", "(optional)" and the placeholder. The landing gets shorter, which helps it fit a 320 by 568 phone |
| `game/main.js`, `game/save.js` | `begin` takes no name. The save's `name` is simply no longer written; existing saves still load |
| `design/Landing.html` | The artboard loses the field too (memory: the design matches the build) |
| `HOSTING.md` | The DPDP point about the name field goes away: the game then collects no personal data of its own |

### 5.2 Each bar explained the first time it moves

**How it appears.** A result already shows the bar that moved, with its name and an up or down
chip. The first time a given bar appears on a result, one line sits under it saying what it
measures. The chip and colour still say what happened; the line says only what the bar is.

**How long it holds.** A result leaves after 2.5 seconds today. A result carrying a definition line
holds 5 seconds instead, enough to read about a dozen words once the bar has moved. A tap still
leaves at once. Every later result stays at 2.5 seconds.

**Once per player.** The save records which bars have been explained, so each line shows once,
survives closing the game, and a returning player never sees it again.

**The first month close shows all four with their meaning.** The same one line under net worth and
each bar, at the month 1 close only. The close has no timer, so it waits for Close as now. On a
320 by 568 phone the close is already tight; four extra lines need a fit check there.

**A bar that never moves on a month 1 result.** In practice only Freedom does: D01-C drops it, and
D02's result shows Freedom whichever flat is chosen. So Safety, Life and net worth are first
explained at the month 1 close, which ruling 2 already puts in. After month 1 every bar has been
explained once, and nothing more is needed. If a later month's result shows a bar that somehow
escaped both, its line appears there, by the same once-per-player rule.

**Draft lines** (drafted, for the product owner to rewrite):

| Bar | Draft |
|---|---|
| Net worth | "Everything you own, minus everything you owe." |
| Safety | "How long you could last if the salary stopped tomorrow." |
| Freedom | "How much of your pay is already spoken for before the month begins." |
| Life | "Whether you are living, or only getting by." |

Each says what the engine measures (maths doc §3 to §6) and nothing about what is good. Safety's
line leaves out the company health cover, which is 30 of its 100 points; the fuller version would
be "...stopped tomorrow, and whether you are covered if you fall ill", at the cost of length.

### 5.3 A good mark on each bar

A thin tick on each bar's track on Home, at the level a sensible player would aim for. The bar's
colour keeps meaning change (UI.md rule 4); the tick adds where good is. Positions come from the
engine as named constants in maths doc §12, so the UI computes nothing.

| Bar | Mark | Where it sits | Basis |
|---|---|---|---|
| Safety | Three months of runway, with the company cover held | 65 of 100: 30 for cover, plus half the 70 runway points | The low end of the usual three to six months of emergency money. Proposed `SAFETY_GOOD_MONTHS` 3 |
| Freedom | No more than 40% of pay committed | About 43 of 100: (0.70 - 0.40) / 0.70 | A common lender's line for how much of a salary can go to fixed payments. Proposed `FREEDOM_GOOD_COMMITTED` 0.4 |
| Life | See below | | |

Net worth is a figure, not a bar, so it has no track to mark.

**Life: two options.**

- **A mark at 55.** Maths doc §6 already calls 55 the middle: the baseline of a player who spends
  what a normal month allows, neither thin nor lavish. A tick there says a life, not just bills,
  which is the bar's point. Proposed `LIFE_GOOD` 55.
- **No mark.** Life has no figure behind it (§14), and a mark suggests the player can steer to it
  the way they steer runway. Three bars would have marks, and Life none.

Recommendation: the mark at 55. The number already exists in §6, so it is not invented, and
leaving the one bar about living without an aim tells the player it counts for less.

### 5.4 The two rewrites (drafted)

**The lede.** Now: "You start at 22 with your first salary. Every day you play one month and make
the calls people actually face. Nothing is explained. You find out what things cost by living with
them."

| Draft | Text | What changes |
|---|---|---|
| A | "You start at 22 with your first salary. Every day you play one month and make the calls people actually face. Nobody tells you the right answer. You find out what each choice costs by living with it." | Keeps the owner's first two sentences. "Nothing is explained" becomes the true version: the moves are not explained, the board is |
| B | "You start at 22 with your first salary. Every day you play one month: a few decisions, then you see what the month did. There are no right answers, only consequences." | Also says what a month is, which nothing before the first decision does today |

**The second bullet.** Now: "Money is not the only score. So are safety, freedom and your life"

| Draft | Text | What changes |
|---|---|---|
| A | "Money is one of four things to watch. The others: how long you could last without pay, how much of your pay is free, and how well you live" | Names what each bar measures, in the words of the 5.2 lines |
| B | "You are tracked on four things: what you are worth, how safe you are, how free you are, and how much you are living" | Shorter, and uses the bars' own names so the player recognises them later |

Recommendation: lede B and bullet B. Lede B gives the shape of a day, the gap in section 3; bullet
B uses the bars' names, so the landing and the month 1 close share one vocabulary. Both need a fit
check on a 320 by 568 phone before they go in.

---

## 6. Second rulings of 30 September 2026, and the build

| # | Ruling | Status |
|---|---|---|
| 1 | Net worth, Freedom and Life lines approved as drafted. Safety's line rewritten to cover runway and cover | Three lines built. **Safety drafts below, awaiting approval**; until then Safety shows no line anywhere |
| 2 | Life's mark at 55 | Built |
| 3 | Lede B and bullet B | Built, word for word |
| 4 | Build all of it | Built: the lines, the 5 second hold, once per player, the month 1 close with all four, the three marks, the two rewrites, the name field cut. Design artboards match |
| 5 | The explanation must never read as a verdict | Each line is one fixed string per bar, the same whichever way the bar moved, shown in slate rather than the bar's teal or vermilion |

**Where it lives.** The lines: `game/screens/bar-lines.js`. Once per player: `explainedAlready` and
`recordExplained` in `game/save.js`; a bar counts as explained once its line has shown, and every bar
does once month 1 has closed, which also covers saves from before this change. The 5 second hold:
`CONSEQUENCE_EXPLAINED_MS` in `game/config.js`. The marks: `barMarks` in `engine/bars.js`, from three
new section 12 constants, `SAFETY_GOOD_MONTHS` 3, `FREEDOM_GOOD_COMMITTED` 0.40 and `LIFE_GOOD` 55.

### 6.1 Safety's line: three drafts (drafted by Claude)

Safety is 70 points of runway and 30 of cover: 18 for health cover, 12 for term cover. In Chapter 1
nobody depends on the player, so the term points are always full; the cover a player can lose or
add is health cover. So "cover" or "insured" covers both without naming term insurance.

| Draft | Text | Words |
|---|---|---|
| A | "How long you could last without pay, and whether you are covered if you fall ill." | 16 |
| B | "Money to fall back on, and cover if you fall ill." | 11 |
| C | "How long your savings would carry you, and how well you are insured." | 13 |

Recommendation: B. It is the shortest, it names both halves in plain words, and it costs the least
height on the month 1 close (below).

### 6.2 Fit at 320 by 568, 360 by 640 and 390 by 844

Measured in headless Chrome on the real game, with the game's fonts loaded.

| Screen | 320 by 568 | 360 by 640 | 390 by 844 |
|---|---|---|---|
| Landing | Fits. It was 104 px too tall before; cutting the name field fixed it | Fits | Fits |
| D01-C result with Freedom's line | Fits, 2 px spare above the timer | Fits | Fits |
| D02 result with Freedom's line | Fits | Fits | Fits |
| Later results, no line | Fits, 2.5 s | Fits | Fits |
| Month 2 close, no lines | Fits | Fits | Fits |
| **Month 1 close, three lines** | **108 px too tall**: Close sits below the screen and the player must scroll | Fits, 1 px spare | Fits, 3 px spare |
| Month 1 close with Safety's line A or C | 146 px too tall | 37 px too tall | 35 px too tall |
| Month 1 close with Safety's line B | 128 px too tall | 19 px too tall | 17 px too tall |
| Home, locked | 51 px too tall, **as it was before this change**; the marks add no height | Fits | Fits |

To get this far the month 1 close already puts each bar on one row, its name beside its track, with
the line under both, and tightens its spacing (smaller net worth on short phones, less space above
the bars and the concept card). All later closes are unchanged.

Month 1's close carries the most of any month: net worth, four lines, the EPF concept card, the
longest of the chapter at five lines on a 320 phone, and the hook. At 320 by 568 no spacing change
makes up 108 px; something has to give. Options, the product owner's to rule on:

| Option | What happens | Cost |
|---|---|---|
| A. Let the month 1 close scroll where it does not fit | Close is reached by scrolling, on the smallest phones only, once per player | Breaks "the button stays in reach" once, on the screen with no timer |
| B. Leave the hook off month 1's close only | On day 1 the locked Home comes straight after Close and already shows the same hook, so the player still sees it. Measured: with Safety's line B, month 1's close then fits at 360 and 390, and is 57 px too tall at 320 (37 px without a Safety line) | Month 1's close loses its last line, the reason to come back, one screen before Home says it |
| C. Tighten the month 1 close further for Safety's line | Smaller type in the concept card and a smaller net worth, at 360 and 390 | Not measured. Needs about 17 to 19 px with line B; does not fix 320 |

Recommendation: B, which makes 360 and 390 fit with room for Safety's line, plus A for 320 by 568, where it then scrolls by about 57 px. A 320 by 568
phone is the smallest the game supports, and this is one screen, once per player, with no timer
running.

---

## 7. Third rulings of 30 September 2026

| # | Ruling | Status |
|---|---|---|
| 1 | Safety's line: B, "Money to fall back on, and cover if you fall ill." | Built. All four lines now show |
| 2 | Month 1 close: option A, let it scroll at 320 by 568. Not B: the hook stays on every close | Built. The close was tightened further so 360 and 390 still fit with Safety's line |
| 3 | Fix the locked Home at 320 by 568 | Fixed, and at 360 by 640, which also overflowed once the hook ran to three lines |

**Measured after the change,** headless Chrome, the game's fonts loaded:

| Screen | 320 by 568 | 360 by 640 | 390 by 844 |
|---|---|---|---|
| Month 1 close, four lines and the hook | Scrolls 104 px. Scrolled to the bottom, Close is fully on screen and a tap at its centre lands on it. No block clips its content: the page scrolls, nothing is cut off | Fits, Close ends at 628 | Fits, Close ends at 806 |
| Locked Home, month 2's hook | Fits, 51 px spare | Fits | Fits |
| Locked Home, D12's hook, the chapter's longest (64 characters, three lines at 320) | Fits, 6 px spare | Fits, 81 px spare | Fits |

**How the locked Home fits.** On phones 700 px tall or less, the locked Home alone closes up: less
space above the chapter, net worth and the bars, a smaller net worth figure, and the hook at 17 px.
On phones 600 px tall or less, net worth drops to 36 px and the button to 52 px. The screen a
player can still play, and Home partway through a month, are unchanged.

The locked Home with D12's hook was measured by putting D12's text into month 2's locked Home: the
screenshot script can only stop at the first Home.

---

## 8. Testing tools and How it works (rulings of 30 September 2026)

| # | Ruling | Status |
|---|---|---|
| 1 | Restart, testing only, behind a flag, never in the player build | Built as "Start again" at the foot of How it works, behind `TEST_TOOLS` |
| 2 | "How it works" on Home, for everyone: the landing text and the four bar meanings, read-only | Built |
| 3 | Login held until Phase 1 | Nothing built |
| 4 | Draft the copy | Ruled 30 September 2026, in the build: see 8.1 |

**The flag.** `TEST_TOOLS` in `game/config.js` is `false` in the repo, so any build is the player
build unless someone decides otherwise. `bash scripts/build_site.sh --test-tools` turns it on in the
built copy only, for the tester site behind Access. A player build fails if the flag is ever
committed as `true`. `HOSTING.md` section 6 has the tester deploy command.

**Where things sit.** "How it works" is a marigold link top right on Home, beside the streak, like
"your life so far": in the top row, so Home is no taller. It opens a read-only page: the landing's
lede and three bullets, imported from the landing so they are never out of step, then Net worth,
Safety, Freedom and Life each with the line the month 1 close uses. Close sits at the top and at the
foot. With testing tools on, "Start again (testing)" sits under a rule at the very foot; tapping it
swaps in the question and two buttons, scrolled into view, and deleting goes to the landing screen.

### 8.1 Copy (approved 30 September 2026)

| Where | Draft |
|---|---|
| Link on Home | "How it works" |
| Heading of the page | "What the four things mean". The link says what it opens, the heading what is on the page. It matches the landing bullet's "four things", and net worth is a figure, not a bar (changed from "What the four bars mean" the same day) |
| Close, top and foot | "Close", month close's word, already approved |
| Testing link | "Start again (testing)" |
| Confirm question | "Start again from 22? Your run is deleted and cannot be recovered." |
| Confirm, delete button | "Delete and start again", in vermilion |
| Confirm, keep button | "Keep this run" |

The page adds no other words: the lede, the bullets, the bar names and their lines are already the
product owner's.

### 8.2 Fit

| Screen | 320 by 568 | 360 by 640 | 390 by 844 |
|---|---|---|---|
| Locked Home with D12's hook, the tightest case | Fits, 6 px spare, as before: the link is in the top row, which stays 67 px | Fits | Fits |
| How it works, player build | Scrolls 299 px | Scrolls 160 px | Fits |
| How it works, tester build | Scrolls 391 px | Scrolls 252 px | Scrolls 58 px |

How it works is a reading page with nothing timed, so it scrolls like the progress timeline. Close
is at the top and at the foot, so a reader never has to scroll back to leave.

**Checked in the browser:** from a saved run, Home, How it works, Close goes back to Home with the
run kept, and the player build shows no "Start again". In the tester build, "Keep this run" leaves
the save; "Delete and start again" removes it and shows the landing screen.

---

## 9. Testing tools everywhere, and jump to a month (rulings of 30 September 2026)

All behind `TEST_TOOLS`, in tester builds only (`bash scripts/build_site.sh --test-tools`).
`game/testing.js`.

| # | Ruling | Status |
|---|---|---|
| 1 | Start again on every screen: a corner control, hold to open, top left, confirm kept; pressing it never advances a timed screen, and the timer pauses while the confirm is open | Built |
| 2 | The web address backup | Built: `/game/?restart` opens the same panel on load, then the address is tidied so a reload does not open it again |
| 3 | Intro skip, a real feature, built with the motion | Built, `LANDING-MOTION.md` |
| 4 | Jump to month N, tester only: the game makes the choices and lands on Home at the start of month N | Built, in the same panel |

**The control.** A 22 px circular arrow, slate, top left inside the 24 px margin; its touch area is
36 px. Not on the landing, where there is no run. A tap does nothing; held for one second while a
ring fills, it opens a panel from the bottom of the screen: the approved question and its two
buttons, then "Or jump to the start of month", a month from 2 to 24, and "Jump". The panel sits over
the screen, so no tap on it reaches the screen. It lives outside the screen, so pressing it is never
the tap that moves a timed screen on. While the panel is open a timed screen's clock and timer line
stop (`pause` and `resume` in `game/screens/timed.js`); "Keep this run" closes the panel and the
screen leaves when the time it had left runs out.

**The jump** replaces the run with one played for the tester: the first option each decision
offers, every earlier month closed, Home at the start of the chosen month, playable today, streak 0
(`jumpSave` in `game/save.js`). The first offered option is the simplest rule and always valid; it
is not a typical player's path. If late-chapter screens need a particular state, the jump could
take the Balanced player's choices instead.

**Checked in the browser** (tester build): a short press opens nothing and leaves the result where
it was; a one-second hold opens the panel; with the panel open for 7 seconds the result did not
leave; after "Keep this run" it left once its remaining time ran out; jump to 12 lands on Home at
month 12 with "Play the month"; Delete goes to the landing with the save gone; `?restart` opens the
panel and tidies the address. The player build has no control and ignores `?restart`.

**Collisions,** measured on the month card, D01, D07 (compact), a result, a callback, the month 1
close, the locked Home, the progress timeline and How it works, at 320 by 568, 360 by 640 and 390 by
844: the icon covers no words and its touch area covers nothing tappable, on every one. On the two
screens that scroll at 320 by 568, the month 1 close and How it works, text scrolls under the fixed
icon; nothing is hidden for good. The chapter report was not measured.

### 9.1 Copy (drafted by Claude, tester-facing only)

| Where | Draft |
|---|---|
| The control's spoken label, for screen readers | "Testing: hold to start again" |
| The jump row | "Or jump to the start of month" |
| The jump button | "Jump" |

The question and its two buttons are the approved ones from section 8.1.

**Ruled 30 September 2026:** the three tester drafts in 9.1 are approved as drafted. The jump uses
the Balanced player's choices, not the first option: Balanced is the model of a thoughtful player,
so the state it builds is a realistic place to test a late-chapter screen from. Balanced looks ahead
to month 24 for every option, too slow for a phone, and the game always plays one seed, so its path
is worked out once by `scripts/export_balanced_path.mjs` into `game/balanced-path.js` and replayed.
Checked: the jump's state at month 12 equals the calibration harness's Balanced player at the end
of month 11, to the rupee and on all three bars. A tester build refuses to build if the path is out
of date; re-run the script whenever the sheet or section 12 changes.
