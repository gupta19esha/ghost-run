// The chapter as a whole, for the chapter report

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  createState, applyDecision, advanceMonth, decisionsForMonth, getBars, compareBars, chapterMonths, chapterComplete,
} from "../index.js";

// Plays whole months, taking each decision's first option, and records what month close
// would have shown for each month
function play(months) {
  let state = createState(1);
  const closes = [];
  for (let m = 0; m < months; m++) {
    const start = getBars(state);
    for (const d of decisionsForMonth(state)) state = applyDecision(state, d.decision_id, Object.keys(d.options)[0]).state;
    const { state: next, events } = advanceMonth(state);
    closes.push(compareBars(start, events.find((e) => e.type === "bars")).netWorth.change);
    state = next;
  }
  return { state, closes };
}

test("chapterMonths: each closed month's net worth change, the same figure month close showed", () => {
  const { state, closes } = play(3);
  const rows = chapterMonths(state);
  assert.deepEqual(rows.map((r) => r.month), [1, 2, 3]);
  rows.forEach((r, i) => assert.ok(Math.abs(r.change - closes[i]) < 1e-9, `month ${r.month}`));
  assert.equal(rows[2].net_worth, getBars(state).netWorth);
  assert.equal(chapterMonths(createState(1)).length, 0, "nothing closed, nothing to report");
});

test("chapterMonths over the whole chapter: 24 months that add up to the chapter's change", () => {
  const { state } = play(24);
  const rows = chapterMonths(state);
  assert.equal(rows.length, 24);
  const total = rows.reduce((sum, r) => sum + r.change, 0);
  const start = getBars(createState(1)).netWorth;
  assert.ok(Math.abs(total - (getBars(state).netWorth - start)) < 1e-6);
});

test("chapterComplete: only once month 24 has closed", () => {
  assert.equal(chapterComplete(play(23).state), false);
  assert.equal(chapterComplete(play(24).state), true);
});
