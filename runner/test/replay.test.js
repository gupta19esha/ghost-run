import { test } from "node:test";
import assert from "node:assert/strict";

import { replay } from "../replay.js";
import { replay as saveReplay } from "../../vendor/dry-run-engine/game/save.js";
import { typeSave, PLAYER_TYPES, DECISION_ORDER } from "../../scripts/player-saves.mjs";

const SAVES = PLAYER_TYPES.map((type) => ({ type, save: typeSave(type) }));

test("each player type's save has one choice per Chapter 1 decision", () => {
  assert.equal(DECISION_ORDER.length, 30);
  for (const { save } of SAVES) assert.equal(save.choices.length, 30);
});

test("replay lands on the same state as game/save.js's replay", () => {
  for (const { type, save } of SAVES) {
    const ours = replay(save.seed, save.choices);
    const theirs = saveReplay(save);
    assert.ok(theirs, `${type}: game/save.js did not replay the save`);
    assert.equal(theirs.at, "home", type);
    assert.equal(JSON.stringify(ours.state), JSON.stringify(theirs.state), type);
  }
});

test("replay closes every month of the chapter and records its bars", () => {
  const { save } = SAVES[0];
  const { state, history, bars } = replay(save.seed, save.choices);
  assert.equal(state.month, 25);
  assert.deepEqual(bars.map((b) => b.month), Array.from({ length: 24 }, (_, i) => i + 1));
  assert.deepEqual(history.map((h) => h.month), bars.map((b) => b.month));
  for (const [i, b] of bars.entries()) assert.equal(b.netWorth, history[i].net_worth);
});

test("replay of a partial save stops at the first decision with no choice", () => {
  const { save } = SAVES[0];
  // D01 and D02 are month 1, D03 is month 2: three choices close month 1 and leave month 2 open
  const { state, bars } = replay(save.seed, save.choices.slice(0, 3));
  assert.equal(state.month, 2);
  assert.equal(bars.length, 1);
  assert.deepEqual(Object.keys(state.decisions_taken), ["D01", "D02", "D03"]);
});

test("replay refuses a choice the state does not offer, and choices past the chapter", () => {
  const { save } = SAVES[0];
  const wrong = [...save.choices];
  wrong[0] = "D02-A";
  assert.throws(() => replay(save.seed, wrong), /not offered at D01/);
  assert.throws(() => replay(save.seed, [...save.choices, "D01-A"]), /left over/);
});

test("replay is a pure function of seed and choices", () => {
  const { save } = SAVES[1];
  const a = replay(save.seed, save.choices);
  const b = replay(save.seed, [...save.choices]);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});
