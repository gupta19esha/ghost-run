// UI.md: the UI reads decisions through the engine's interface.

import { test } from "node:test";
import assert from "node:assert/strict";

import CONSTANTS from "../constants.js";
import DECISIONS from "../decisions.js";
import { createState, applyDecision, advanceMonth, decisionsForMonth, getDecision, salaryThisMonth, conceptForMonth, monthSummary } from "../index.js";

test("month 1 offers D01 then D02, and a decision already made is not offered again", () => {
  let state = createState(1);
  assert.deepEqual(decisionsForMonth(state).map((d) => d.decision_id), ["D01", "D02"]);
  state = applyDecision(state, "D01", "D01-A").state;
  assert.deepEqual(decisionsForMonth(state).map((d) => d.decision_id), ["D02"]);
});

test("content comes back as a copy the caller cannot use to change the sheet", () => {
  const first = getDecision("D01");
  first.situation_text = "changed";
  first.options["D01-A"].life = 99;
  const again = getDecision("D01");
  assert.notEqual(again.situation_text, "changed");
  assert.notEqual(again.options["D01-A"].life, 99);
  assert.throws(() => getDecision("D99"), /Unknown decision D99/);
});

test("salaryThisMonth: what the month card says will be paid, before the month runs", () => {
  let state = createState(1);
  assert.equal(salaryThisMonth(state), CONSTANTS.SALARY_NET_START);

  // D01-A's 1,800 is a salary change starting the month after the decision
  state = applyDecision(state, "D01", "D01-A").state;
  assert.equal(salaryThisMonth(state), CONSTANTS.SALARY_NET_START, "not yet in month 1");
  state = advanceMonth(state).state;
  assert.equal(salaryThisMonth(state), CONSTANTS.SALARY_NET_START + 1800);
  const before = structuredClone(state);
  salaryThisMonth(state);
  assert.deepEqual(state, before, "previewing changes nothing");

  // The layoff month pays no salary, and the month card must not claim otherwise
  let laidOff = createState(1);
  laidOff.month = DECISIONS.D28.month;
  assert.equal(salaryThisMonth(laidOff), 0);
  const result = advanceMonth(laidOff);
  assert.equal(result.events.find((e) => e.type === "salary_in").amount, 0);

  // D29-A restarts salary lower, in the month the engine restarts it
  laidOff = applyDecision(result.state, "D29", "D29-A").state;
  laidOff = advanceMonth(laidOff).state;
  assert.equal(laidOff.month, laidOff.employment.restart_month);
  assert.equal(salaryThisMonth(laidOff), CONSTANTS.SALARY_NET_START + DECISIONS.D29.options["D29-A"].money_monthly);
});

test("conceptForMonth: one card a month from the sheet, four months without, whatever was chosen", () => {
  const months = Array.from({ length: 24 }, (_, i) => i + 1);
  const empty = months.filter((m) => conceptForMonth(m) === null);
  assert.deepEqual(empty, [7, 13, 19, 23]);
  assert.equal(conceptForMonth(1).title, "EPF");
  assert.equal(conceptForMonth(2).decision_id, "D04", "the decision that earned it, not the month's first");
  assert.equal(conceptForMonth(16).title, "Depreciation");
  assert.equal(conceptForMonth(25), null);
  for (const m of months) {
    const card = conceptForMonth(m);
    if (card) assert.ok(card.body.split(/\s+/).length < 45, `month ${m}'s card is under 45 words`);
  }
});

test("monthSummary: a line for every month of the chapter, from its first decision", () => {
  for (let m = 1; m <= 24; m++) {
    const line = monthSummary(m);
    assert.ok(line, `month ${m} has a line`);
    assert.ok(line.split(" ").length <= 5, `month ${m}'s line is five words or fewer`);
  }
  assert.equal(monthSummary(9), "The bonus landed.");
  assert.equal(monthSummary(22), "The job went.");
  assert.equal(monthSummary(25), null);
});
