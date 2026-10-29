// ENGINE.md step 6 against the engine: every text a player can see, filled from a real run.

import { test } from "node:test";
import assert from "node:assert/strict";

import { renderText } from "../render.js";
import { createState, advanceMonth, applyDecision, tokenValues, optionsFor } from "../../engine/index.js";
import DECISIONS from "../../engine/decisions.js";
import CONSTANTS from "../../engine/constants.js";
import { explainFreedom } from "../../engine/bars.js";

const LAST_DECISION_MONTH = Math.max(...Object.values(DECISIONS).map((d) => d.month));
const byMonth = {};
for (const d of Object.values(DECISIONS)) (byMonth[d.month] ||= []).push(d);

// Plays every decision with pick(decision), rendering each text at the moment it shows, and
// runs on until every callback has landed
function playthrough(pick, seed = 1) {
  let state = createState(seed);
  const shown = [];
  const show = (id, field, template, values) => shown.push({ id, field, month: state.month, text: renderText(template, values), values, state });
  const deferred = [];
  const lastCallback = Math.max(...Object.values(DECISIONS).flatMap((d) => Object.values(d.options).map((o) => d.month + o.deferred_offset_months)));
  while (state.month <= lastCallback) {
    for (const raw of byMonth[state.month] || []) {
      // Only the options this state offers (rule 29)
      const ids = new Set(optionsFor(state, raw));
      const decision = { ...raw, options: Object.fromEntries(Object.entries(raw.options).filter(([id]) => ids.has(id))) };
      const id = decision.decision_id;
      show(id, "situation_text", decision.situation_text, tokenValues(state, { decisionId: id, field: "situation_text" }));
      const optionId = pick(decision, state);
      const option = decision.options[optionId];
      state = applyDecision(state, id, optionId).state;
      show(optionId, "immediate_text", option.immediate_text, tokenValues(state, { decisionId: id, optionId, field: "immediate_text" }));
      if (option.deferred_offset_months > 0) deferred.push({ id, optionId, month: decision.month + option.deferred_offset_months });
    }
    const month = state.month;
    const result = advanceMonth(state);
    state = result.state;
    for (const d of deferred.filter((x) => x.month === month)) {
      const option = DECISIONS[d.id].options[d.optionId];
      const landed = result.events.some((e) => e.type === "callback" && e.opened_by === d.optionId);
      const skipped = result.events.some((e) => e.type === "callback_skipped" && e.opened_by === d.optionId);
      assert.ok(landed !== skipped, `${d.optionId}: a callback either lands or is skipped`);
      show(d.optionId, "deferred_text", option.deferred_text, tokenValues(state, { decisionId: d.id, optionId: d.optionId, field: "deferred_text" }));
      shown.at(-1).skipped = skipped;
    }
  }
  return { state, shown };
}

// The named choices, and elsewhere the option that moves the least money
const moves = (o) => Math.abs((o.money_once || 0) + (o.money_once_2 || 0)) +
  24 * Math.abs((o.money_monthly || 0) + (o.money_monthly_2 || 0)) + (o.card_balance || 0);
const quiet = (choices) => (decision) => (decision.options[choices[decision.decision_id]] && choices[decision.decision_id]) ||
  Object.values(decision.options).sort((a, b) => moves(a) - moves(b))[0].option_id;
const find = (run, id, field) => run.shown.find((s) => s.id === id && s.field === field);

test("D16-A: the first month, then fourteen months later the balance against 70,000 put in", () => {
  const run = playthrough(quiet({ D02: "D02-B", D16: "D16-A", D20: "D20-C", D28: "D28-A" }));
  const immediate = find(run, "D16-A", "immediate_text");
  const later = find(run, "D16-A", "deferred_text");
  console.log(`\nD16-A immediate: ${immediate.text}\nD16-A deferred:  ${later.text}`);
  assert.match(immediate.text, /^First investment\. A month later it is (up \d+%|down \d+%|flat)\.$/);
  assert.match(later.text, /^Fourteen months\. [A-Z][a-z]+ of them were red\. The balance is [\d,]+ on 70,000 put in\.$/);
  assert.equal(later.values.equity_contributed, 14 * 5000);
});

test("D20's situation reads D16-A's holding, and drops the sentence for a player without one", () => {
  const investor = find(playthrough(quiet({ D16: "D16-A" })), "D20", "situation_text");
  const saver = find(playthrough(quiet({ D16: "D16-B" })), "D20", "situation_text");
  console.log(`\nD20, D16-A player: ${investor.text}\nD20, D16-B player: ${saver.text}`);
  assert.match(investor.text, /Your index investment is (up \d+%|down \d+%|flat)\.$/);
  assert.equal(saver.text, "A colleague says he made 40% last year in small companies. He shows you the screen.");
});

test("D28's monthly costs are the month 22 costs, rent included", () => {
  const run = playthrough(quiet({ D02: "D02-B" }));
  const d28 = find(run, "D28", "situation_text");
  console.log(`\nD28: ${d28.text}`);
  assert.match(d28.text, /Your monthly costs are [\d,]+\./);
  // Living costs inflated to month 22, not month 21, plus every cost commitment and debt minimum
  let index = 1;
  for (let m = 1; m < DECISIONS.D28.month; m++) index *= 1 + CONSTANTS.INFLATION_MONTHLY_RATE;
  const committed = explainFreedom(d28.state);
  assert.ok(committed.cost_commitments >= 9000, "D02-B's rent is in");
  assert.equal(d28.values.monthly_costs, CONSTANTS.LIVING_COSTS_START * index + committed.cost_commitments + committed.debt_minimums);
});

test("D20-A: the balance against money put in, not the market's fall", () => {
  const run = playthrough(quiet({ D16: "D16-A", D20: "D20-A" }));
  const later = find(run, "D20-A", "deferred_text");
  const b = find(run, "D20-B", "deferred_text");
  console.log(`\nD20-A deferred: ${later.text}  (${(later.values.equity_change_pct * 100).toFixed(1)}%)`);
  const v = later.values;
  assert.equal(v.equity_change_pct, (v.equity_balance - v.equity_contributed) / v.equity_contributed);
  assert.equal(v.equity_contributed, 8 * 5000, "D16-A's 5,000 a month, redirected for months 15 to 22");
  assert.equal(b, undefined);
});

test("reading the immediate text looks ahead without changing the game", () => {
  let state = createState(1);
  for (let m = 1; m < DECISIONS.D16.month; m++) state = advanceMonth(state).state;
  state = applyDecision(state, "D16", "D16-A").state;
  const before = structuredClone(state);
  tokenValues(state, { decisionId: "D16", optionId: "D16-A", field: "immediate_text" });
  assert.deepEqual(state, before);
  assert.throws(() => tokenValues(state, { decisionId: "D16", optionId: "D16-A", field: "deferred_text" }), /reads the end of month 24/);
});

test("300 random playthroughs: never a raw token, and a callback lands exactly when it has text", () => {
  let seed = 7;
  const rand = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const counts = { shown: 0, skipped: {} };
  for (let i = 1; i <= 300; i++) {
    const run = playthrough((d) => { const ids = Object.keys(d.options); return ids[Math.floor(rand() * ids.length)]; }, i);
    for (const s of run.shown) {
      if (s.field === "deferred_text") {
        // Rule 28: the engine skipped the callback exactly when the text has nothing left
        assert.equal(s.skipped, s.text === null, `${s.id} deferred: skipped ${s.skipped}, text ${s.text}`);
      }
      if (s.text === null) {
        counts.skipped[`${s.id} ${s.field}`] = (counts.skipped[`${s.id} ${s.field}`] || 0) + 1;
        continue;
      }
      counts.shown += 1;
      assert.ok(!/[{}]/.test(s.text), `${s.id} ${s.field}: ${s.text}`);
    }
  }
  console.log(`\n300 playthroughs: ${counts.shown} texts shown. With nothing left, so not shown: ${JSON.stringify(counts.skipped)}`);
});

test("rule 28: D04-B saving nothing skips its callback, and its Life -1 is not applied", () => {
  const month = (saveNothing) => {
    let state = createState(1);
    state.month = DECISIONS.D04.month;
    state = applyDecision(state, "D04", "D04-B").state;
    // Nothing saved since the decision: the baseline sits above anything the player could reach
    if (saveNothing) state.saved_before.D04 = 1e9;
    const callbackMonth = DECISIONS.D04.month + DECISIONS.D04.options["D04-B"].deferred_offset_months;
    let result;
    while (state.month <= callbackMonth) {
      result = advanceMonth(state);
      state = result.state;
    }
    return { state, events: result.events };
  };
  const saved = month(false);
  const nothing = month(true);
  const values = (run) => tokenValues(run.state, { decisionId: "D04", optionId: "D04-B", field: "deferred_text" });
  const template = DECISIONS.D04.options["D04-B"].deferred_text;

  assert.ok(saved.events.some((e) => e.type === "callback" && e.opened_by === "D04-B"));
  assert.ok(renderText(template, values(saved)) !== null);
  assert.equal(saved.state.flows.life_effects, DECISIONS.D04.options["D04-B"].def_life);

  assert.ok(nothing.events.some((e) => e.type === "callback_skipped" && e.opened_by === "D04-B"));
  assert.ok(!nothing.events.some((e) => e.type === "callback" && e.opened_by === "D04-B"));
  assert.equal(renderText(template, values(nothing)), null);
  assert.equal(nothing.state.flows.life_effects, 0, "no silent Life penalty");
  assert.ok(nothing.state.life_score > saved.state.life_score);
});

test("D28-B says what it actually stopped: {stopped_monthly}", () => {
  const d16 = playthrough(quiet({ D02: "D02-B", D16: "D16-A", D20: "D20-C", D27: "D27-A", D28: "D28-B" }));
  const d27 = playthrough(quiet({ D02: "D02-B", D16: "D16-C", D27: "D27-B", D28: "D28-B" }));
  const both = playthrough(quiet({ D02: "D02-B", D16: "D16-A", D20: "D20-C", D27: "D27-B", D28: "D28-B" }));
  const line = (run) => find(run, "D28-B", "immediate_text").text;
  console.log(`\nD28-B: ${line(d16)} | ${line(d27)} | ${line(both)}`);
  assert.match(line(d16), /^5,000 a month back\./);
  assert.match(line(d27), /^12,000 a month back\./);
  assert.match(line(both), /^17,000 a month back\./);
});
