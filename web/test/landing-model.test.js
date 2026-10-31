import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { monthPreview, monthOutcome, landingFork, chapters, CHAPTER_DAYS, SHOWN_DECISION, SHOWN_FORK } from "../landing-model.js";
import { readRun } from "../ghost-model.js";
import { getDecision } from "../../vendor/dry-run-engine/engine/index.js";
import { formatRupees } from "../../vendor/dry-run-engine/text/render.js";

const save = JSON.parse(readFileSync(new URL("../demo/save.json", import.meta.url), "utf8"));

test("the month shown is the demo life's own, worded as the game words it", () => {
  const preview = monthPreview(save);
  const decision = getDecision(SHOWN_DECISION);
  assert.equal(preview.month, decision.month);
  assert.equal(save.choices[preview.index], preview.demoChoice);
  assert.deepEqual(preview.options.map((o) => o.label), Object.values(decision.options).map((o) => o.option_label));
  for (const option of preview.options) assert.ok(option.line && !option.line.includes("{"), `${option.id} has a rendered result line`);
  // The same situation the ghost screen reads for that choice
  const choice = readRun(save).months.flatMap((m) => m.choices).find((c) => c.decisionId === SHOWN_DECISION);
  assert.equal(preview.situation, choice.situation);
});

test("each option's month close comes from the engine, and the demo's own option is the demo's month", () => {
  const preview = monthPreview(save);
  const run = readRun(save);
  const real = run.bars.find((b) => b.month === preview.month);
  const outcomes = preview.options.map((o) => monthOutcome(save, preview.index, o.id));
  for (const o of outcomes) assert.deepEqual(o.before, run.bars.find((b) => b.month === preview.month - 1));
  assert.deepEqual(outcomes.find((_, i) => preview.options[i].id === preview.demoChoice).after, real);
  // Every option leaves the month differently
  assert.equal(new Set(outcomes.map((o) => o.after.netWorth)).size, outcomes.length);
});

test("the landing's ghost forks at its decision and parts from the real run there", () => {
  const view = landingFork(save);
  assert.equal(view.month, getDecision(SHOWN_FORK.decisionId).month);
  assert.equal(view.ghost.option, SHOWN_FORK.option);
  assert.notEqual(view.real.option, view.ghost.option);
  const before = (bars) => bars.filter((b) => b.month < view.month);
  assert.deepEqual(before(view.result.ghost.bars), before(view.result.real.bars));
  assert.ok(view.situation && !view.situation.includes("{"));
  // What the page says of it: poorer and less free, with more Life
  const [netWorth, , freedom, life] = view.compare;
  assert.ok(netWorth.ghost < netWorth.real && freedom.ghost < freedom.real && life.ghost > life.real);
});

test("the month close says when Safety is in danger, as the game's does", () => {
  const preview = monthPreview(save);
  for (const option of preview.options) assert.equal(typeof monthOutcome(save, preview.index, option.id).danger, "boolean");
});

// The page's first screen is written into web/index.html, so it reads before any script runs.
// It must say exactly what the engine says
test("the landing's written month and chapters are the engine's and the plan's, word for word", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const preview = monthPreview(save);
  const has = (text) => assert.ok(html.includes(text), `index.html has: ${text}`);
  has(`Month ${preview.month}. You are ${preview.age}.`);
  has(preview.salary);
  has(preview.situation);
  for (const option of preview.options) has(`data-option="${option.id}">${option.label}</button>`);
  // The chapters, as the plan has them, chapter one live and the rest coming
  for (const c of chapters()) {
    has(`<p class="lp-chapter-num">Chapter ${c.number}</p>`);
    has(`<p class="lp-chapter-ages">${c.fromAge} to ${c.toAge}</p>`);
    has(`<p class="lp-chapter-days">${c.days} days</p>`);
    has(`<p class="lp-chapter-name">${c.title}</p>`);
  }
  // Chapter one open, two to six locked
  assert.equal((html.match(/class="lp-chapter-state">Locked</g) || []).length, chapters().filter((c) => !c.live).length);
});

// The line that gives a reader outside India the scale. Its figures are the engine's: the month's
// salary, the studio's rent in month 1, the class's cost, and the class as a share of the salary
test("the scale line's figures are the engine's", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const line = html.match(/<p class="lp-body lp-scale">(.*?)<\/p>/)?.[1];
  assert.ok(line, "index.html has the scale line");
  const preview = monthPreview(save);
  const studio = -getDecision("D02").options["D02-A"].money_monthly;
  const coaching = -getDecision("D12").options["D12-A"].money_once;
  const salary = Number(preview.salary.replace(/[^0-9]/g, ""));
  assert.ok(line.startsWith(`${preview.salary} is`), line);
  assert.ok(line.includes(`a studio near the office at ${formatRupees(studio)}`), line);
  assert.ok(line.includes(`costs ${formatRupees(coaching)}, nearly a fifth of it`), line);
  // Nearly a fifth: under 20%, and closer to it than to anything else a reader would say
  assert.ok(coaching / salary < 0.2 && coaching / salary > 0.18, `${coaching} of ${salary}`);
  assert.ok(!/\$|USD|dollar|€|£/.test(line), "no currency is converted");
});

test("the chapters run 22 to 42, 240 months, and chapter one is the game's own", () => {
  const all = chapters();
  assert.equal(all.length, 6);
  assert.equal(CHAPTER_DAYS.reduce((a, b) => a + b, 0), 240);
  assert.equal(all[0].fromAge, 22);
  assert.equal(all.at(-1).toAge, 42);
  for (let i = 1; i < all.length; i++) assert.equal(all[i].fromAge, all[i - 1].toAge);
  assert.equal(all[0].days, readRun(save).months.length);
  // Titles, ages and lengths as the product spec's structure table has them (HANDOFF.md section 4)
  const spec = readFileSync(new URL("../../vendor/dry-run-engine/HANDOFF.md", import.meta.url), "utf8");
  const rows = [...spec.matchAll(/^\| (\d)\. ([^|]+?) \| (\d+) to (\d+) \| (\d+) \|/gm)];
  assert.equal(rows.length, 6);
  for (const [, number, title, from, to, days] of rows) {
    const c = all[Number(number) - 1];
    assert.deepEqual([c.title, c.fromAge, c.toAge, c.days], [title, Number(from), Number(to), Number(days)], `chapter ${number}`);
  }
  assert.equal(all[0].title.toLowerCase(), getDecision("D01").chapter_title.toLowerCase(), "the sheet's name for chapter one, in the spec's capitals");
  assert.deepEqual(all.filter((c) => c.live).map((c) => c.number), [1]);
});
