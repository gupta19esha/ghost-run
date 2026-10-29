# Chapter report

The screen after month 24 closes. Built in `game/screens/report.js`: it stands where Home
would once month 24 closes, and the save's replay stops at the chapter's end. Before it was
built, the chapter just stopped: Home showed month 25 with no heading and Play would have
run empty months. The spec below is kept as written; where it waits on something since
settled, a note says so.

**Artboard: `design/ChapterReport.html`.** It is the source of truth for look.

---

## The two calls I made, since you asked me to

**A report, not a verdict.** Your writing rules say no option is obviously correct, and
the v2 pass stripped moralising out of every callback. A verdict would put the judgement
back in at the last possible moment, after twenty-four months of carefully not judging.
The report states what happened and lets the player draw the conclusion.

**It names months, not decisions.** Section 14 of the maths doc records that the engine
keeps no attribution of a month's change to the choice that caused it. So "your worst
decision was the scooter" is a claim the engine cannot support, and the UI would be
inventing it. "Month 16 cost you the most" is measured and true, and the timeline is one
tap away for the player to go and look at what they actually did.

This is also the honest version of your spec's "three best, three worst". That belongs in
the Life Report at 42, where twenty years of data can support it. Two years cannot.

---

## What it shows

| Block | Content | Source |
|---|---|---|
| Heading | "Chapter one closed" and "Two years. You are 24." | Sheet's `chapter_title`, engine's age |
| Net worth | Final figure, and the change across the whole chapter | `getBars`, `compareBars` over months 1 to 24 |
| Three bars | Where Safety, Freedom and Life ended, with their figures | `getBars`, `explainBars` |
| Months that moved most | The best month and the worst, by net worth change, each with one line from the sheet | New engine measure, below |
| A link | "see every month", opening the timeline | Existing |
| Concepts | How many were unlocked, and their titles | `conceptForMonth` across months 1 to 24 |
| Chapter two | The next chapter's title and one line | Sheet, when chapter 2 exists |
| Button | "Keep going" | |

It is the longest screen in the product and the only one that scrolls. That is correct:
it is read once, not tapped through, and it is the screenshot screen's sibling.

---

## What the engine needs

One new measure, `chapterMonths(state)`, returning each month's net worth change across
the chapter, so the report can name the highest and lowest. The engine already has the
per-month history; this only exposes it.

**The one-line description of each month is content, not code.** Month 9 is "The bonus
landed." Month 22 is "The job went." Those are not in the sheet.

Add a `month_summary` column, filled on the first decision of each month, twenty-four
lines, past tense, under six words. I have not drafted them: they are the same kind of
copy as the hooks and should be written in one pass with them in view.

Until that column exists, the report shows the month number and the figure with no line.
That is not broken, it is just thinner.

**Since settled:** `month_summary` is on Decisions from sheet v25, all 24 lines, the product
owner's copy from `REPORT-COPY.md`. The report shows it under each month it names.

---

## Colour

The two month rows use teal and vermilion for the change, per rule 4. The bars use the
same rule as everywhere else: the colour is the change across the chapter, not the level.

Note that Freedom in the artboard is vermilion because it fell over two years, which is
what happens to most players. Safety is teal. Life is slate. Those are illustrative
figures, not a target.

---

## What it does not solve

**Chapter 2 does not exist.** The report's last block points at it and the button says
"Keep going". Until Chapter 2 has decisions, that button has nowhere to go.

The honest options are: the button says "Keep going" and leads to a screen saying Chapter
2 is being written, or the block is left out until there is something to point at. I
would leave it in with an honest line, because a chapter that ends by promising nothing
reads worse than one that ends by promising something not yet ready.

That needs your copy either way.

**Since settled:** the block stays in, with "Building is being written. You are 24, and the
money gets more complicated." The button at the end is "See your life so far" and opens the
timeline. Both are the product owner's copy, from `REPORT-COPY.md`.
