// Five narrations written by hand (verify/test/narrations/), each checked against a fork with a
// substitution: Cautious's save on D16-A and D20-A, forked at D16 to D16-C. The ghost then has
// no index investment for D20-A to move (rule 29) and takes D20-C. No model is involved.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { fork } from "../../runner/fork.js";
import { verify } from "../verify.js";
import { renderNarration, FORMATS } from "../render.js";
import { TOKENS } from "../tokens.js";
import { indexSave } from "../../scripts/player-saves.mjs";

const narration = (name) => readFileSync(new URL(`./narrations/${name}.txt`, import.meta.url), "utf8").trim();
const save = indexSave();
const d16 = save.choices.indexOf("D16-A");
// The ruled fallback, and the same fork under keep-real-or-stop, whose ghost ends at D20 with no
// substitute, so {substitute_choice} has no value
const result = fork(save, d16, "D16-C");
const stopped = fork(save, d16, "D16-C", { substitution: "keep-real-or-stop" });
const rules = (verification) => verification.failures.map((f) => f.rule);

test("the fork the narrations describe has one substitution", () => {
  assert.deepEqual(result.substitutions.map((s) => [s.withdrawn, s.chosen]), [["D20-A", "D20-C"]]);
  assert.deepEqual(stopped.substitutions.map((s) => [s.withdrawn, s.chosen]), [["D20-A", null]]);
});

test("a correct narration passes, lists its figures and renders", () => {
  const text = narration("correct");
  const v = verify(text, result);
  assert.deepEqual(v.failures, []);
  assert.equal(v.ok, true);
  assert.deepEqual(v.figures.map((f) => f.token), [
    "fork_month", "real_choice", "ghost_choice", "identical_months", "substitution_month", "withdrawn_choice",
    "substitute_choice", "end_month", "net_worth_gap", "ghost_net_worth", "real_net_worth", "life_gap", "safety_gap",
  ]);
  assert.equal(v.figures.find((f) => f.token === "real_net_worth").value, result.real.bars.at(-1).netWorth);
  assert.equal(renderNarration(text, v),
    "In month 10 you chose “5,000 a month into a broad equity index”. The ghost chose “Wait until you earn more” instead. " +
    "For ten months nothing told the two lives apart. Then in month 14 you chose “Move your monthly investment there”, " +
    "but that choice was not offered on the ghost path, so the ghost took “Ignore it”. " +
    "By month 24 the ghost has 16,000 less: 3,45,000 against your 3,61,000. Its Life ends 1 point higher, and Safety ends level.");
});

test("a bare numeral fails", () => {
  const v = verify(narration("bare-numeral"), result);
  assert.equal(v.ok, false);
  assert.deepEqual(rules(v), ["numeral"]);
  assert.match(v.failures[0].detail, /"24"/);
  assert.throws(() => renderNarration(narration("bare-numeral"), v), /passed verify/);
});

test("an invented token fails", () => {
  const v = verify(narration("invented-token"), result);
  assert.equal(v.ok, false);
  assert.deepEqual(rules(v), ["unknown_token"]);
  assert.match(v.failures[0].detail, /\{retirement_years_earlier\}/);
  assert.ok(!v.figures.some((f) => f.token === "retirement_years_earlier"));
});

test("a token that resolves to null for this fork fails", () => {
  const text = narration("null-token");
  // The same narration passes on the ruled fork, where the ghost took a substitute
  assert.equal(verify(text, result).ok, true);
  const v = verify(text, stopped);
  assert.equal(v.ok, false);
  assert.deepEqual(rules(v), ["null_token"]);
  assert.match(v.failures[0].detail, /\{substitute_choice\}/);
  assert.equal(v.figures.find((f) => f.token === "substitute_choice").value, null);
});

test("a narration that leaves out a required substitution fails", () => {
  const text = narration("missing-substitution");
  const v = verify(text, result);
  assert.equal(v.ok, false);
  assert.deepEqual(rules(v), ["substitution_unmentioned"]);
  assert.match(v.failures[0].detail, /D20-A/);
  // With no substitution in the fork, the same narration needs no mention
  const plain = fork(save, save.choices.indexOf("D01-B"), "D01-A");
  assert.deepEqual(plain.substitutions, []);
  assert.equal(verify(text, plain).ok, true);
});

test("every token has a format, and render formats nothing else", () => {
  assert.deepEqual(Object.keys(FORMATS).sort(), [...TOKENS].sort());
});
