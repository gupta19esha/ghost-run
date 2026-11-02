// The road the timeline draws (game/timeline.js roadStops): a stop for every month, and nothing
// told before it comes.

import { test } from "node:test";
import assert from "node:assert/strict";

import { roadStops } from "../timeline.js";
import { ideasSoFar } from "../ideas.js";

const month = (n, extra = {}) => ({ month: n, age: 22, chapter: 1, chapterTitle: "t", decisionId: `D${n}`, shock: null, choices: [], change: 100, ...extra });
const played = (through) => Array.from({ length: through }, (_, i) => month(i + 1, i + 1 === 22 ? { shock: "layoff", decisionId: "D28" } : {}));
const road = (through, closed, reached) => roadStops(played(through), { chapter: 1, cards: ideasSoFar(closed, 1).cards, reached });

test("the chapter has 24 stops, in order, with one figure", () => {
  const stops = road(5, 4, 5);
  assert.deepEqual(stops.map((s) => s.month), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.deepEqual(stops.filter((s) => s.here).map((s) => s.month), [5]);
});

test("a month not begun has the figure, dark", () => {
  const here = road(5, 5, 6).find((s) => s.here);
  assert.equal(here.month, 6);
  assert.equal(here.played, false);
});

test("after the chapter the figure stands at its last month", () => {
  assert.deepEqual(road(24, 24, 25).filter((s) => s.here).map((s) => s.month), [24]);
});

test("nothing ahead is told: no layoff before it happens, no locked idea, no words", () => {
  const stops = road(12, 11, 12);
  assert.equal(stops.some((s) => s.event), false);
  for (const stop of stops.filter((s) => !s.played)) {
    assert.deepEqual(Object.keys(stop).sort(), ["event", "here", "idea", "month", "played"]);
    assert.equal(stop.idea, null);
  }
});

test("the layoff is the event at month 22 once it has happened", () => {
  assert.deepEqual(road(24, 24, 25).filter((s) => s.event).map((s) => s.month), [22]);
});

test("a played stop carries its summary, and an idea only once its month has closed", () => {
  const open = road(5, 4, 5);
  assert.ok(open[0].summary);
  assert.equal(open[3].idea.month, 4);
  assert.equal(open[4].idea, null, "month 5 is played but has not closed");
  // Twenty ideas over the whole chapter, each beside the month that taught it
  const done = road(24, 24, 25).filter((s) => s.idea);
  assert.equal(done.length, 20);
  for (const stop of done) assert.equal(stop.idea.month, stop.month);
});
