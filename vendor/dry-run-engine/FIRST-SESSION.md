# The first session: re-entry, motion, and what a new player knows

28 September 2026. Notes only: nothing in the game was changed. Written after the product owner
opened the deployed site and was taken straight into a decision, saw no animation, and could
not tell what the game was or how it was scored.

---

## 0. What happened on the deployed site

Not a build bug. The deployed files are commit `bc55c36`. Built from it and opened in a fresh
browser, the game shows the landing screen first.

The browser held a save from an earlier visit (`"closed":1`, 27 September), so the game resumed
instead of showing the landing screen. One detail: with one month closed and nothing chosen in
month 2, `replay` in `game/save.js` resumes at **Home**, not at a decision. A resume straight into
a decision means the save also held at least one month 2 choice, from a visit on 28 September
after the one-month-a-day lock lifted.

---

## 1. Re-entry: how a returning player should come back

**What happens now** (`resume` in `game/main.js`, `replay` in `game/save.js`):

| Where the save stops | What the player sees first |
|---|---|
| Between months | Home |
| Partway through a month's decisions | The next decision, with nothing before it |
| Every decision made, month not closed | The month runs again: its callbacks, then its close |

The middle row is the problem. The player lands on a situation and options, with no month card,
no Home, no net worth, no bars and no sign of what they chose before. The last row is
disorienting too: a callback about something chosen yesterday, with no context.

**Proposal, not applied:**

1. **Home always comes first on reopening,** whatever the save holds. The landing screen stays
   for a new player only. Home is the one screen that says where you are: chapter, month, age,
   net worth, the three bars and the streak.
2. **Home's button says what it will do.** Today it says "Play the month" whether a month is
   fresh or half done. Mid-month it should say the month is being continued. The wording is the
   product owner's to write.
3. **Home shows this month so far.** Under the bars, the choices already made this month, as the
   progress timeline already draws them: the option chosen and its result line. It reuses built
   pieces and adds no numbers. This is the reminder of where the player was.
4. **Continuing replays the month card** ("Month 2. You are 22.", the salary line) before the
   next decision, so the player re-enters the month the way they first entered it.
5. **Every decision made, month not closed:** Home, then the same continue button, then the
   callbacks and the close. The close is where the month makes sense, so it should not arrive cold.
6. **The next month's hook line on unlocked Home too,** not only on the locked Home. A returning
   player then sees what the month is about before pressing the button.

Points 2 and 6 need words the product owner writes. Nothing here changes the save format or the
one-month-a-day rule.

---

## 2. Motion: what moves in the first ninety seconds

**Measured, not assumed.** The built site was loaded in Chrome with reduced motion off, choosing
D01-A then D02-A, and every animated element was sampled every 100 ms in real time.

| When, roughly | Screen | What moves | How long |
|---|---|---|---|
| 0 to ~20 s | Landing | Nothing. The button dips 1 px while pressed | |
| ~20 s | Month card, "Month 1. You are 22." and the salary line | Nothing. It leaves by itself; it cannot be tapped away | Held 2.0 s |
| ~22 s | D01 decision | Nothing | |
| ~40 s | D01 consequence | The timer line along the bottom fills. **No bar moves after D01-A or D01-B**, because neither moves a bar. D01-C moves Freedom from 100 to 91 | Timer 2.5 s, linear. Bar, D01-C only: waits 0.3 s, moves over 0.7 s |
| ~43 s | D02 decision | Nothing | |
| ~60 s | D02 consequence | Timer line. **The Freedom bar falls**: to 40 for the studio, 70 for the shared flat, 80 for the room, with the lost part left hatched behind it | Measured: still for 0.3 s, then moving from 0.3 s to 1.0 s. Screen leaves at 2.5 s |
| ~63 s | Month 1 close | **Net worth counts up** from ₹20,000 (₹24,702 on D01-A, D02-A). **The Safety, Freedom and Life bars move** from where the month began to where it ended | Measured: the count runs 1.2 s, easing out. The bars wait 0.2 s and move over 0.9 s |
| After Close | Home | Nothing. The bars stand at their level, coloured by last month's change | |

Every change of screen is a cut. There is no transition between screens.

**No bug found in the first month.** Both animations ran as built. They are few and short: in
ninety seconds, about 0.7 s of bar movement, twice at most, then a 1.2 s count, and nothing at
all on the landing, the month card, the decisions or Home, where the player spends almost all of
that time.

**Why the product owner saw none:** the session resumed in month 2. There, five of the six
options move no bar when chosen (D03-B, D03-C, D04-A, D04-B, D04-C), and D03-A moves Safety by 2.8
points, which is barely visible. Nothing else moves until the month closes, and the session did
not reach a close.

**Two ways a player can miss what does move:**

1. **Tapping through.** The consequence says "tap to continue", and a tap leaves at once. The bar
   waits 0.3 s before it moves, so a quick tap sees nothing.
2. **Most choices move nothing.** Most effects land when the month runs, by design (maths doc
   section 14), so most consequence screens show no bar. The month close is the only reliable
   place anything moves.

---

## 3. What a new player knows at each of the first five screens

Five questions: what the game is, what the bars mean, what a month is, why they are choosing,
and what happens after.

| Screen | What the game is | What the bars mean | What a month is | Why they are choosing | What happens after |
|---|---|---|---|---|---|
| **1. Landing** | Told: "Twenty years of your money life", one month a day, "calls people actually face", a simulation, no real money | Named once, in a bullet: "Money is not the only score. So are safety, freedom and your life." Not said: that they are bars, what fills or empties them, that money is net worth | "Every day you play one month." Not said: how many decisions a month holds, or that a month ends with a summary | Not said. No goal, no win, no sense of what good looks like. "Nothing is explained" says it outright | "Every choice pays out later, sometimes two years later." Not said: what the next screen is |
| **2. Month card** (2 s, cannot be tapped away) | Nothing new | Nothing | "Month 1. You are 22." and "Salary credited. ₹41,300 in." The first figure in the game, with no balance beside it | Nothing | Nothing. It leaves by itself |
| **3. D01 decision** | Nothing new | No bars on screen. Nothing links a choice to safety, freedom or life | "Month 1" label | The situation sets a dilemma about a tax declaration and the EPF. Both terms are unexplained until month 1's concept card, after the choice. "why does this matter?" is optional and says nobody explains the payslip | Nothing says a result follows, or that the choice matters later |
| **4. D01 consequence** (2.5 s) | Nothing new | After D01-A or D01-B: no bar at all. After D01-C: a bar named Freedom with an arrow, with no scale, no number and no explanation | Nothing | The result line, such as "About 1,800 more reaches you each month". No sense of whether that was good | A thin line fills, with "tap to continue". Nothing says there is another decision this month |
| **5. D02 decision** | Nothing new | Still no bars on screen | "Month 1" again. The first sign that a month holds more than one decision | Rent against distance, and "You have 20,000 saved from before". The first time the player learns they have savings, one decision after the salary | Nothing |

**What follows the five:** D02's consequence, where Freedom falls hard, still unexplained. Then
the month 1 close: net worth appears for the first time, three bars move with names only, and the
EPF card explains the term used back in D01. Then Home, where Safety gets "months of runway",
Freedom gets "% committed", and Life gets nothing.

**Where the gaps are, specifically:**

1. **The bars are named once and never defined.** One bullet on the landing screen names safety,
   freedom and life. No screen says what they measure or how to move them. Life has no figure
   anywhere (maths doc section 14). Home's labels, "0.2 months of runway" and "21% committed",
   are the nearest thing to a definition, and they arrive after the first month.
2. **Net worth is invisible until the month closes.** The player chooses rent without seeing a
   balance. "Money" on the landing screen is never connected to the "Net worth" of the close and
   Home.
3. **There is no goal.** Nothing says what a good month, a good chapter or a good score looks
   like. The league score (maths doc section 11) is not shown anywhere. The landing screen's "Money is
   not the only score" promises a score the game never shows.
4. **The shape of a month is never shown in advance.** Nobody says a month is a few decisions,
   then it runs, then a summary, then one month a day. The player learns it only by reaching
   "Come back tomorrow" at the end of month 1.
5. **The first bar is the most dramatic and the least explained.** D02's Freedom drop, to 40 for
   the studio, is the biggest single movement of the chapter's opening, and the player has never
   been told what Freedom is.
6. **The first decision is the most jargon-heavy.** D01 opens on a tax declaration and the EPF,
   and the concept that explains EPF arrives only at the month's close.
7. **Timed screens read quickly.** The month card holds 2 s and cannot be skipped. The
   consequence holds 2.5 s, while its bar finishes moving at 1.0 s. A first-time reader may not
   finish the result line and watch the bar in that time.
8. **The savings arrive late.** The 20,000 is told at D02, after the salary card and D01, so the
   month card's "₹41,300 in" is the only money the player has seen when they make their first
   decision.

The principle that nothing is explained can hold for month twenty and still leave room, in the
first ninety seconds, to say what the bars are, where the money is, and what a month looks like.
Where and how is a design decision, and the words are the product owner's. This note proposes no
copy.

---

## 4. Found on the way, flagged and not fixed

**D03's fixed figures now read against the opening cash.** D03's situation says "You have 2,100
left", and D03-C says "Take it from the 15,000 you had saved". Both are fixed numbers in the copy,
not engine tokens. D03-C changes nothing in the engine (validation 2 lists it as having no effect).
Since v28, D02 tells the player "You have 20,000 saved from before". A player then meets a
different, unexplained 15,000 of savings one month later, and a 2,100 balance the engine may not
match. Neither figure is recorded in the maths doc. It is the product owner's copy to rule on.

---

## 5. Rulings of 28 September 2026

| # | Ruling | Status |
|---|---|---|
| 1 | Re-entry: points 1 to 5 of section 1. Point 6, the hook on unlocked Home, waits | **Built.** The product owner writes the words (5.1) |
| 2 | D03's "15,000 you had saved" contradicts D02's 20,000: propose a token or a copy change | Proposed, 5.2. Not applied |
| 3 | Net worth is invisible until the first month closes: propose showing it during the month | Proposed, 5.3. Not applied |
| 4 | Two seconds of motion in ninety is a design fact. Record it in UI.md with the measurements | Recorded, `UI.md`, "Motion, as built" |

### 5.1 Re-entry, as built, and the words it needs

**What changed** (`game/main.js`, `game/screens/home.js`, `game/style.css`):

- Reopening always lands on Home. A player with no save still gets the landing screen.
- Partway through a month, Home lists the choices made so far this month, each with the result
  line it showed, drawn exactly as the progress timeline draws them.
- Its button continues the month: the month card again ("Month 2. You are 22." and the salary
  line), then the next decision. When every decision is made but the month is not closed, the
  month card, then the month's callbacks and its close.
- The month's starting figures are kept from the save, so the close still counts from where
  the month began.
- Fixed on the way: Home read its "Chapter one" heading from the month's next decision, so a
  month with every decision made would have shown Home with no heading. It now reads the
  month's decisions whether taken or not.
- On a short phone the list can make Home taller than the screen: at 320 by 568, by 93 px
  with one choice and 225 px with two. Home's foot, with the month line and the button, is
  pinned to the bottom while a month is being continued, so the button never leaves the
  screen. The list then sits mostly below the fold and needs a scroll to read. At 390 by 844
  everything fits.

Checked in Chrome with four saves: partway through month 1, partway through month 2, month 2
with both decisions made, and between months. Each opened on Home with the right list, and the
button led to the month card, then the next decision or the close. A new player still gets
the landing screen. 69 engine tests and 16 text tests pass.

**The words, for the product owner to write.** Every line that would change, with its current
text and the room it has at 320px, measured in the game's own fonts:

| Where | Current text | Room at 320px |
|---|---|---|
| Home's button, while a month is being continued | "Play the month", the same as a fresh month, as a placeholder | About 24 characters on one line, in the button's 19px serif. "Come back tomorrow", the longest label today, uses 212 of the 260 px |
| A heading over the list of this month's choices | None. The list stands under the bars with no heading | About 42 characters on one line, in the small label style of "Net worth" |

Unchanged, and read with the list: the line above the button, "Month 2 · you are 22 · your life
so far". A new player's button, the locked Home's two lines and the timeline stay as they are.

No artboard exists for this Home. It will be drawn in `design/` when the words arrive.

### 5.2 D03's figures: two options

**The problem.** D03's situation is "It is the 24th. You have 2,100 left. Payday is seven days
away." D03-C is "Take it from the 15,000 you had saved", and its result line says "the savings
account goes back to where it was two months ago". Both figures are fixed in the copy. Neither
is checked by anything, and D03-C moves no money in the engine. Since v28, D02 has told the
player they have 20,000 saved.

What the player actually has when D03 arrives, from the engine (cash, which is all their
savings at this point):

| D02 choice | Money at D03 |
|---|---|
| Studio | 702 |
| Shared flat | 17,744 |
| Room out of town | 23,117 |

**Option A: tokens for what the player has.**

- D03's situation takes a token for money left, and D03-C's label a token for money saved. The
  token would be a new one in maths doc §10.1, read from the engine, like `{total_saved}`.
- *What it shows:* "Take it from the 702 you had saved" for the studio player, 23,117 for the
  room. That is true, but it exposes a bigger problem. D03's story, broke on the 24th with a
  week to payday, only fits the studio player. The shared-flat and room players have 17,744
  and 23,117, and "You have 2,100 left" would become a large number that removes the
  dilemma.
- *What it needs in the build:* option labels are not passed through `text/` today
  (`game/screens/decision.js` shows `option_label` as written). A token in a label needs that
  changed and tested. The rule that drops a sentence with no value cannot drop a label.
- *Stated terms check:* nothing is added. Outcomes are tokens, not stated terms (rule 16). The
  text tests' 300 random playthroughs would check the tokens always render.

**Option B: copy with no figures.**

- D03-C's label names the savings without an amount. The product owner writes the words.
- *What it shows:* the same for every player, and nothing contradicts D02.
- *What it needs in the build:* a sheet version only. No code.
- *Stated terms check:* nothing to add or remove. The 15,000 was never checked. "You have
  2,100 left" in the situation stays an unchecked fixed figure. By rule 16 it is an outcome,
  so it should become a token or go. Worth deciding with this.

**Recommendation: B.** The engine keeps one pool of cash, D03-C moves no money, and a token
would show that D03's premise holds for one path in three. B fixes the contradiction the
player sees without pretending the engine tracks a separate savings account. D03's "2,100
left" should go with it, for the same reason. Rewriting D03 so it fits every path, or offering
it only to a player who is actually short, is a bigger content change, for Chapter 1's next
revision.

### 5.3 Net worth during the month

**Where it would sit.** On the decision screen, at the right end of the existing "Month 1" line
above the situation, in marigold, as money always is: "Month 1" on the left, "₹20,000" on
the right. It adds no row. The figure is the engine's `getBars(state).netWorth` before the
choice, formatted by `text/`, and it does not move on the decision screen.

**What it does to the layout,** measured with a mock injected into the real game (nothing
changed in the game):

| Screen | 320 by 568, as today | With net worth in the "Month" line | With a separate net worth band above the illustration |
|---|---|---|---|
| D02, three options | Last option ends at 623 px. **Already below the fold, see 5.4** | 626 px, 3 px lower | 670 px, 47 px lower |
| D07, four options, compact layout | 548 px, fits | 548 px, fits | 579 px, **pushed off the screen** |

At 390 by 844 both fit. The "Month" line costs at most 3 px, because the figure fits beside
the month on a line that is already there. A band costs 31 to 47 px, and breaks the
four-option decisions on a small phone.

**Does it weaken the month close?** No. Within a month, net worth barely changes on the
decision screen. A deposit becomes an asset, rent is a commitment paid when the month runs,
and salary, costs and the leak all land at the run. So the figure a player sees while
deciding is the one the month started with, and the close is still the one moment it moves and
counts. The two work together: the player sees the balance before choosing, then watches what
the month did to it.

**Three things to rule on with it:**

1. **UI.md rule 1** says "One thing on screen at a time. No bars visible during a decision."
   Net worth is not a bar, but the rule's intent is a clean decision screen. The rule would
   need a named exception.
2. **Net worth is not cash.** At D02 they are the same, 20,000. Later, with investments,
   deposits and debts, net worth can be high while cash is low, or the reverse. D02's rent
   choice is about cash. If the point is "what can I afford", the figure that answers it is
   cash, which the game shows nowhere. Showing net worth gives the balance the game scores;
   showing cash gives the balance the choice spends.
3. **Only the decision screen, or also the month card.** The month card already says "Salary
   credited. ₹41,300 in." A line with net worth there would give the balance before D01, the
   first decision, at no cost to the decision screen.

### 5.4 Found on the way: D02 no longer fits a 320 by 568 phone in the game

At 320 by 568, D02's third option ends at 623 px, 55 px below the screen, so "Room 40 minutes
out" needs a scroll. Built from before v27 (commit `cfdb766`), D02's last option ended at
557 px and fitted. v27's deposit wording and v28's opening-cash sentence made the labels and
the situation longer.

The v27 report said the game's decision screen fitted at 320, 360 and 390. That was measured
at 320 wide but on a taller frame, so it was wrong for a 320 by 568 phone. The Phase 0 harness
was measured at 320 by 568 and does fit. Not fixed here. Two ways to fix it: give D02 the compact
layout the four-option decisions already use, or shorten its copy. The first is a build change,
the second the product owner's words.

---

## 6. Rulings of 29 September 2026

| # | Ruling | Status |
|---|---|---|
| 1 | D02 takes the compact layout, not shorter copy. Check all 30 decisions at 320 by 568 | **Built and checked.** Six decisions overflowed, not just D02 (6.1) |
| 2 | D03: option B, no figure, and drop "You have 2,100 left" | Draft copy below for approval (6.2). Not applied |
| 3 | Net worth on the decision's month line and on the month card. Exception in UI.md rule 1 | **Built.** UI.md rule 1 records the exception and why (6.3) |
| 4 | The words: "Carry on with the month", "This month so far" | **Built.** `design/HomeContinue.html` draws them |
| 5 | Commit and push, do not release | `main` only. `live` is unchanged |

### 6.1 Every decision at a real phone size

Measured by rendering each of the 30 decisions at 320 by 568, 360 by 640 and 390 by 844, on the
path that takes each decision's first option. The check is now permanent:
`python scripts/check_decision_fit.py`, which fails if any option card ends below the screen.

**Before the fix, at 320 by 568, six decisions did not fit:**

| Decision | Last option below the screen |
|---|---|
| D01 | 45 px |
| D02 | 45 px |
| D05 | 18 px |
| D11 | 18 px |
| D09 | 7 px |
| D16 | 7 px |

Nine more had under 20 px to spare. At 360 by 640 and 390 by 844 all 30 fitted. The four-option
decisions, D07, D14, D17 and D28, always use the compact layout and fitted.

**The fix follows the ruling's principle for all six, not only D02:** the words stay and the
layout gives way. A decision screen measures itself once it is on the page. If its last card
would end below the screen, it takes the same compact layout D07 uses: a smaller illustration,
a smaller situation, tighter option cards. D01, the first decision of the game, was as far
over as D02, so fixing D02 alone would have left the first screen a new player makes a choice
on broken. It is easy to narrow to D02 alone if that is wanted.

**After, with net worth on the month line:** all 30 fit at all three sizes. At 320 by 568, D01,
D02, D05, D09, D11 and D16 take the compact layout, beside the four-option four. At the two
larger sizes only the four-option four do.

### 6.2 D03 without figures: the draft, for approval

Nothing below is applied. The product owner's own words are reused where they exist.

| Where | Now | Draft |
|---|---|---|
| D03 situation | "It is the 24th. You have 2,100 left. Payday is seven days away." | "It is the 24th and the money is gone. Payday is seven days away." The first sentence is month 2's hook line, word for word, the line the player read at month 1's close |
| D03-C label | "Take it from the 15,000 you had saved" | "Take it from what you had saved" |
| D03-C result | "Easy. The savings account goes back to where it was two months ago." | Unchanged. It has no figure |

The situation goes from 13 words to 14. Nothing changes in the stated terms check, because
neither figure was ever in it.

Two more figures in D03, for the same ruling to cover or not:

- **D03-B's result, "You make it to payday with 180 rupees."** The same kind of fixed outcome
  figure as the 2,100: nothing checks it, and the engine can contradict it. If it goes, the
  product owner's words for the new ending are needed.
- **D03-A, "Ask your parents for 5,000".** Not a problem: the option gives exactly 5,000 in the
  engine (`money_once`), so the label states its own term. It could be added to the stated
  terms check, like D02's deposits.

### 6.3 Net worth on screen, as built

- **Decision screen:** at the right of the "Month 1" line, in marigold, the engine's net worth
  before the choice, formatted by `text/`. It does not move on this screen. D02 at 320 by 568
  shows "Month 1" and "₹20,000" on one line above the situation.
- **Month card:** under "Month 1. You are 22.", the label "Net worth", Home's own word, and the
  figure in marigold, then "Salary credited. ₹41,300 in."
- `design/Decision.html` shows the month line with the figure. No month card artboard exists.

**One thing to know about the month card.** It shows net worth as the month begins, ₹20,000,
and directly under it says "Salary credited. ₹41,300 in." The salary is not in the ₹20,000,
because the engine pays it when the month runs, after the decisions. A player could read the
two lines as "I have 20,000, and 41,300 just arrived", and then see 20,000 again on D01. Both
figures are true; their order in time is not shown. Flagged, not changed. It belongs with the
question below.

### 6.4 Open question: cash, net worth, or both, and where

Recorded as ruled, not to be solved now.

Net worth is the figure the game scores: cash, deposits, investments, gold, the retirement fund
and assets, less debts. Cash is what a choice spends. At D02 they are the same, ₹20,000. They
drift apart as soon as money is invested, locked in a deposit or borrowed: a player can have high
net worth and no cash to pay rent, or cash from a loan and falling net worth.

The questions to answer later:

1. Which figure the player needs when choosing: net worth, the score; cash, what the choice
   spends; or both.
2. Where each belongs: the month card, the decision screen, Home, the month close.
3. Whether the salary line on the month card should read against the figure above it, since
   the salary is not in it yet (6.3).
4. Whether the game should ever show cash at all, which it does nowhere today.

---

## 7. Rulings of 29 September 2026, second set

| # | Ruling | Status |
|---|---|---|
| 1 | D03's draft copy approved as written (6.2) | Applied, sheet v29 |
| 2 | D03-B's "180 rupees" goes too: "You make it to payday. Just." | Applied, sheet v29. The line began "Seven long days.", which stays, so it reads "Seven long days. You make it to payday. Just." |
| 3 | The month card contradicted itself: net worth ₹20,000 above "Salary credited. ₹41,300 in.", when the salary is not in that figure. Net worth comes off the month card only | Done. It stays on the decision screens. UI.md rule 1 records the narrowing: the month card's job is where you are and what is coming, the decision screen's is what you have |
| 4 | The compact layout for any decision that would overflow, not only D02 | Kept |

The contradiction in 6.3 is resolved by the month card no longer showing net worth. Question 3
in 6.4, the salary line against the figure above it, falls away with it. The rest of 6.4, cash
or net worth or both, stays open.


**Found while checking v29, flagged and not fixed: D03 now shows the contradiction on one
screen.** With net worth on the decision's month line, a shared-flat player reaches D03 and reads
"₹33,744" at the top and "It is the 24th and the money is gone." under it. That net worth is
₹17,744 of cash plus the ₹12,000 deposit and the rest; the story assumes a player with nothing.
It is the cash or net worth question of 6.4 in its sharpest form. It is also section 5.2's finding
again: D03's premise fits the studio player, with ₹702 left, and not the other two. Options for
later: show D03 only to a player who is actually short, rewrite it to fit every path, or let the
cash question decide what the month line shows.

---

## 8. Rulings of 29 September 2026, third set

| # | Ruling | Status |
|---|---|---|
| 1 | D03-B's result keeps "Seven long days." | Left as applied in v29 |
| 2 | D03's premise is the bug, not the display. Rewrite D03 to be true on every path, turning on the pressure rather than an amount | Draft below (8.1). Not applied |
| 3 | Check every decision for copy that assumes a state only some players are in | Listed below (8.2). Nothing fixed |

### 8.1 D03, rewritten to be true on every path: the draft

What the player has when D03 arrives: 702 after the studio, 17,744 after the shared flat,
23,117 after the room. What is true for all three: rent went out at the start of the month,
the month's costs have been paid since, and whatever is left has to last until payday.

| Where | Now (v29) | Draft |
|---|---|---|
| Situation | "It is the 24th and the money is gone. Payday is seven days away." | "It is the 24th. Rent went out on the 1st, and what is left has to last until payday, seven days away." (22 words) |
| D03-A label | "Ask your parents for 5,000" | Unchanged. True on every path, and the engine gives exactly 5,000 |
| D03-B label | "Eat at home, cancel everything, ride it out" | Unchanged. True on every path |
| D03-C label | "Take it from what you had saved" | "Dip into your savings for the week". The old label's "it" pointed at a shortfall the new situation no longer names |

The pressure scales with the flat without a number: for the studio player "what is left" is
702, for the room player it is 23,117, and the same sentence is true for both.

Three more lines on D03 carry the old premise, and are false for the shared flat and the room.
They need the product owner's decision too:

| Where | Now | Why it is false | Draft |
|---|---|---|---|
| Month 2's hook line, on D03, shown at month 1's close and on the locked Home | "It is the 24th and the money is gone." | Two of three players have money | "The last week before payday." |
| Month 2's summary, on D03, shown on the chapter report | "The money ran out early." | The same | "Rent set the month's pace." (five words, past tense, as the summaries are written) |
| D03-B's result | "Seven long days. You make it to payday. Just." | "Just" says the player barely made it. A room player who chooses to ride it out with 23,117 did not | The product owner's call: keep, or end at "You make it to payday." |

And one line that is false on every path, a different fault: **D03-C's result**, "Easy. The
savings account goes back to where it was two months ago." D03-C moves no money in the engine,
so nothing goes anywhere. Either D03-C gets a money effect in the sheet, or its result line
stops claiming one. Not drafted: this needs a ruling on which.

### 8.2 Every decision checked for copy that assumes a state only some players are in

Read against what each path actually does in the engine. Housing is D02: studio, shared flat,
room. "Investor" means D16-A; D16-B is a recurring deposit; D16-C invests nothing. Money and
pay figures are the engine's, computed; the method is at the end of this section.

**False for some paths: copy that assumes a state**

| Decision and line | What it assumes | False for |
|---|---|---|
| D07 situation: "You have 20,000 set aside for emergencies" | 20,000 of cash in month 4 | The studio player, who has 1,404. D07-B, C and D then move 20,000 the studio player does not have, straight into the payment cascade. True for the shared flat (30,292) and the room (39,611) |
| D08 situation: "You have 38,000 in total." and D08-A: "You have 13,000 left." | A fixed balance in month 4 | The studio player (1,404) and the shared flat (30,292). Near true only for the room (39,611) |
| D16 hook: "You have enough spare to start investing, if you want to." | A monthly surplus to invest from | The studio player, whose surplus after rent is about 700 a month, against 5,000 a month to invest. Their 77,793 of cash at month 10 is the bonus, kept |
| D19 hook, shown before month 13: "Your flatmate is moving cities." | A flatmate | The studio player, who lives alone. For everyone it is also a hook no decision follows: month 13 is the roof, and no flatmate appears |
| D19-A result: "It clears most of what you have saved in 13 months." | Savings above 1.4 lakhs | The studio player, who has 75,345 and cannot pay it at all: the cascade covers the rest. True for the shared flat (1,60,817) and the room (1,89,214) |
| D21 situation: "You have no spouse, no children, no loan." | No debt | D11-C players, still owing 25,578 on the phone EMI at month 15; D17-C players carrying a card balance; and the studio player, still repaying family money, a 0% loan |
| D22 situation: "Your emergency fund is 32,000." | A fixed balance in month 16 | Every path computed: 71,828 for the studio, 1,78,171 for the shared flat, 2,12,669 for the room |
| D22-B result and callback: "Emergency fund is now almost nothing", "a scooter and no runway" | That the 95,000 empties the fund | The shared flat (83,000 left) and the room (1,17,000 left). For the studio it is worse than "almost nothing": 95,000 on 71,828 goes into the cascade |
| D20 situation token, D20-A "Move your monthly investment there", D20-B "Keep the index" | An index investment | D16-B and D16-C players. The situation's token drops its sentence for them, as designed, but both labels still assume the index. D20-A changes nothing in the engine for them |
| D27 situation: "Your income went up." | A raise | D26-C players, and D13-A or D13-C players who stayed: nothing in the engine has raised their pay since month 1 |
| D27 situation: "raise the SIP by the full increase" and D27-B's callback: "Your monthly investing has doubled" | A running SIP | D16-B and D16-C players, who have none. For D16-C, 12,000 from nothing is not doubling |
| D28-A: "live off the emergency fund" | An emergency fund | Players with little or none, most of the studio path |
| D28-B: "5,000 a month back" and its callback "You restarted four months later" | A monthly investment to stop | D16-C players. D28-B changes nothing in the engine for them, and the callback still shows |
| D28-C: "Put the gap on the credit card" | A card | D17-B players (card closed) and D17-D (refused). Already recorded: the engine grants D28-C a card (maths doc section 14) |
| D10-A result: "Savings back to near zero." | Savings of about 60,000 | Players with much more or much less. Not computed |
| D14-B callback: "The money you kept is still invested." | The investment survived | Players the payment cascade sold it for, at step 3. Rare |

**False on every path: copy the engine contradicts**

| Decision and line | The contradiction |
|---|---|
| D13-A: "8% on paper. About 2% after inflation." | D13-A changes no pay in the engine. The player's salary stays 41,300. Only D13-B's +600 raises pay |
| D26 situation: "Staying pays 8.4 LPA" | Computed at D26: 6.24 LPA at D01's ratio after D13-A or D13-C, 6.33 after D13-B. Not 8.4 on any path |
| D26-A: "Large company, 11 LPA" with +18,000 a month | Computed: 8.96 LPA, not 11. The stated terms check covers D29's LPA figures this way but not D26's |
| D26-B: "Startup, 9 LPA plus equity" with +4,000 a month | Computed: 6.84 LPA, not 9 |
| D03-C's result, "The savings account goes back to where it was two months ago" | D03-C moves no money (8.1) |

**Other faults found on the way**

| Line | Fault |
|---|---|
| D24-A's callback: "Six months of the longer commute. You have finished four books and you are never home before nine." | D24-A is "Stay and pay the extra 4,000". Its callback describes moving further out, which is D24-B |
| D01-B's callback, at month 15: "March. You scramble to invest 60,000..." | March is month 12, where D18 already has payroll asking. The callback lands three months after March |

Figures are the engine's, on the path that takes each decision's quietest option except the
housing choice named, computed with `node scripts/path_state.mjs`. Lines marked "not computed" depend
on more choices than one path shows. None of these is fixed.

---

## 9. Rulings of 29 September 2026, fourth set

| # | Ruling | Status |
|---|---|---|
| 1 | D03's rewrite approved: situation, D03-C's label, hook line, summary. D03-B ends "You make it to payday." | **Applied, sheet v30** |
| 2 | D03-C gets a money effect: dipping into savings costs savings | Proposed, 9.1 |
| 3 | The pay figures false on every path: D13-A's 8%, D26's 8.4, 11 and 9 LPA. Engine or copy, and extend the stated terms check to D26 | Proposed, 9.2. **The check is extended and now fails on D26, as it should** |
| 4 | Group the sixteen lines false for some paths by what would fix them | 9.3 |

### 9.1 D03-C's money effect: the proposal

**Amount: 5,000, spent.** The same week's gap D03-A's parents cover with 5,000, taken from the
player's own money instead. D03-C's `money_once` becomes -5,000, class `spent`. Its result line,
"Easy. The savings account goes back to where it was two months ago.", then describes something
that happens.

Measured with `calibration/trial.mjs` on the four player types, medians over 100 seeds:

| Type | Picks D03-C? | Net worth, month 21 | Net worth, month 24 |
|---|---|---|---|
| Spender | Yes, for its Life | -3,68,463 to -3,72,647 | -5,69,167 to -5,73,337 |
| Cautious, Balanced, Maximum saving | No | Unchanged | Unchanged |

Random play: median net worth at month 21 falls from 76,640 to 73,394. The share reaching family
money stays 82%. Validation 1 is unchanged.

**One path to know about.** The studio player has 702 at D03. For them, "dip into your savings"
costs 5,000 they do not have, and the payment cascade covers the rest, down to family money. That
is honest, since the studio player has no savings to dip into, but it means D03-C on the studio
path is a worse version of D03-A: the parents pay either way, and D03-C adds the family-money
Life penalty. Worth knowing before ruling; it is the same kind of problem as D07 in 9.3.

### 9.2 The pay figures

**D13-A's 8%: change the engine, not the copy.** The decision's lesson is a raise below
inflation: 8% against 6%. Removing the 8% removes the lesson. Today no D13 option raises pay
except D13-B's +600, so "8% on paper, about 2% after inflation" describes a raise nobody gets, and
D13-A's callback, "your buying power is almost exactly where it started", is false too: with no
raise, buying power falls by the full inflation.

Proposed amounts, as salary changes from month 9 like D13-B's:

| Option | Now | Proposed | Why |
|---|---|---|---|
| D13-A | nothing | +3,304 a month | 8% of 41,300 |
| D13-B | +600 | +3,904 | The 8% plus the existing 600, the "another 1.5%" |
| D13-C | nothing | +3,304 | The appraisal lands whether or not the player applies elsewhere. "Nothing changes this month" stays true, because it starts in month 9 |

With it, D13-A's callback becomes true: 8% of pay against about 10% of prices by month 20.
A new stated term would hold "First appraisal: 8%" to D13-A's amount.

What it does to the four types, medians over 100 seeds:

| Type | Net worth 21 | Net worth 24 | Safety 21 | Safety 24 |
|---|---|---|---|---|
| Spender | -3,68,463 to -3,25,165 | -5,69,167 to -5,22,487 | 30 | 30 |
| Balanced | 2,46,232 to 2,77,329 | 1,61,774 to 1,95,553 | 67.8 to 82.8 | 38.4 to 50.0 |
| Cautious | 3,42,072 to 3,71,138 | 3,16,576 to 3,48,027 | 100 | 100 |
| Maximum saving | 4,72,281 to 5,15,966 | 5,45,465 to 5,98,969 | 100 | 96.6 to 95.8 |

Net worth stays on target: Balanced and Cautious still bracket 2.5L and 1.7L, and Maximum saving
moves nearer 6L at month 21. **Safety overshoots:** Balanced at 82.8 against 65 at month 21 and
50.0 against 39 at month 24, both outside 20%. Random players reaching family money fall from 82%
to 78%.

**D26's figures: change the copy, not the engine.** Matching the engine to the copy does not
hold together:

- 11 LPA needs about +28,200 a month over staying, while D26-A's own result says "Take home jumps
  by about 18,000".
- 9 LPA needs about +15,000, which is not the "small raise" D26-B's result describes.
- "Staying pays 8.4 LPA" needs in-hand pay of about 55,600 by month 20, a 35% rise over the
  start that no decision gives.

The amounts, +18,000 and +4,000, are what the options' own words describe. So the LPA figures
should be derived from them. With D13's fix, for a player who took D13-A:

| Where | Now | Derived |
|---|---|---|
| "A large company at 11 LPA" and D26-A's label | 11 | 9.5 |
| "A six person startup at 9 LPA" and D26-B's label | 9 | 7.3 |
| "Staying pays 8.4 LPA" | 8.4 | 6.7 |

Without D13's fix they would be 9.0, 6.8 and 6.2. The staying figure depends on D13: a D13-B
player earns 6.8. That line could name no figure, since the player knows what they earn.

**D29 follows.** D29-A's offer is the last salary minus 2,900, and D29-B's plus 25,000, so any
raise moves both. With D13's fix, "5.8 LPA" becomes 6.3 and "10 LPA" becomes 10.5 for a player
who stayed at D26. There are two ways out: keep D29's words and change its amounts (D29-A about
-6,200, D29-B about +21,700), or keep the amounts and change the words. D29-A's 5.8 LPA was set
in v19 so a shared-flat player survives it. Any change there needs that survival check, which
`engine/test/shocks.test.js` runs, to pass again.

**Order, if all three are ruled:** D13's amounts first, then D26's words, then D29, then the
calibration report and the Safety targets again.

**The stated terms check is extended.** D26's three LPA figures, in the situation and both
labels, are checked the way D29's are, with one improvement. Each pay check now names the
earlier pay choices of the player it is checked against: D26 after D13-A, D29 after D13-A and
D26-C. A raise folds into pay, so D29's old check, measured from the starting salary, would have
gone on passing after D13's fix while the copy became false. Checked: with D13-A given the 8% on
a copy of the sheet, the extended check flags D29's 5.8 and 10 LPA as 6.3 and 10.5.

**It fails today, on five D26 terms,** because D26's copy is false today. It will pass once D26
is ruled. Until then, `python scripts/check_stated_terms.py` exits 1 by design.

### 9.3 The lines false for some paths, grouped by what would fix them

The sixteen from 8.2, plus one found while grouping: D03-C's callback, "Four months in, the
savings balance has never crossed 15,000", false for the shared flat and the room, which pass
15,000 before month 2.

**A. State the real figure with a token.** The line names an amount the player's own state
should supply.

| Line | The token would show |
|---|---|
| D08: "You have 38,000 in total", and D08-A's "13,000 left" | What the player has, and what is left after 25,000 |
| D22: "Your emergency fund is 32,000" | What the player has put by |
| D03-C's callback: "never crossed 15,000" | The highest balance since, or no figure at all |

Needs: a token in maths doc §10.1 for money the player holds. D08-A's "13,000 left" goes below
zero on some paths, so the sentence needs a rule for that, or rewriting.

**B. The option assumes something the player may not have: make it work without it.** These
need a ruling on mechanics, not only words: what the option does for a player who lacks the
thing.

| Line | Missing for | What has to be decided |
|---|---|---|
| D07: "You have 20,000 set aside", and three options moving 20,000 | The studio player, with 1,404 | Whether the options move what the player has, up to 20,000, or D07 means something else for them |
| D19-A: paying 1.4 lakhs | The studio player, with 75,345 | Whether paying more than you have is allowed, through the cascade, and what the result line says then |
| D22-B: paying 95,000 in cash | The studio player, with 71,828 | The same |
| D20-A and D20-B: move or keep "the index" | D16-B and D16-C players | What these mean with no index: the options change nothing in the engine for them today |
| D27-B, and "raise the SIP": "Your monthly investing has doubled" | D16-B and D16-C players | Whether D27-B starts investing for them, and what the callback says |
| D28-A: "live off the emergency fund" | Players with little or none | What "live off" means with nothing to live off |
| D28-B: stop "the monthly investment" | D16-C players | What stopping means with nothing to stop. The callback still shows for them |
| D28-C: the card | D17-B and D17-D players | Already ruled: D28-C gives a card (maths doc section 14) |

**C. Rewrite so it is true on every path, as D03 was.** The mechanics are fine; only the words
assume a state.

| Line | False for |
|---|---|
| D16's hook: "You have enough spare to start investing" | The studio player |
| D19's hook: "Your flatmate is moving cities." | The studio player, and a hook no decision follows for anyone |
| D21: "You have no spouse, no children, no loan." | Players with the phone EMI, a card balance or family money |
| D27: "Your income went up." | Players who stayed at D26 (and, today, took D13-A or D13-C) |
| D10-A's result: "Savings back to near zero." | Players with far more or less than 60,000 |
| D22-B's result and callback: "almost nothing", "no runway" | The shared flat and the room, who keep 83,000 and more |
| D14-B's callback: "The money you kept is still invested." | Players whose investment the cascade sold. Rare |
| D19-A's result: "most of what you have saved" | Also in group B, for the studio player |

**The shape of the work.** Group C is words only, eight lines, and each can be ruled on its own,
as D03 was. Group A needs one new token and three sentences rewritten around it. Group B is the
real work: seven lines where the product owner has to decide what an option does for a player
without the thing it assumes, before any words can be right. One question underlies B: whether
an option that cannot apply should still be offered and do something smaller, or not be offered
at all. D03 ruled against hiding a situation. An option that cannot happen, such as moving an
index fund you do not own, may be different.

Separately, group B's D07 and D03-C's studio path (9.1) share one question: what spending money
you do not have should do, when the option's words assume you have it.

---

## 10. Rulings of 29 September 2026, fifth set

| # | Ruling | Status |
|---|---|---|
| 1 | An option that cannot apply is never offered; a decision keeps at least two options | Recorded as rule 29 in the maths doc §10, with what it needs. Not built |
| 2 | D03-C costs 5,000, spent. The studio player's cascade to family money is wanted | Applied, sheet v31 |
| 3 | D13's 8% is real in the engine: +3,304 for D13-A and D13-C, +3,904 for D13-B | Applied, sheet v31. New Safety targets proposed in the maths doc §14, not applied |
| 4 | D26 quotes derived pay, 9.5 and 7.3 LPA, and drops the staying figure | Applied, sheet v31 |
| 5 | D29 keeps its amounts; its words follow: 6.3 and 10.5 LPA. The shocks test must pass | Applied, sheet v31. The shocks test passes |

**Two changes to section 9.3 that follow from v31:**

- **D27's "Your income went up." is now true on every path,** since every D13 option raises pay
  from month 9. It leaves group C.
- **D29's offer is still path-dependent.** "One offer at 6.3 LPA, below what you made" is true
  for a player who stayed at D26. D29-A's amount is the last salary minus 2,900, so a player who
  took D26-A is offered about 9.0 LPA and one who took D26-B about 6.9. The check is declared for
  the staying path (`PAY_PATH_D29`). It joins group A: the figure would need a token for the
  player's own offer, or the words to name no figure, as D26's staying line now does.

**Rule 29 has one hard case:** D20. Its two investment options both require an index
investment, which leaves a player without one with only "Ignore it", below the two-option
minimum. D20 needs a second option for that player, which is content for the product owner.

---

## 11. Rulings of 29 September 2026, sixth set

| # | Ruling | Status |
|---|---|---|
| 1 | Rule 29's reading confirmed: structural means the thing the option acts on exists; affordability is never a precondition | Recorded in rule 29 |
| 2 | Safety targets 73, 47, 100 and 74 | **Applied** in §13. The report (`calibration/REPORT-2026-09-29b.md`) reads every Safety target in range except strong at month 24, where Maximum saving's 95.8 sits above 74, which is not a miss |
| 3 | D20 needs a fourth option for a player with no index investment | Drafted, 11.1. Not applied |
| 4 | Draft the `requires` vocabulary and place all 94 options. Do not build | Drafted, 11.2 |

### 11.1 D20-D: starting small caps from scratch. The draft

**A difference to settle first.** The ruling describes the fund as up 60% last year. D20's
situation says 40%, "A colleague says he made 40% last year in small companies", and the
small-cap script is built to deliver about +40% over the twelve months to month 14 (maths doc
§7). The draft below keeps 40%. If it should be 60%, both the copy and the script change.

| Field | Draft |
|---|---|
| Label | "Start with 30,000 in small caps, like him" |
| Amount | `money_once` -30,000 into `small_cap`, at month 14. No monthly amount: starting from nothing, the lump is the temptation |
| Result line | "Feels smart. You check the app before breakfast." |
| Life | +1 now, -2 at the callback: the most rewarding option on the screen at the moment of choosing, where "Ignore it" costs 2 now |
| Callback | Month 22, eight months later: "{equity_change_pct}. You started with 30,000, at the top." |
| Requires | `no_index`: offered only to a player with no index investment (11.2) |

Why 30,000: it is half again D20-B's "small extra" of 20,000, the bet an investor can add. It is
large enough to feel like going in properly, and it is not everything.

**What it does,** measured with the draft option added in memory, on the shared-flat path with no
index investment, over 200 market seeds:

| When | Median value of the 30,000 |
|---|---|
| Month 15 | 31,693, up 6% |
| Month 16 | 32,647, up 9%: the first months feel smart, as the colleague said |
| Month 22, the callback | **23,487, down 22%, on all 200 seeds.** Worst 18,316 |
| Month 24 | 24,050 |

The fall is not luck: months 17 to 22 are the small-cap lesson window (maths doc §7), damped so
the script wins, so every player who takes D20-D sees the loss at the callback. Month 22 is also
the layoff month, so the loss lands the week the job goes.

For a player with no index, the screen then shows two options: "Start with 30,000 in small caps,
like him" (+1 Life now) and "Ignore it" (-2 Life now). The tempting one costs about 6,500 by
month 22; the dull one costs nothing but face at lunch.

**Checks it would need:** the stated terms check holding the label's and the callback's
"30,000" to `money_once`, like D02's deposits.

**Found while drafting, flagged:** D20-C's callback, "He has stopped mentioning it. Nobody says
anything about yours either.", assumes the player has an investment ("yours"). For a player with
no index it is false: group C, a rewrite.

### 11.2 The `requires` vocabulary, and where all 94 options sit

**Most preconditions need no new column.** Only two options in Chapter 1 act on a commitment,
and the sheet already says which one: `modifies_commitment`. D20-A moves D16-A's investment;
D28-B stops D16-A's or D16-B's. The engine can derive their precondition from that column: an
option that modifies a commitment is offered only while one of its targets is running. That
covers every future option of the same kind without anyone remembering to tag it.

**The explicit vocabulary is then two words:**

| Value | Meaning, answered by the engine from the state |
|---|---|
| `index` | D16-A's monthly investment is running, whether into the index or, after D20-A, into small caps |
| `no_index` | It is not |

Every other precondition in Chapter 1 would be affordability, which rule 29 says is never one.

**All 94 options, plus the draft D20-D:**

| Decision | Options | Precondition |
|---|---|---|
| D01 | D01-A, D01-B, D01-C | None |
| D02 | D02-A, D02-B, D02-C | None |
| D03 | D03-A, D03-B, D03-C | None |
| D04 | D04-A, D04-B, D04-C | None |
| D05 | D05-A, D05-B, D05-C | None |
| D06 | D06-A, D06-B, D06-C | None |
| D07 | D07-A, D07-B, D07-C, D07-D | None |
| D08 | D08-A, D08-B, D08-C | None |
| D09 | D09-A, D09-B, D09-C | None |
| D10 | D10-A, D10-B, D10-C | None |
| D11 | D11-A, D11-B, D11-C | None |
| D12 | D12-A, D12-B, D12-C | None |
| D13 | D13-A, D13-B, D13-C | None |
| D14 | D14-A, D14-B, D14-C, D14-D | None |
| D15 | D15-A, D15-B, D15-C | None |
| D16 | D16-A, D16-B, D16-C | None |
| D17 | D17-A, D17-B, D17-C, D17-D | None |
| D18 | D18-A, D18-B, D18-C | None |
| D19 | D19-A, D19-B, D19-C | None |
| D20 | D20-A, D20-B, D20-C, D20-D (draft) | D20-A: derived: D16-A running (it modifies D16-A); D20-B: `index`; D20-D: `no_index` |
| D21 | D21-A, D21-B, D21-C | None |
| D22 | D22-A, D22-B, D22-C | None |
| D23 | D23-A, D23-B, D23-C | None |
| D24 | D24-A, D24-B, D24-C | None |
| D25 | D25-A, D25-B, D25-C | None |
| D26 | D26-A, D26-B, D26-C | None |
| D27 | D27-A, D27-B, D27-C | None |
| D28 | D28-A, D28-B, D28-C, D28-D | D28-B: derived: D16-A or D16-B running (it modifies both) |
| D29 | D29-A, D29-B, D29-C | None |
| D30 | D30-A, D30-B, D30-C | None |

**How many disappear.** At most three options on any path, all at D20 and D28, and one appears:

| Path | Hidden | Shown instead | Options left at D20 | At D28 |
|---|---|---|---|---|
| Quiet path (every quietest option: D16-C) | D20-A, D20-B, D28-B | D20-D | 2 (C, D) | 3 (A, C, D) |
| Cautious (D16-C) | D20-A, D20-B, D28-B | D20-D | 2 | 3 |
| Balanced (D16-C) | D20-A, D20-B, D28-B | D20-D | 2 | 3 |
| Maximum saving (D16-B) | D20-A, D20-B | D20-D | 2 | 4: D16-B's deposit is running, so D28-B stays |
| Spender (D16-A) | D20-D | none | 3 (A, B, C) | 4 |

No decision falls below two options on any of these paths. Without D20-D, every path except
Spender's would reach D20 with one option, "Ignore it", which is why rule 29 cannot be built
before D20-D exists.

Cautious has a monthly investment at D28, D27-B's, but D28-B does not act on it: the sheet says
D28-B stops D16's. So D28-B is hidden for Cautious. If "Stop the monthly investment" should stop
any running investment, D28-B's `modifies_commitment` would need D27-B and D27-C added, which is a
content ruling.


---

## 12. Rulings of 29 September 2026, seventh set

| # | Ruling | Status |
|---|---|---|
| 1 | The fund is 40%: the ruling's 60% was the product owner's error | Copy and market script unchanged |
| 2 | D20-D approved as drafted | **Applied, sheet v32** |
| 3 | D20-C's callback must be true for a player who ignored the fund and owns nothing | Drafts below (12.1). Not applied |
| 4 | D28-B stops any running monthly investment, D27's included | **Applied, sheet v32.** See 12.2 for one change the engine needed |
| 5 | Build rule 29: preconditions from `modifies_commitment`, `index` and `no_index`, `optionsFor`, the game and calibration reading it, the two-option test | **Built.** Maths doc rule 29 |

### 12.1 D20-C's callback: the drafts

Now: "He has stopped mentioning it. Nobody says anything about yours either." The second sentence
assumes the player has an investment of their own. D20-C is offered to everyone, so the callback
has to be true for an index investor who ignored the tip and for a player who owns nothing.

| Draft | Text | Note |
|---|---|---|
| A | "He has stopped mentioning it." | The first sentence alone. True for everyone, and loses the second beat |
| B | "He has stopped mentioning it. So has everyone else at lunch." | Keeps a second beat, picking up D20-C's result line, where he brings it up "at lunch, twice, in front of others" |

Recommendation: B. Neither has a figure, so the stated terms check is unchanged.

### 12.2 What the build found

- **D28-B would have stopped a spending cost.** D27-C opens two commitments: 6,000 a month into
  equity and 6,000 a month of comfort, spent. Rule 17 paused every commitment an option opened,
  so naming D27-C would have paused the comfort half for four months too. The maths doc's open
  items had recorded this as the reason D27 was left out. Rule 17 now acts on saving commitments
  only, and a test checks that D27-C's comfort half keeps being spent.
- **D28-B's result still says "5,000 a month back",** D16's figure. A player stopping D27-B's
  12,000 gets more back than it says. Flagged, not changed: a token or a rewrite.
- **Balanced's Safety at month 24 rose from 50.0 to 75.6,** above the 47 target
  (`calibration/REPORT-2026-09-29c.md`). Balanced has no investment running at D28, so it used to
  pick D28-B, which did nothing for it: exactly the broken button rule 29 removes. D28-B is no
  longer offered to it, so it takes D28-C and puts the gap on the card, which leaves its savings,
  and so its runway, intact. The rule working, not a target to refit.
- **The survival test now plays 1,188 paths.** The other 108 of its 1,296 combinations choose
  D28-B after D27-A, with no investment running, so they cannot happen. The highest card balance
  is unchanged at 1,61,761.
- **The Phase 0 harness applies rule 29 too,** from the tester's own choices. Played through in
  Chrome at 320 by 568: with D16-A it shows D20-A, D20-B and D20-C at D20 and D28-B at D28; with
  D16-C it shows "Ignore it" and D20-D at D20, and no D28-B. Every screen fits.
- **The fit check now walks two paths,** each decision's first offered option and its last, so an
  option offered only to some players, such as D20-D, is rendered too: 60 screens, all fit.

---

## 13. Rulings of 29 September 2026, eighth set

| # | Ruling | Status |
|---|---|---|
| 1 | D20-C's callback: "He has stopped mentioning it. So has everyone else at lunch." | **Applied, sheet v33** |
| 2 | D28-B's "5,000 a month back" becomes a token for the amount actually stopped | Draft below (13.1). Not applied |
| 3 | Understand Balanced's Safety of 75.6 against 47 without refitting the target | Reported below (13.2) |

### 13.1 D28-B's result with a token: the draft

| | Text |
|---|---|
| Now | "5,000 a month back. The habit breaks in week one." |
| Draft | "{stopped_monthly} a month back. The habit breaks in week one." |

`{stopped_monthly}`, a new token for maths doc §10.1: the monthly amounts D28-B paused, summed
over the saving commitments of its targets running at the decision, in rupees. What players see:

| Running at D28 | Shows |
|---|---|
| D16-A or D16-B | "5,000 a month back." |
| D27-B | "12,000 a month back." |
| D27-C | "6,000 a month back.": the invested half only; its comfort half keeps running |
| D16-A and D27-B | "17,000 a month back." |

It can never be empty: under rule 29, D28-B is offered only while one of these runs. What it
needs: the token in `engine/tokens.js` and §10.1, formatted by `text/` like every rupee token;
and a Phase 0 sample, "5,000", since D28 is a Phase 0 test decision and the harness has no
engine. The stated terms check is unaffected: "5,000" was never a checked term.

### 13.2 Balanced's Safety at month 24

`calibration/REPORT-2026-09-29c.md`, medians over seeds 1 to 100. Balanced is 1,93,637 against the
1.7L median net worth target: above it by 14%, inside the 20% band, so "in range". It does not beat
the target outright, and D28-C is not what lifts it: of the three options open to it at D28,
D28-C leaves it with the least net worth.

**Balanced's own run, seed 1, each D28 option forced:**

| D28 | Month 24: net worth, Safety, runway | Cash, card debt | Month 30: net worth, Safety | Card debt at month 30 |
|---|---|---|---|---|
| D28-A, cut everything | 2,02,450, 54.9, 2.1 months | 19,875, none | 1,85,127, 51.5 | None |
| **D28-C, the gap on the card** | **1,88,965, 76.0, 3.9 months** | **96,236, 89,846** | **1,74,687, 82.6** | **1,76,523** |
| D28-D, parents cover | 2,13,768, 59.0, 2.5 months | 31,193, none | 2,00,950, 54.9 | None |

**It is an artefact of how Balanced picks,** and it exposes something about Safety.

1. **The pick.** Balanced chooses the option whose net worth, right after choosing, is nearest the
   middle of the options'. At that moment D28-A and D28-C score exactly the same, 2,77,348,
   because neither has cost anything yet: the card and the cut both land when the months run.
   The midpoint is 2,79,848, so they tie, and the tie goes to the option that moves less money,
   D28-C. It is chosen on 99 of 100 seeds. A player who could see eight months ahead would not
   take it: it is the worst of the three for net worth at month 24 and at month 30.
2. **Why Safety rewards it.** Runway is reachable money over a month of essential costs (§4).
   D28-C keeps the player's own cash untouched and borrows the gap, so reachable money stays high,
   96,236 at month 24, while the card debt, 89,846, enters Safety only as its 5% minimum in the
   monthly costs. Borrowed money reads as runway. By month 30 the player holds 1,17,379 of cash
   against 1,76,523 of card debt and Safety reads 82.6, its highest.
3. **Before rule 29** Balanced picked D28-B, which did nothing for a player with no investment. The
   cascade then paid the gap from its own cash, which is why Safety fell to 50.

So the target of 47 is not the problem, and 75.6 is not a better Balanced. Two separate things
could change, both rulings for later:

- **Balanced's rule scores an option's instant effect.** Any option whose cost lands later, such as
  borrowing, looks free to it. Scoring net worth a few months on, or at month 24, would fix it.
- **Safety counts borrowed cash as runway.** Netting card debt against reachable money, or counting
  more than the minimum payment, would stop a player living on the card from looking safe. That is
  a §4 formula change, and it would move every player who holds a card balance.

---

## 14. Rulings of 30 September 2026

| # | Ruling | Status |
|---|---|---|
| 1 | D28-B's token, with a Phase 0 sample of 5,000 | **Applied, sheet v34.** A text test checks it reads 5,000, 12,000 and 17,000 |
| 2 | Safety: net card debt against reachable money in the runway | Measured below (14.2). Not applied |
| 3 | Balanced scores net worth at month 24, as maximum saving does | **Applied** in the harness and maths doc §13. What moved, 14.1 |

### 14.1 What the new Balanced rule moved

`calibration/REPORT-2026-09-30.md`, medians over seeds 1 to 100:

| Balanced | Before (instant net worth) | Now (net worth at month 24) |
|---|---|---|
| Net worth, month 21 | 2,77,329 | 2,33,450, brackets 2.5L |
| Net worth, month 24 | 1,93,637 | 1,51,230, brackets 1.7L |
| Safety, month 21 / 24 | 82.8 / 75.6 | **30 / 30**, below 73 and 47 |
| Freedom, month 21 / 24 | 40.7 / 23.5 | **0 / 0** |

Seventeen of its thirty choices changed. It now takes the EPF top-up, the 6,000 auto-transfer,
the endowment, the recurring deposit, the scooter on EMI, half the family loan and more. At the
end of month 21, seed 1, it has committed 98% of its income, holds no cash (the payment cascade
breaks its recurring deposit every month to pay the bills), and its net worth sits where it cannot
be reached: 1,39,224 in the retirement fund, 70,555 in the endowment, 1,06,958 in the scooter. By
month 24 its card carries 1,46,998.

**It removed one artefact and exposed another.** Scoring net worth at any horizon cannot see
liquidity or Freedom. Locked products keep their value in net worth, so a rule looking for the
middle of month 24 net worth drifts toward committing everything. Two trials, on 30 seeds, not
applied:

| Balanced takes | Net worth 21 / 24 | Safety 21 / 24 | Freedom 21 / 24 |
|---|---|---|---|
| The middle of the league score at month 24 (all four bars) | 2,04,872 / 1,23,760 | 32.4 / 30.0 | 6.5 / 0.0 |
| The best league score at month 24 | 5,08,352 / 5,54,719 | 100 / 95.8 | 86.8 / 95.8 |

The first still over-commits: the trouble is "take the middle option", which, repeated thirty
times, piles up moderate commitments. The second is not balanced at all: it plays almost exactly
like Maximum saving, because nothing in Chapter 1 costs a saver money (validation 1). A thoughtful
optimiser in Chapter 1 simply saves.

So there is no small change that makes Balanced a thoughtful middle player. The choices, for a
ruling:

- Keep net worth at month 24, as ruled, and accept that Balanced now reads as an over-committed
  player: Safety and Freedom at the floor.
- Go back to instant net worth, and accept the D28 card artefact (13.2).
- Define Balanced by habits rather than a score: the middle option on net worth at month 24, but
  never one that takes committed income above a ceiling or leaves less than a month of runway.
  That would be a new rule, trialled before it is ruled on.

The Safety median targets were derived from runway, not from Balanced, so none of this moves them.

### 14.2 Safety with card debt netted: the measurement

**The change, §4:**

```
reachable = max(0, sum(reachable_parts) - card_debt)
```

`card_debt` is the principal of every card debt. Family money, a 0% loan, is left out, as ruled
(card debt only). The runway, reachable over essential monthly costs, and so Safety, then fall
as a card balance grows. Measured on a patched copy of the engine; the engine is unchanged.

| | Now | Card debt netted |
|---|---|---|
| Cautious, Safety 21 / 24 | 100 / 100 | 100 / 100 |
| Spender | 30 / 30 | 30 / 30 |
| Balanced (new rule) | 30 / 30 | 30 / 30 |
| Maximum saving | 100 / 95.8 | 100 / 95.8 |
| Random Safety p10 / p50 / p90, month 21 | 30.0 / 30.0 / 50.4 | 30.0 / 30.0 / 49.7 |
| Random Safety p10 / p50 / p90, month 24 | 26.4 / 30.0 / 42.7 | 26.2 / 30.0 / 31.7 |
| Random players at 30, no runway, month 21 / 24 | 61% / 52% | 66% / 62% |
| **The old Balanced path, living on the card after D28-C** | **76.0 at month 24, 82.6 at month 30** | **47.6 and 33.2** |

The four player types do not move: none of them now holds both cash and a card balance. Random
play moves at the top: the 90th percentile at month 24 falls by 11 points, and one player in ten
more reads no runway, because their cash no longer counts once it is owed. The case the ruling
was about is fixed: the player funding their life on the card reads 47.6 at month 24 and falls to
33.2 by month 30 as the debt grows, where it read 76.0 rising to 82.6.

What applying it touches: `explainSafety` in `engine/bars.js`, the runway figure beside Safety on
Home (the player would see fewer months of runway while they carry a card balance), maths doc §4,
and the engine tests that assert runway on states with a card.

---

## 15. Rulings of 30 September 2026, second set

| # | Ruling | Status |
|---|---|---|
| 1 | Safety nets card debt against reachable money, with the §4 change, tests and Home's runway figure | **Applied** (`333c244`). What moved, 15.1 |
| 2 | Balanced defined by habits: the middle option on net worth at month 24, but never above 60% committed or below one month of runway | Trialled below (15.2). Not applied |

### 15.1 What netting card debt moved

`calibration/REPORT-2026-09-30b.md`. The four player types do not move: none holds cash and a
card balance together. Random play moves as measured before: the 90th percentile of Safety at
month 24 falls from 42.7 to 31.7, and players reading no runway rise from 61% to 66% at month 21
and from 52% to 62% at month 24. Validation 3 counts fewer prepared players, 7 at the layoff
(from 10) and 5 at D30 (from 6), since netted runway is stricter about who is prepared; both
still pass. Home's runway figure beside Safety reads the netted runway.

### 15.2 Balanced by habits: the trial

The rule as trialled (`calibration/trial-balanced-habits.mjs`): at each decision, the option nearest
the middle of the options' net worth at month 24, among those that, right after being applied,
keep committed income at or below 60% (`committed_ratio`, §5) and leave at least one month of
runway (§4, netted). If the middle option crosses a limit, it takes the nearest option that does
not.

**If no option avoids crossing a limit,** the trial takes the options that cross the fewest limits,
and among them the one nearest the middle. That happens:

| Decision | Seeds, of 100 | Why |
|---|---|---|
| D02 | 100 | Every flat leaves under a month of runway once its deposit and first rent are paid in month 1. It takes the shared flat on seed 1 |
| D30 | 42 | Month 24, after the layoff, runway is thin whatever the choice |
| D27 | 4 | |
| D26 | 1 | |

A different fallback would be to take the option that leaves the most runway. For D02 that is the
room out of town. Either is a ruling.

**The four bars, medians over seeds 1 to 100:**

| Balanced | Instant net worth (before) | Net worth at month 24 (applied) | **Habits (trial)** | Target |
|---|---|---|---|---|
| Net worth, month 21 | 2,77,329 | 2,33,450 | **2,68,239**, in range | 2.5L |
| Safety, month 21 | 82.8 | 30.0 | **56.3**, just below | 73 |
| Freedom, month 21 | 40.7 | 0.0 | **26.2** | none |
| Life, month 21 | 44.4 | 44.2 | **39.3** | none |
| Net worth, month 24 | 1,93,637 | 1,51,230 | **2,13,440**, just above | 1.7L |
| Safety, month 24 | 75.6 | 30.0 | **35.2**, just below | 47 |
| Freedom, month 24 | 23.5 | 0.0 | **24.0** | none |
| Life, month 24 | 40.4 | 42.8 | **38.9** | none |

The "before" column's Safety was measured before card debt was netted; it would read lower now.

It reads like a middle player: net worth near the median target, runway of about 2.3 months at
month 21, and a quarter of its income still free. It sits just outside the 20% band on Safety at
both months, low, and on net worth at month 24, high. Those are the targets derived from runway,
so they are not refitted to it.

Seed 1 choices: D01-C D02-B D03-A D04-A D05-B D06-B D07-A D08-C D09-B D10-C D11-A D12-B D13-A
D14-C D15-B D16-C D17-A D18-B D19-B D20-C D21-B D22-C D23-B D24-C D25-B D26-B D27-B D28-A D29-C
D30-B. It takes EPF and the 6,000 transfer, refuses the endowment, pays half its father's loan,
keeps taking autos, and at the layoff cuts everything rather than borrow.

---

## 16. Rulings of 30 September 2026, third set

| # | Ruling | Status |
|---|---|---|
| 1 | Adopt Balanced by habits | **Applied** in `calibration/harness.js`, with `BALANCED_COMMITTED_LIMIT` 0.6 and `BALANCED_RUNWAY_LIMIT` 1; recorded in maths doc §13 |
| 2 | The fallback: fewest limits crossed, then nearest the middle. Not most runway | Applied and recorded in §13, with why D02 always triggers it: every flat leaves under a month of runway once its deposit and first rent are paid, which is true of a real 22-year-old |
| 3 | Leave all targets as derived | Recorded in §13 |

The rerun (`calibration/REPORT-2026-09-30c.md`) matches the trial figure for figure: Balanced's
medians are 2,68,239 net worth, Safety 56.3, Freedom 26.2 and Life 39.3 at month 21, and
2,13,440, 35.2, 24.0 and 38.9 at month 24. Against the targets: net worth in range at month 21 and
just above at month 24; Safety just below at both. The report now takes about 160 seconds,
because Balanced plays each option on to month 24 at every decision.
