import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readRun, forkView, checkAttempts, costList, surpriseList, reasons, markedDraft, ghostRoad } from "../ghost-model.js";
import { narrateFork } from "../../agent/narration-loop.js";
import { forksOf } from "../../agent/rank.js";
import { fork } from "../../runner/fork.js";

const save = JSON.parse(readFileSync(new URL("../demo/save.json", import.meta.url), "utf8"));
const forks = forksOf(save).map(({ fork: _, ...summary }) => summary);
const served = async (result, env = {}) => (await narrateFork(result, { provider: "stub", env })).attempts
  .map(({ number, narration, ok }) => ({ number, narration, ok }));

test("the run: 24 months, every choice placed in its month with what else was offered", () => {
  const run = readRun(save);
  assert.deepEqual(run.months.map((m) => m.month), Array.from({ length: 24 }, (_, i) => i + 1));
  const choices = run.months.flatMap((m) => m.choices);
  assert.deepEqual(choices.map((c) => c.chosen.option), save.choices);
  for (const c of choices) assert.ok(c.alternatives.length > 0 && c.situation);
  assert.equal(run.end.month, 24);
});

test("the browser's check of served attempts agrees with the server's, and renders the accepted one", async () => {
  const result = fork(save, 15, "D16-B");
  const checked = checkAttempts(result, await served(result, { NARRATE_STUB_MISTAKES: "1" }));
  assert.ok(checked.agrees);
  assert.deepEqual(checked.attempts.map((a) => a.ok), [false, true]);
  assert.equal(checked.accepted.number, 2);
  assert.match(checked.rendered, /^The same money, a different life\. /);
  assert.ok(!/[{}]/.test(checked.rendered));
});

test("a typed figure is one reason, and the draft marks it whole", async () => {
  const result = fork(save, 15, "D16-C");
  const [rejected] = checkAttempts(result, await served(result, { NARRATE_STUB_MISTAKES: "1" })).rejected;
  const typed = reasons(rejected).filter((r) => r.rule === "numeral");
  assert.equal(typed.length, 1);
  assert.ok(typed[0].count >= 2, "2,359 is two digit runs to verify()");
  const parts = markedDraft(rejected.narration, rejected.failures);
  assert.deepEqual(parts.filter((p) => p.mark).map((p) => p.text), ["2,359"]);
  assert.equal(parts.map((p) => p.text).join(""), rejected.narration);
});

test("a narration that skips the same-money lead is rejected for it", () => {
  const result = fork(save, 15, "D16-B");
  const checked = checkAttempts(result, [{ number: 1, ok: false,
    narration: "In month {fork_month} the ghost took {ghost_choice}. In month {substitution_month}, {withdrawn_choice} was not available on this path, so the ghost took {substitute_choice}." }]);
  assert.deepEqual(checked.rejected[0].failures.map((f) => f.rule), ["lead"]);
  assert.equal(checked.rendered, null);
  assert.ok(checked.agrees);
});

test("the D16 fork: same money, the substitution noticed on the chart", () => {
  const view = forkView(save, 15, "D16-B");
  assert.equal(view.sameMoney, "freedom");
  assert.deepEqual(view.notices.map((n) => n.month), [14]);
  assert.match(view.notices[0].text, /was not on the table on this path/);
  assert.equal(forkView(save, 1, "D02-C").sameMoney, null);
});

test("the lists: one alternative per choice, cost by money gained, surprise by its score", () => {
  const cost = costList(forks);
  const surprise = surpriseList(forks);
  for (const list of [cost, surprise]) {
    assert.equal(new Set(list.map((f) => f.monthIndex)).size, list.length);
    assert.ok(list.length > 0 && list.length <= 5);
  }
  assert.ok(cost.every((f, i) => f.features.end.netWorth > 0 && (i === 0 || cost[i - 1].score >= f.score)));
  assert.equal(cost[0].option, "D02-C");
  assert.ok(surprise.every((f, i) => i === 0 || surprise[i - 1].score >= f.score));
});

test("the ghost's road leaves yours at the fork, and ends on the side the money did", () => {
  const months = Array.from({ length: 24 }, (_, i) => i + 1);
  for (const f of forksOf(save)) {
    const view = forkView(save, f.monthIndex, f.option);
    const { points, split } = view.road;
    assert.equal(points[0].offset, 0, f.option);
    assert.equal(points.at(-1).month, 24, f.option);
    assert.ok(points.length >= 2, f.option);
    assert.ok(points[0].month === split || split === 24, f.option);
    const gap = view.compare[0].ghost - view.compare[0].real;
    assert.ok(Math.abs(points.at(-1).offset) >= 0.45, `${f.option} ends alongside`);
    if (gap !== 0) assert.equal(Math.sign(points.at(-1).offset), Math.sign(gap), f.option);
  }
  // Further apart in money, further apart on the ground
  assert.ok(Math.abs(ghostRoad(months, 5, 200000).at(-1).offset) > Math.abs(ghostRoad(months, 5, 2000).at(-1).offset));
});

test("the split's road marks the substitution and the layoff where they fall", () => {
  const { road } = forkView(save, 15, "D16-B");
  assert.deepEqual(road.marks, [14]);
  assert.equal(road.layoff.month, 22);
  assert.ok(road.layoff.label);
});
