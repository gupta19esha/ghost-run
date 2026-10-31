// The save across the change of 31 October 2026 (the first sitting, play the next month now, the
// days a chapter took): a save written before it must still read and replay, unchanged, and a
// save that does not read must be kept, not deleted. web/demo/save.json is a finished chapter
// in the format every save had before; scripts/player-saves.mjs writes the same.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// A localStorage for Node, emptied before each test
const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { SAVE_KEY, FIRST_SITTING_MONTHS } = await import("../config.js");
const {
  newSave, readSave, writeSave, replay, upgrade, waitsForTomorrow, recordClose, chapterDays, today,
  setAsideSave, SET_ASIDE_KEY,
} = await import("../save.js");

const { chapterComplete } = await import("../../engine/index.js");
const demo = readFileSync(new URL("../../../../web/demo/save.json", import.meta.url), "utf8");
const day = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
};

test("a save from before the change reads, keeps every field it had, and replays to the same place", () => {
  store.clear();
  store.set(SAVE_KEY, demo);
  const before = JSON.parse(demo);
  assert.equal(before.startedOn, undefined, "the demo save is in the old format");
  const save = readSave();
  assert.ok(save, "the old save is read, not dropped");
  for (const [key, value] of Object.entries(before)) assert.deepEqual(save[key], value, key);
  assert.equal(save.startedOn, null);
  assert.deepEqual(save.chapterClosedOn, {});
  const where = replay(save);
  assert.ok(where, "it replays");
  assert.equal(where.at, "home");
  assert.ok(chapterComplete(where.state), "the whole chapter, as before");
  // Its days are unknown, and say so by being null, not a guess
  assert.equal(chapterDays(save, 1), null);
  assert.equal(store.get(SET_ASIDE_KEY), undefined, "nothing was set aside");
});

test("an old save partway through the chapter carries on, and keeps its choices when written back", () => {
  store.clear();
  const old = { version: 1, seed: 1, choices: ["D01-A", "D02-B"], closed: 1, closedOn: day(-1), streak: 1, explained: ["safety"] };
  store.set(SAVE_KEY, JSON.stringify(old));
  const save = readSave();
  const where = replay(save);
  assert.ok(where);
  assert.equal(save.closed, 1);
  writeSave(save);
  const again = JSON.parse(store.get(SAVE_KEY));
  assert.deepEqual(again.choices, old.choices);
  assert.equal(again.version, 1);
  assert.equal(again.closedOn, old.closedOn);
});

test("a save that does not read is set aside, not deleted", () => {
  for (const raw of ["{not json", JSON.stringify({ version: 2, seed: 1, choices: [] }), JSON.stringify({ version: 1, choices: [] })]) {
    store.clear();
    store.set(SAVE_KEY, raw);
    assert.equal(readSave(), null);
    assert.equal(store.get(SET_ASIDE_KEY), raw);
  }
  // One that reads but no longer replays, which resume() hands to setAsideSave
  store.clear();
  const stale = JSON.stringify({ version: 1, seed: 1, choices: ["D99-Z"], closed: 0 });
  store.set(SAVE_KEY, stale);
  assert.equal(replay(readSave()), null);
  setAsideSave();
  assert.equal(store.get(SAVE_KEY), undefined);
  assert.equal(store.get(SET_ASIDE_KEY), stale);
});

test("upgrade adds only what is missing", () => {
  const full = { ...newSave({ seed: 3 }), startedOn: "2026-10-01", chapterClosedOn: { 1: "2026-10-05" } };
  assert.deepEqual(upgrade(full), full);
});

test("a new save records the day it began", () => {
  assert.equal(newSave({ seed: 1 }).startedOn, today());
});

test("the first sitting plays straight on; after it, a month closed today waits for tomorrow", () => {
  assert.equal(FIRST_SITTING_MONTHS, 3);
  const save = newSave({ seed: 1 });
  for (let month = 1; month < FIRST_SITTING_MONTHS; month++) {
    recordClose(save, month);
    assert.equal(waitsForTomorrow(save), false, `after month ${month}`);
  }
  recordClose(save, FIRST_SITTING_MONTHS);
  assert.equal(waitsForTomorrow(save), true);
  // A month closed on an earlier day does not wait
  assert.equal(waitsForTomorrow({ ...save, closedOn: day(-1) }), false);
});

test("playing the next month now costs the streak nothing", () => {
  const save = { ...newSave({ seed: 1 }), closed: 5, closedOn: day(-1), streak: 4 };
  recordClose(save, 6);
  assert.equal(save.streak, 5);
  recordClose(save, 7);
  recordClose(save, 8);
  assert.equal(save.streak, 5, "more months the same day leave it where it was");
});

test("the days a chapter took count both ends", () => {
  const save = { ...newSave({ seed: 1 }), startedOn: "2026-10-01" };
  recordClose(save, 24, 1);
  assert.equal(save.chapterClosedOn[1], today());
  assert.equal(chapterDays({ ...save, chapterClosedOn: { 1: "2026-10-01" } }, 1), 1);
  assert.equal(chapterDays({ ...save, chapterClosedOn: { 1: "2026-10-09" } }, 1), 9);
  // Across a month's end and a clock change
  assert.equal(chapterDays({ ...save, startedOn: "2026-03-20", chapterClosedOn: { 1: "2026-04-12" } }, 1), 24);
  assert.equal(chapterDays({ ...save, chapterClosedOn: {} }, 1), null);
  // A later chapter counts from the day the one before closed
  assert.equal(chapterDays({ ...save, chapterClosedOn: { 1: "2026-10-09", 2: "2026-10-20" } }, 2), 12);
});
