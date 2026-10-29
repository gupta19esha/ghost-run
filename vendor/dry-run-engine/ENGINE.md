# Engine build brief

Read `SIMULATION-MATHS.md` first. It is the specification. This document says how to
build it and in what order.

Do not start until the sheet reaches v8 and the open items in section 10 are closed.

---

## What this is

A pure JavaScript module that takes a decision and returns a new game state. No UI, no
framework, no DOM. It must run in Node for testing and in a browser for the game,
unchanged.

Keeping it framework-agnostic matters: the UI framework may change, the engine must not
have to.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Engine | Plain JS, ES modules, no build step | Testable in Node, runs in a browser, nothing to configure |
| Data | The xlsx stays the source of truth. `xlsx_to_json.py` exports the full sheet, not the Phase 0 subset | One place to edit content |
| UI | Decide after the engine is calibrated | The engine must not depend on it |
| Tests | Node's built-in test runner | No dependency |

No npm packages in the engine. If something needs a package, ask first.

---

## Build order

Each step ends with tests that pass before the next begins.

### Step 1: state and ledger

Implement section 2. A `createState()` that returns the opening position, and the
eleven-step monthly order of operations as separate functions.

Test: run 24 months with no decisions at all. Salary in, costs out, nothing else. Net
worth must move in a straight, explainable line. Print the month-by-month table.

### Step 2: the four bars

Implement sections 3 to 6. Net Worth, Safety, Freedom, Life.

Test: hand-build three states and assert the bars. A player with six months of runway
and health cover scores high on Safety. A player with 70% of income committed scores
zero on Freedom. Print the workings, not just the result.

### Step 3: applying a decision

Read a decision from the exported JSON. Apply every column in section 10: both money
slots, liquidity classes, commitments, cover, assets. Schedule the deferred effect.

Test: apply D11-C. Assert an EMI of 6,600 exists with 12 months remaining, an asset
worth 79,000, Freedom has dropped, and a callback is queued for month 18.

### Step 4: returns and debt

Implement sections 7 and 8. The scripted market array, seeded noise, the debt
amortisation.

Test: the same seed twice produces identical output. A 5,000 monthly investment from
month 10 is worth more at month 240 than the same from month 40. The scripted crash
lands in the scripted months.

### Step 5: shocks

Implement section 9, the five-step payment cascade.

Test: the month 22 layoff against two states. A prepared player stops at step 1. An
unprepared one reaches step 4 and carries card debt out the other side. The difference
between those two runs is the product working.

### Step 6: text tokens

Implement section 10.1. Substitute `{equity_balance}` and the rest at render time.
Fall back to the token's default if a value is unavailable, never print a raw `{token}`.

### Step 7: calibration harness

Run N playthroughs with random choices. Output the distribution against the targets in
section 13, plus the four validation tests.

This is the step that tells you whether the constants are right. Expect to change
numbers in section 12 several times. Only section 12, never the logic.

---

## Interfaces

Keep these stable. The UI will be written against them.

```
createState(seed)                      -> state
applyDecision(state, decisionId, optionId) -> { state, effects }
advanceMonth(state)                    -> { state, events }
getBars(state)                         -> { netWorth, safety, freedom, life }
getHistory(state)                      -> month-by-month array
decisionsForMonth(state)               -> this month's decisions, each with only the options the state offers
optionsFor(state, decision)            -> the option ids the state offers (rule 29)
```

Rule 29 (maths doc §10): an option whose precondition the player does not meet is not
offered, and `applyDecision` refuses it.

`effects` and `events` are what the UI animates. The engine says what happened. It
never says how to show it.

---

## Rules

1. Every number the engine uses comes from section 12 or the sheet. No literals in the
   logic. The one named exception is authored month-by-month data, such as the market
   scripts, which comes from its own generated data file (section 12).
2. The engine never formats currency or writes player-facing prose.
3. Same seed and same choices produce the same run, always.
4. If the sheet and the doc disagree, stop and ask. Do not guess.
5. A test that needs the engine changed to pass is a finding. Report it.

---

## Not now

Leagues, streaks, accounts, sync, hosting, storage. All Phase 1. The engine runs
entirely in memory and knows nothing about where a game is saved.
