// ENGINE.md step 7: the harness measures what section 13 says, the same way every time.

import { test } from "node:test";
import assert from "node:assert/strict";

import CONSTANTS from "../../engine/constants.js";
import DECISIONS from "../../engine/decisions.js";
import { readTargets, leagueScore, randomPlaythrough, percentile, validationOneLive, CHAPTER_END, LAST_CALLBACK_MONTH } from "../harness.js";

test("section 13 targets are read from the maths doc", () => {
  const { checkpoints, league } = readTargets();
  const nw21 = checkpoints.find((c) => c.month === 21 && c.measure === "net worth");
  assert.deepEqual([nw21.weak.below, nw21.median.value, nw21.strong.value], [50000, 250000, 600000]);
  const safety21 = checkpoints.find((c) => c.month === 21 && c.measure === "Safety");
  assert.deepEqual([safety21.weak.value, safety21.median.value, safety21.strong.value], [30, 73, 100]);
  const nw24 = checkpoints.find((c) => c.month === 24 && c.measure === "net worth");
  assert.deepEqual([nw24.weak.below, nw24.median.value, nw24.strong.value], [-65000, 170000, 540000]);
  const safety24 = checkpoints.find((c) => c.month === 24 && c.measure === "Safety");
  assert.deepEqual([safety24.weak.value, safety24.median.value, safety24.strong.value], [30, 47, 74]);
  const cr = checkpoints.find((c) => c.month === 120);
  assert.equal(cr.strong.value, 12000000);
  assert.deepEqual(league.find((l) => l.month === 24), { month: 24, ref: 50000, target: 600000 });
});

test("the league score reproduces section 11's two players", () => {
  const bench = { ref: 50000, target: 600000 };
  // A net worth whose index is exactly the given value
  const netWorthAt = (index) => bench.ref * Math.exp((index / 100) * Math.log(bench.target / bench.ref));
  const a = leagueScore({ netWorth: netWorthAt(100), safety: 45, freedom: 30, life: 25 }, bench);
  const b = leagueScore({ netWorth: netWorthAt(72), safety: 78, freedom: 65, life: 70 }, bench);
  assert.equal(a.score.toFixed(1), "57.3");
  assert.equal(b.score.toFixed(1), "71.7");
  assert.equal(leagueScore({ netWorth: -100000, safety: 0, freedom: 0, life: 0 }, bench).nwIndex, 0);
});

test("a playthrough is reproducible, and section 12 passed explicitly changes nothing", () => {
  const first = randomPlaythrough(42);
  const again = randomPlaythrough(42);
  const explicit = randomPlaythrough(42, CONSTANTS);
  assert.deepEqual(again.bars24, first.bars24);
  assert.deepEqual(explicit.bars24, first.bars24);
  assert.deepEqual(first.months.map((m) => m.chosen), again.months.map((m) => m.chosen));
  assert.equal(first.months.at(-1).month, LAST_CALLBACK_MONTH);
  assert.ok(first.months.some((m) => m.month === CHAPTER_END && m.bars));
});

test("a trial constant changes the run without touching section 12", () => {
  const trial = Object.freeze({ ...CONSTANTS, LIVING_COSTS_START: CONSTANTS.LIVING_COSTS_START - 2000 });
  const base = randomPlaythrough(7);
  const cheaper = randomPlaythrough(7, trial);
  assert.ok(cheaper.bars24.netWorth > base.bars24.netWorth);
  assert.equal(CONSTANTS.LIVING_COSTS_START, 22600);
});

test("validation 1 is not passable with Chapter 1 alone, and goes live with a Chapter 2 decision", () => {
  assert.equal(validationOneLive(), false);
  const withChapter2 = { ...DECISIONS, D31: { ...DECISIONS.D30, decision_id: "D31", chapter: 2 } };
  assert.equal(validationOneLive(withChapter2), true);
});

test("percentiles are nearest rank", () => {
  const values = Array.from({ length: 1000 }, (_, i) => i + 1);
  assert.deepEqual([10, 50, 90].map((p) => percentile(values, p)), [100, 500, 900]);
});

test("player types are deterministic, and pick by their rule", async () => {
  const { typePlaythrough, PLAYER_TYPES } = await import("../harness.js");
  assert.deepEqual(PLAYER_TYPES, ["cautious", "spender", "balanced", "maximum saving"]);
  for (const type of PLAYER_TYPES.slice(0, 3)) {
    const a = typePlaythrough(type, 7);
    const b = typePlaythrough(type, 7);
    assert.deepEqual(a.chosen, b.chosen);
    assert.deepEqual(a.barsAt[24], b.barsAt[24]);
  }
  // Spender takes the highest authored Life effect (life + def_life) at every decision
  const spender = typePlaythrough("spender", 1);
  for (const [decisionId, optionId] of Object.entries(spender.chosen)) {
    const options = Object.values(DECISIONS[decisionId].options);
    const life = (o) => (o.life || 0) + (o.def_life || 0);
    assert.equal(life(options.find((o) => o.option_id === optionId)), Math.max(...options.map(life)));
  }
  // Cautious ends month 21 with more runway than spender
  const cautious = typePlaythrough("cautious", 1);
  assert.ok(cautious.barsAt[21].safety > spender.barsAt[21].safety);
});

test("targets are judged against the player types: the median is met when Balanced and Cautious bracket it", async () => {
  const { targetVerdict, bracketVerdict } = await import("../harness.js");
  const median = { value: 250000 };
  assert.equal(bracketVerdict(median, 200000, 320000), "bracketed");
  assert.equal(bracketVerdict(median, 320000, 200000), "bracketed");
  assert.equal(bracketVerdict(median, 100000, 210000), "in range");
  assert.equal(bracketVerdict(median, 50000, 100000), "below");
  assert.equal(bracketVerdict(median, 400000, 900000), "above");
  assert.equal(targetVerdict({ below: 50000 }, -385000), "in range");
  assert.equal(targetVerdict({ value: 600000 }, 482062), "in range");
  assert.equal(targetVerdict({ value: 75 }, 100), "above");
});

test("Safety's median is Balanced's verdict alone; net worth's is bracketed (section 13)", async () => {
  const { medianVerdict } = await import("../harness.js");
  // Month 24 Safety: Balanced 38.4 against 39 is in range, not "bracketed" by Cautious's 100
  assert.equal(medianVerdict("Safety", { value: 39 }, 38.4, 100), "in range");
  // Cautious at 100 cannot rescue a Balanced that is out of range
  assert.equal(medianVerdict("Safety", { value: 65 }, 30, 100), "below");
  assert.equal(medianVerdict("Safety", { value: 45 }, 67.8, 100), "above");
  // Net worth keeps the bracket rule
  assert.equal(medianVerdict("net worth", { value: 170000 }, 161774, 316576), "bracketed");
  assert.equal(medianVerdict("net worth", { value: 250000 }, 50000, 100000), "below");
});

test("rule 29: no decision is ever left with fewer than two options", async () => {
  const { play, typePlaythrough, randomPicker, quietOption, PLAYER_TYPES, CHAPTER_END } = await import("../harness.js");
  const { createState } = await import("../../engine/index.js");
  const fewest = { count: Infinity };
  // Wraps a pick so every decision it is shown is counted first
  const counting = (label, pick) => (decision, state) => {
    const n = Object.keys(decision.options).length;
    if (n < fewest.count) Object.assign(fewest, { count: n, decision: decision.decision_id, label });
    assert.ok(n >= 2, `${label}: ${decision.decision_id} offers ${n} option(s) at month ${state.month}`);
    return pick(decision, state);
  };
  // Every housing choice with every D16 choice, the rest quiet
  for (const d02 of Object.keys(DECISIONS.D02.options)) {
    for (const d16 of Object.keys(DECISIONS.D16.options)) {
      const fixed = { D02: d02, D16: d16 };
      play(createState(1), counting(`${d02} ${d16}`, (d) => fixed[d.decision_id] || quietOption(d)), CHAPTER_END);
    }
  }
  // The four player types, and 300 random players
  for (const type of PLAYER_TYPES) {
    const chosen = typePlaythrough(type, 1).chosen;
    play(createState(1), counting(type, (d) => chosen[d.decision_id] || quietOption(d)), CHAPTER_END);
  }
  for (let seed = 1; seed <= 300; seed++) play(createState(seed), counting(`random ${seed}`, randomPicker(seed)), CHAPTER_END);
  console.log(`Fewest options offered anywhere: ${fewest.count}, at ${fewest.decision} (${fewest.label})`);
});
