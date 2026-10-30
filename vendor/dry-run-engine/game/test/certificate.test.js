// The chapter card's figures are the engine's: game/certificate.js on the demo life, a finished
// chapter one (web/demo/save.json), checked against the engine and text/ directly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { replay } from "../save.js";
import { chapterCard } from "../certificate.js";
import { createState, getBars, chapterMonths, safetyInDanger } from "../../engine/index.js";
import { formatMoney } from "../../text/render.js";
import { barLabels } from "../labels.js";

const save = JSON.parse(readFileSync(new URL("../../../../web/demo/save.json", import.meta.url), "utf8"));
const { state } = replay(save);
const card = chapterCard(state, save);

test("net worth and its move over the chapter are the engine's, worded by text/", () => {
  const bars = getBars(state);
  const start = getBars(createState(save.seed)).netWorth;
  assert.equal(card.netWorth.value, bars.netWorth);
  assert.equal(card.netWorth.text, formatMoney(bars.netWorth));
  assert.equal(card.change.value, bars.netWorth - start);
  assert.equal(card.change.text, formatMoney(Math.abs(bars.netWorth - start)));
});

test("the bars are the engine's, with the lines Home and the report show", () => {
  const bars = getBars(state);
  const labels = barLabels(state);
  assert.deepEqual(card.bars.map((b) => b.key), ["safety", "freedom", "life"]);
  for (const bar of card.bars) {
    assert.equal(bar.value, bars[bar.key]);
    assert.equal(bar.label, labels[bar.key]);
  }
  assert.equal(card.bars[0].danger, safetyInDanger(state));
});

test("the shape is net worth from the run's start to the end of every month of the chapter", () => {
  const months = chapterMonths(state);
  assert.equal(card.shape.length, 25);
  assert.equal(card.shape[0].net_worth, getBars(createState(save.seed)).netWorth);
  assert.deepEqual(card.shape.slice(1), months.map(({ month, net_worth }) => ({ month, net_worth })));
  assert.equal(card.shape.at(-1).net_worth, card.netWorth.value);
});

test("the run's line names its choices and the months the report names", () => {
  const months = chapterMonths(state);
  const best = months.reduce((a, b) => (b.change > a.change ? b : a));
  const worst = months.reduce((a, b) => (b.change < a.change ? b : a));
  assert.ok(card.line.startsWith(`${save.choices.length} choices, 24 months.`), card.line);
  assert.ok(card.line.includes(`Best month ${best.month}, up ${formatMoney(best.change)}.`), card.line);
  assert.ok(card.line.includes(`Hardest month ${worst.month}, down ${formatMoney(-worst.change)}.`), card.line);
  assert.deepEqual([card.chapter.number, card.ages.from, card.ages.to, card.years], ["one", 22, 24, "two"]);
});
