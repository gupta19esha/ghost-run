import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { demoSave } from "../../scripts/make-demo.mjs";
import { replay } from "../../runner/replay.js";
import { fork } from "../../runner/fork.js";

const file = JSON.parse(readFileSync(new URL("../../web/demo/save.json", import.meta.url), "utf8"));

test("web/demo/save.json is what scripts/make-demo.mjs writes", () => {
  assert.deepEqual(file, demoSave());
});

test("the demo is a finished Chapter 1: 30 choices, 24 months closed", () => {
  const { bars } = replay(file.seed, file.choices);
  assert.equal(file.choices.length, 30);
  assert.equal(file.closed, 24);
  assert.deepEqual(bars.map((b) => b.month), Array.from({ length: 24 }, (_, i) => i + 1));
});

test("forking D16 away from the index withdraws D20-B, as web/demo/README.md says", () => {
  assert.equal(file.choices[15], "D16-A");
  assert.equal(file.choices[19], "D20-B");
  for (const option of ["D16-B", "D16-C"]) {
    assert.deepEqual(fork(file, 15, option).substitutions, [{ monthIndex: 19, decisionId: "D20", withdrawn: "D20-B", chosen: "D20-C" }]);
  }
});
