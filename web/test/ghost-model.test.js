import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { readRun, forkView, costList, surpriseList, placeholderNarration, sameMoney, reasons, markedDraft, SAME_MONEY } from "../ghost-model.js";
import { forksOf } from "../../agent/rank.js";
import { fork } from "../../runner/fork.js";
import { verify } from "../../verify/verify.js";

const save = JSON.parse(readFileSync(new URL("../demo/save.json", import.meta.url), "utf8"));
const forks = forksOf(save).map(({ fork: _, ...summary }) => summary);
const views = forks.map((f) => forkView(save, f.monthIndex, f.option));

test("the run: 24 months, every choice placed in its month with what else was offered", () => {
  const run = readRun(save);
  assert.deepEqual(run.months.map((m) => m.month), Array.from({ length: 24 }, (_, i) => i + 1));
  const choices = run.months.flatMap((m) => m.choices);
  assert.deepEqual(choices.map((c) => c.chosen.option), save.choices);
  for (const c of choices) assert.ok(c.alternatives.length > 0 && c.situation);
  assert.equal(run.end.month, 24);
});

test("every attempt is verify()'s own verdict on that narration, and the last one is accepted", () => {
  for (const view of views) {
    const result = fork(save, view.monthIndex, view.ghost.option);
    for (const a of view.attempts) {
      const { ok, figures, failures } = verify(a.narration, result);
      assert.deepEqual({ ok: a.ok, figures: a.figures, failures: a.failures }, { ok, figures, failures });
    }
    assert.equal(view.accepted, view.attempts.at(-1), view.ghost.option);
    assert.ok(view.accepted.ok);
    assert.deepEqual(view.rejected, view.attempts.slice(0, -1));
    assert.ok(view.rejected.every((a) => !a.ok && a.failures.length > 0));
    assert.ok(view.rendered && !/[{}]/.test(view.rendered));
  }
});

test("the demo has forks with rejected attempts, and forks without", () => {
  assert.ok(views.some((v) => v.rejected.length > 0));
  assert.ok(views.some((v) => v.rejected.length === 0));
});

test("the D16 fork: the same money, a different life, said first", () => {
  const view = forkView(save, 15, "D16-B");
  assert.equal(view.sameMoney, "freedom");
  assert.match(view.rendered, /^The same money, a different life\. /);
  assert.match(view.rendered, /Freedom ends 15 points lower/);
  assert.deepEqual(view.notices.map((n) => n.month), [14]);
  assert.match(view.notices[0].text, /was not on the table on this path/);
  // Its rehearsal leaves the substitution out, and verify() refuses it
  assert.deepEqual(view.rejected.map((a) => a.failures.map((f) => f.rule)), [["substitution_unmentioned"]]);
});

test("same money means within a quarter unit of net worth, with a bar a unit apart", () => {
  for (const view of views) {
    const gap = Math.abs(view.result.divergence.at(-1).netWorth);
    if (view.sameMoney) assert.ok(gap <= SAME_MONEY, view.ghost.option);
    assert.equal(view.rendered.startsWith("The same money"), view.sameMoney !== null);
  }
  const rich = forkView(save, 1, "D02-C");
  assert.equal(sameMoney(rich.result), null);
  assert.doesNotMatch(placeholderNarration(rich.result), /same money/);
});

test("a typed figure is one reason, and the draft marks it whole", () => {
  const inline = views.flatMap((v) => v.rejected).find((a) => a.flaw === "inline" && /\d,\d/.test(a.narration));
  assert.ok(inline);
  const typed = reasons(inline).filter((r) => r.rule === "numeral");
  assert.equal(typed.length, 1);
  assert.ok(typed[0].count >= 2);
  const marked = markedDraft(inline.narration, inline.failures).filter((p) => p.mark).map((p) => p.text);
  assert.ok(marked.every((t) => /^\d[\d,.]*\d$|^\d$/.test(t)) && marked.some((t) => t.includes(",")));
  assert.equal(markedDraft(inline.narration, inline.failures).map((p) => p.text).join(""), inline.narration);
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
