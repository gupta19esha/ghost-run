import { test } from "node:test";
import assert from "node:assert/strict";

import { fork, alternativesAt, STRATEGIES, SUBSTITUTION } from "../fork.js";
import { replay } from "../replay.js";
import { typeSave, randomSave, PLAYER_TYPES } from "../../scripts/player-saves.mjs";

const SAVES = [
  ...PLAYER_TYPES.map((type) => ({ name: type, save: typeSave(type) })),
  ...[1, 2, 3, 4, 5].map((seed) => ({ name: `random seed ${seed}`, save: randomSave(seed) })),
];
const RULES = Object.keys(STRATEGIES);
const timeline = ({ state, history, bars, choices }) => JSON.stringify({ state, history, bars, choices });

// If this fails, something in a run is not a function of seed and choices, and no comparison
// between a real run and a ghost means anything
test("a fork that takes the option the player chose is the real run, byte for byte", () => {
  for (const { name, save } of SAVES) {
    for (let index = 0; index < save.choices.length; index++) {
      for (const substitution of RULES) {
        const { real, ghost, divergence, substitutions } = fork(save, index, save.choices[index], { substitution });
        const where = `${name}, choice ${index} (${save.choices[index]}), ${substitution}`;
        assert.equal(timeline(ghost), timeline(real), where);
        assert.deepStrictEqual(ghost.state, real.state, where);
        assert.deepEqual(ghost.substitutions, [], where);
        assert.deepEqual(substitutions, [], where);
        assert.equal(ghost.stoppedAt, null, where);
        assert.equal(divergence.length, 24, where);
        for (const row of divergence) {
          for (const k of ["netWorth", "safety", "freedom", "life"]) assert.ok(Object.is(row[k], 0), `${where}, month ${row.month} ${k}`);
        }
      }
    }
  }
});

test("the real side of a fork is replay of the untouched choices", () => {
  for (const { name, save } of SAVES) {
    const { real } = fork(save, 0, save.choices[0], { substitution: RULES[0] });
    const replayed = replay(save.seed, save.choices);
    assert.equal(JSON.stringify({ state: real.state, history: real.history, bars: real.bars }), JSON.stringify(replayed), name);
  }
});

test("a ghost replays from its own choices to the same run", () => {
  const { save } = SAVES[0];
  for (let index = 0; index < save.choices.length; index++) {
    for (const option of alternativesAt(save, index)) {
      const { ghost } = fork(save, index, option, { substitution: "keep-real-or-first" });
      const replayed = replay(save.seed, ghost.choices);
      assert.equal(JSON.stringify(replayed), JSON.stringify({ state: ghost.state, history: ghost.history, bars: ghost.bars }), option);
    }
  }
});

test("a different option diverges from the fork's month and not before", () => {
  const save = typeSave("cautious");
  const index = save.choices.indexOf("D16-C");
  const { ghost, divergence } = fork(save, index, "D16-A", { substitution: "keep-real-or-first" });
  assert.equal(ghost.choices[index], "D16-A");
  assert.deepEqual(ghost.choices.filter((c, i) => i !== index), save.choices.filter((c, i) => i !== index));
  for (const row of divergence.filter((r) => r.month < 10)) assert.equal(row.netWorth, 0);
  assert.ok(divergence.some((r) => r.netWorth !== 0));
});

test("a real choice the ghost does not offer goes to the rule, and is recorded", () => {
  // D16-A then D20-A: forked to D16-C, the ghost has no index investment to move (rule 29)
  const save = typeSave("cautious");
  const choices = save.choices.map((c) => (c === "D16-C" ? "D16-A" : c === "D20-C" ? "D20-A" : c));
  const withIndex = { ...save, choices };
  const d16 = choices.indexOf("D16-A");
  const d20 = choices.indexOf("D20-A");
  for (const substitution of RULES) {
    const { ghost, divergence, substitutions } = fork(withIndex, d16, "D16-C", { substitution });
    const [sub] = ghost.substitutions;
    assert.deepEqual(substitutions, [{ monthIndex: d20, decisionId: "D20", withdrawn: "D20-A", chosen: sub.chosen }], substitution);
    assert.equal(sub.decision_id, "D20", substitution);
    assert.equal(sub.real, "D20-A");
    assert.ok(!sub.offered.includes("D20-A"));
    if (substitution === "keep-real-or-stop") {
      assert.equal(sub.chosen, null);
      assert.equal(ghost.stoppedAt, d20);
      assert.equal(ghost.choices.length, d20);
      assert.equal(divergence.at(-1).month, 13);
    } else {
      assert.ok(sub.offered.includes(sub.chosen));
      assert.equal(ghost.choices[d20], sub.chosen);
      assert.equal(ghost.choices.length, 30);
    }
  }
});

test("fork refuses an alternative that is not offered at the fork, or a fork point not in the save", () => {
  const save = typeSave("cautious");
  const rule = { substitution: "keep-real-or-first" };
  assert.throws(() => fork(save, 0, "D02-A", rule), /not offered at D01/);
  // Cautious has no index investment at D20, so D20-A is withdrawn there (rule 29)
  assert.throws(() => fork(save, save.choices.indexOf("D20-C"), "D20-A", rule), /not offered at D20/);
  assert.throws(() => fork(save, 30, "D30-A", rule), /No choice at index 30/);
  assert.throws(() => fork(save, 0, save.choices[0], { substitution: "keep-real" }), /Unknown substitution rule/);
});

// Lock on the ruled fallback. keep-real-or-first takes the first offered option in sheet order, so
// a reordered sheet would silently change every ghost below. If this fails after a sheet change,
// the mapping moved: rule again on what the ghost should take, then update the expectations.
test("the ruled fallback maps each withdrawable D20 and D28 choice as ruled", () => {
  assert.equal(SUBSTITUTION, "keep-real-or-first");
  // Each case: a path to the withdrawn choice from Cautious's save, the fork that withdraws it,
  // what the ghost then offers and what the fallback takes
  const cases = [
    { path: { "D16-C": "D16-A", "D20-C": "D20-A" }, fork: "D16-C", withdrawn: "D20-A", offered: ["D20-C", "D20-D"], chosen: "D20-C" },
    { path: { "D16-C": "D16-A", "D20-C": "D20-B" }, fork: "D16-C", withdrawn: "D20-B", offered: ["D20-C", "D20-D"], chosen: "D20-C" },
    { path: { "D20-C": "D20-D" }, fork: "D16-A", withdrawn: "D20-D", offered: ["D20-A", "D20-B", "D20-C"], chosen: "D20-A" },
    { path: { "D28-A": "D28-B" }, fork: "D27-A", withdrawn: "D28-B", offered: ["D28-A", "D28-C", "D28-D"], chosen: "D28-A" },
  ];
  const cautious = typeSave("cautious");
  for (const c of cases) {
    const choices = cautious.choices.map((id) => c.path[id] ?? id);
    const save = { ...cautious, choices };
    const [decisionId] = c.fork.split("-");
    const index = choices.findIndex((id) => id.startsWith(`${decisionId}-`));
    const { ghost, substitutions } = fork(save, index, c.fork);
    const at = choices.indexOf(c.withdrawn);
    assert.deepEqual(substitutions, [{ monthIndex: at, decisionId: c.withdrawn.split("-")[0], withdrawn: c.withdrawn, chosen: c.chosen }], c.withdrawn);
    assert.deepEqual(ghost.substitutions[0].offered, c.offered, c.withdrawn);
    assert.equal(ghost.choices[at], c.chosen, c.withdrawn);
  }
});
