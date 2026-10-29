# Phase 0 test harness brief

The revised decision sheet is `chapter1_decisions_v2.xlsx`, in this folder. It replaces
an earlier version. Read the README sheet first, it has a changelog of what changed and
why. Green rows are changed, the orange row is new.

Build the Phase 0 test harness. It is deliberately throwaway code. Plain HTML, CSS and
vanilla JavaScript in a single file. No framework, no npm, no build step, no dependencies.

This tests one thing only: whether the decisions are interesting enough that a reader
wants the next one. It is not the game. Do not show any numbers, bars, net worth or
scores anywhere.

## TASK 1

Write `scripts/xlsx_to_json.py` using openpyxl. It reads the xlsx and writes
`data/decisions.json` containing only the rows where `phase0_test = Y`, sorted by month,
with each decision's options nested inside it. Include `situation_text`, `option_label`,
`immediate_text`, `deferred_text` and `deferred_offset_months`. Exclude every numeric
field: `money_once`, `money_monthly`, `safety`, `freedom`, `life` and all `def_` columns.

## TASK 2

Build `index.html`. One screen at a time, mobile first, dark background, one-handed thumb
use, no scrolling on a decision screen.

Flow per decision:

1. Month card. "Month 11. You are 22." Auto-advance after 2 seconds.
2. Situation text, large, centred. Options as full-width tappable cards below.
3. On tap, show only the `immediate_text` of the chosen option. Auto-advance after 2.5
   seconds, tappable to skip.
4. If an earlier choice has a `deferred_offset_months` landing on this month, show that
   `deferred_text` as a callback card before the next decision.
5. After the last decision: "Do you want to know what happens next?" with Yes and No,
   then a free text box asking which decision they thought about longest.

A visible Quit button on every screen. Quitting is data, not failure.

## TASK 3

Logging. Keep an event array in memory, mirror to localStorage after every event. Record
`decision_id`, `option_id` chosen, `ms_on_screen` from render to tap, timestamp, and a
quit event with the `decision_id` where it happened. Add a Download CSV button at the end
and on a hidden long-press of the title. Wrap every localStorage call in try/catch and let
the test run normally if storage fails.

## CONSTRAINTS

No real brand names anywhere. No real fund, bank, insurer or app. This is a legal
requirement, not a style choice.

Keep all copy exactly as written in the spreadsheet. Do not rewrite, shorten or improve
my text.

Start with Task 1 and show me the JSON output before building the UI.
