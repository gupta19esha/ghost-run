// Rule 16 applied to rendering: one displayed value per figure, and a reader can subtract any two
// the product shows and get the gap it states.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { forksOf } from "../../agent/rank.js";
import { resolveTokens } from "../tokens.js";
import { printTokens, exactMoneyGap, ZERO_GAP } from "../render.js";
import { forkView } from "../../web/ghost-model.js";
import { formatMoney } from "../../vendor/dry-run-engine/text/render.js";

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), "utf8");
const save = JSON.parse(read("web/demo/save.json"));

// Printed rupees back to a number, "−2,52,283" and "2,52,283" alike
const rupees = (text) => Number(text.replace(/,/g, "").replace("−", "-"));
function shownGap(text) {
  if (text === ZERO_GAP) return 0;
  const [, amount, way] = text.match(/^([\d,]+) (more|less)$/);
  return (way === "more" ? 1 : -1) * rupees(amount);
}
function barShownGap(text) {
  if (text === "level") return 0;
  const [, amount, way] = text.match(/^(\d+) points? (higher|lower)$/);
  return (way === "higher" ? 1 : -1) * Number(amount);
}
function assertConsistent(values, context) {
  const p = printTokens(values);
  assert.equal(rupees(p.ghost_net_worth) - rupees(p.real_net_worth), shownGap(p.net_worth_gap), `${context}: ${p.ghost_net_worth} against ${p.real_net_worth}, ${p.net_worth_gap}`);
  for (const bar of ["safety", "freedom", "life"]) {
    assert.equal(Number(p[`ghost_${bar}`]) - Number(p[`real_${bar}`]), barShownGap(p[`${bar}_gap`]), `${context}: ${bar}`);
  }
}

test("the displayed difference equals the displayed gap on every fork of the demo", () => {
  for (const f of forksOf(save)) assertConsistent(resolveTokens(f.fork), f.option);
});

test("the displayed difference equals the displayed gap across rounding boundaries", () => {
  let n = 1;
  const next = () => (n = (n * 48271) % 2147483647) / 2147483647;
  for (let i = 0; i < 20000; i++) {
    const real = (next() - 0.1) * 10 ** (1 + Math.floor(next() * 7));
    const ghost = real + (next() - 0.5) * 10 ** Math.floor(next() * 7);
    const bar = () => next() * 100;
    assertConsistent({
      real_net_worth: real, ghost_net_worth: ghost, net_worth_gap: ghost - real,
      real_safety: bar(), ghost_safety: bar(), real_freedom: bar(), ghost_freedom: bar(), real_life: bar(), ghost_life: bar(),
      safety_gap: 0, freedom_gap: 0, life_gap: 0,
    }, `${real} ${ghost}`);
  }
});

test("every fork shows one value per figure: the narration's tokens and the compare screen agree", () => {
  for (const f of forksOf(save)) {
    const p = printTokens(resolveTokens(f.fork));
    const view = forkView(save, f.monthIndex, f.option);
    const [money, ...bars] = view.compare;
    assert.equal(formatMoney(money.real).replace("₹", ""), p.real_net_worth, f.option);
    assert.equal(formatMoney(money.ghost).replace("₹", ""), p.ghost_net_worth, f.option);
    assert.equal(money.gap, p.net_worth_gap, f.option);
    assert.equal(exactMoneyGap(0, f.shownGap), p.net_worth_gap, f.option);
    for (const bar of bars) assert.equal(bar.gap, p[`${bar.key}_gap`], `${f.option} ${bar.key}`);
  }
});

test("D16-B reads the same everywhere: 2,52,283, 2,52,556 and 273 more", () => {
  const p = printTokens(resolveTokens(forksOf(save).find((f) => f.option === "D16-B").fork));
  assert.deepEqual([p.real_net_worth, p.ghost_net_worth, p.net_worth_gap], ["2,52,283", "2,52,556", "273 more"]);
  assert.equal(forkView(save, 15, "D16-B").compare[0].gap, "273 more");
  assert.equal(exactMoneyGap(252282.57, 252556.05), "273 more");
});

test("a zero gap reads as a phrase a sentence can end on", () => {
  assert.equal(ZERO_GAP, "the same as you");
  assert.equal(exactMoneyGap(252282.57, 252282.57), "the same as you");
  const zero = forksOf(save).find((f) => f.option === "D05-C");
  assert.equal(printTokens(resolveTokens(zero.fork)).net_worth_gap, "the same as you");
});

test("no screen of the ghost flow rounds money by another rule", () => {
  for (const page of ["web/ghost.js", "web/ghost-model.js", "web/landing.js", "web/ui.js", "verify/render.js"]) {
    assert.doesNotMatch(read(page), /formatRupees/, page);
  }
});
