// The long versions of the concept cards (game/concepts-long.js) and how ideas are collected now:
// by a tick at month close (ruled 3 November 2026). The figures in the long versions are held
// to the engine by scripts/check_stated_terms.py; this checks their shape, their voice and the
// one figure that is the player's own.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import LONG from "../concepts-long.js";
import { ideasSoFar, longIdea } from "../ideas.js";
import { upgrade, newSave, recordTicked, jumpSave } from "../save.js";
import { chapterConcepts, explainBars } from "../../engine/index.js";
import { formatMonths } from "../../text/render.js";
import { replay } from "../save.js";

const demo = JSON.parse(readFileSync(new URL("../../../../web/demo/save.json", import.meta.url), "utf8"));

test("every card has a long version, under the same title, and nothing else does", () => {
  const cards = chapterConcepts(1);
  assert.deepEqual(Object.keys(LONG).map(Number).sort((a, b) => a - b), cards.map((c) => c.month));
  for (const card of cards) assert.equal(LONG[String(card.month)].title, card.title, `month ${card.month}`);
});

test("each is three or four short paragraphs; Runway, the product owner's own, five", () => {
  for (const [month, { paragraphs }] of Object.entries(LONG)) {
    const most = month === "22" ? 5 : 4;
    assert.ok(paragraphs.length >= 3 && paragraphs.length <= most, `month ${month}: ${paragraphs.length} paragraphs`);
    for (const p of paragraphs) assert.ok(p.split(/\s+/).length <= 90, `month ${month}: a paragraph of ${p.split(/\s+/).length} words`);
  }
});

test("they explain the board, never the moves: no advice, no best option, no cheering", () => {
  const advice = /\b(you should|should you|we recommend|the best (option|choice|move)|the right (option|choice|answer)|great job|well done|smart move)\b/i;
  for (const [month, { paragraphs }] of Object.entries(LONG)) {
    for (const p of paragraphs) assert.doesNotMatch(p, advice, `month ${month}: ${p}`);
  }
});

test("the only token is {runway}, and Runway's is filled with the player's own, as Home words it", () => {
  for (const [month, { paragraphs }] of Object.entries(LONG)) {
    for (const p of paragraphs) for (const [token] of p.matchAll(/\{\w+\}/g)) assert.equal(token, "{runway}", `month ${month}`);
  }
  const save = upgrade({ ...demo, closed: 24 });
  let morning = null;
  replay(save, { onMonthStart: (state) => { if (state.month === 22) morning = formatMonths(explainBars(state).safety.runway_months); } });
  assert.ok(morning, "the demo life reaches month 22");
  const runway = longIdea(22, save);
  assert.equal(runway.title, "Runway");
  const text = runway.paragraphs.join(" ");
  assert.doesNotMatch(text, /\{/);
  assert.ok(text.includes(`If it was ${morning}, you had ${morning} to find the next job`), text);
  // A card with no figure of the player's own reads the same for anyone
  assert.deepEqual(longIdea(4, save).paragraphs, LONG["4"].paragraphs);
  assert.equal(longIdea(7, save), null, "month 7 carries no card");
});

test("a card is collected by its tick, not by its month closing", () => {
  const fresh = ideasSoFar(5, 1, []);
  assert.equal(fresh.count, "0 of 20 ideas");
  assert.deepEqual(fresh.cards.filter((c) => c.waiting).map((c) => c.month), [1, 2, 3, 4, 5]);
  const some = ideasSoFar(5, 1, [1, 3]);
  assert.equal(some.count, "2 of 20 ideas");
  assert.deepEqual(some.cards.filter((c) => c.collected).map((c) => c.month), [1, 3]);
  assert.deepEqual(some.cards.filter((c) => c.waiting).map((c) => c.month), [2, 4, 5]);
  // A tick for a month not yet closed collects nothing
  assert.equal(ideasSoFar(2, 1, [1, 2, 3]).collected, 2);
});

test("a new run has ticked nothing; ticks are kept once each and in order", () => {
  const save = newSave({ seed: 1 });
  assert.deepEqual(save.ticked, []);
  recordTicked(save, 4);
  recordTicked(save, 1);
  recordTicked(save, 4);
  assert.deepEqual(save.ticked, [1, 4]);
});

test("a save from before ticks keeps every idea its closed months gave it; a tester's jump has them too", () => {
  const old = { ...demo, closed: 10 };
  delete old.ticked;
  const upgraded = upgrade(old);
  assert.equal(ideasSoFar(upgraded.closed, 1, upgraded.ticked).count, ideasSoFar(10).count);
  assert.deepEqual(upgrade({ ...demo, closed: 10, ticked: [1] }).ticked, [1], "a save with ticks keeps its own");
  const jumped = jumpSave(1, 9);
  assert.equal(ideasSoFar(jumped.closed, 1, jumped.ticked).count, ideasSoFar(8).count);
});
