// The ideas as a collection (UI.md rule 10): a card is collected once its month has closed,
// whatever was chosen in it, and the count is the product owner's words.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ideasSoFar, ideasCount } from "../ideas.js";
import { chapterConcepts } from "../../engine/index.js";

test("before any month closes, all twenty are there and none is collected", () => {
  const ideas = ideasSoFar(0);
  assert.equal(ideas.total, 20);
  assert.equal(ideas.collected, 0);
  assert.equal(ideas.count, "0 of 20 ideas");
  assert.deepEqual(ideas.cards.map((c) => c.title), chapterConcepts(1).map((c) => c.title));
});

test("a card is collected once its month has closed, and a month without one adds none", () => {
  assert.equal(ideasSoFar(1).count, "1 of 20 ideas");
  assert.equal(ideasSoFar(6).collected, 6);
  assert.equal(ideasSoFar(7).collected, 6, "month 7 carries none");
  assert.equal(ideasSoFar(8).collected, 7);
  const twelve = ideasSoFar(14);
  assert.equal(twelve.count, "12 of 20 ideas");
  assert.ok(twelve.cards.every((c) => c.collected === c.month <= 14));
  assert.equal(ideasSoFar(24).count, "20 of 20 ideas");
});

test("the count reads as the product owner wrote it", () => {
  assert.equal(ideasCount(12, 20), "12 of 20 ideas");
});
