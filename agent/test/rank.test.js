import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rank, forksOf, order, features, surpriseMeasures, SCORES, SCORE, UNITS } from "../rank.js";
import { fork, alternativesAt } from "../../runner/fork.js";

const demo = JSON.parse(readFileSync(new URL("../../web/demo/save.json", import.meta.url), "utf8"));
// Forking every choice is the slow part: once for the file
const forks = forksOf(demo);

// A divergence from month 1 to 24, ghost minus real, with each key's gap given by month
const divergence = (gaps) => Array.from({ length: 24 }, (_, i) => {
  const month = i + 1;
  return { month, ...Object.fromEntries(["netWorth", "safety", "freedom", "life"].map((k) => [k, gaps[k]?.(month) ?? 0])) };
});
const featuresOf = (gaps, forkMonth = 1) => features({ divergence: divergence(gaps) }, forkMonth);

test("no score is ruled yet: rank() refuses without one", () => {
  assert.equal(SCORE, null);
  assert.throws(() => rank(demo), /No fork score is ruled yet/);
  assert.throws(() => rank(demo, { score: "loudest" }), /Unknown fork score/);
});

test("every choice, every alternative offered there, once", () => {
  const expected = demo.choices.flatMap((_, i) => alternativesAt(demo, i).map((option) => `${i}:${option}`));
  assert.deepEqual(forks.map((f) => `${f.monthIndex}:${f.option}`), expected);
  for (const f of forks) assert.equal(f.real, demo.choices[f.monthIndex]);
});

test("each entry carries the fork it scored, as fork() returns it", () => {
  for (const f of [forks[0], forks[Math.floor(forks.length / 2)], forks.at(-1)]) {
    assert.equal(JSON.stringify(f.fork), JSON.stringify(fork(demo, f.monthIndex, f.option)));
  }
});

test("ordered by score, highest first, ties in choice order", () => {
  for (const name of Object.keys(SCORES)) {
    const ranked = order(forks, name);
    assert.equal(ranked.length, forks.length);
    for (let i = 1; i < ranked.length; i++) {
      const [a, b] = [ranked[i - 1], ranked[i]];
      assert.ok(a.score > b.score || (a.score === b.score && a.monthIndex <= b.monthIndex), `${name} at ${i}`);
    }
  }
});

test("net-worth-gap is the money gap at the end, in units", () => {
  const f = featuresOf({ netWorth: (m) => m * 1000 });
  assert.deepEqual(SCORES["net-worth-gap"](f), { score: 24000 / UNITS.netWorth, reason: "net-worth-gap" });
});

test("surprise: the money gap on its own scores nothing", () => {
  const f = featuresOf({ netWorth: (m) => -m * 20000 });
  assert.deepEqual(SCORES.surprise(f), { score: 0, reason: null });
});

test("surprise: a bar apart while the money ends close is quiet-money", () => {
  const f = featuresOf({ freedom: (m) => (m >= 16 ? -20 : 0), netWorth: () => 2000 }, 16);
  const { score, reason } = SCORES.surprise(f);
  assert.equal(reason, "quiet-money:freedom");
  assert.equal(score, (20 / UNITS.freedom) * (1 - 2000 / UNITS.netWorth));
});

test("surprise: a gap that opens only at the shock is shock", () => {
  const f = featuresOf({ freedom: (m) => (m >= 24 ? -13 : 0), netWorth: (m) => m * 3000 }, 12);
  assert.equal(f.shock.freedom, 13);
  assert.equal(SCORES.surprise(f).reason, "shock:freedom");
});

test("shock does not count a gap that was already open before it", () => {
  // Safety 37 points down for a year, then 30 more at the layoff: already the story before the shock
  const f = featuresOf({ safety: (m) => (m >= 24 ? -67 : -37) });
  assert.equal(f.shock.safety, 0);
});

test("shock is null for a fork too close to the shock to have a before", () => {
  assert.equal(featuresOf({}, 19).shock.netWorth, null);
  assert.notEqual(featuresOf({}, 18).shock.netWorth, null);
});

test("a reversal needs six months on the other side, and scores the smaller half", () => {
  const turned = featuresOf({ netWorth: (m) => (m <= 12 ? 27000 : -11000) });
  assert.equal(turned.reversal.netWorth, 11000);
  const brief = featuresOf({ netWorth: (m) => (m <= 5 ? 27000 : -11000) });
  assert.equal(brief.reversal.netWorth, 0);
});

test("trade-off is money against Safety or Freedom, never Life", () => {
  const f = featuresOf({ netWorth: () => 70000, life: () => -9, safety: () => -4 });
  const measures = Object.fromEntries(surpriseMeasures(f));
  assert.equal(measures["trade-off:life"], undefined);
  assert.equal(measures["trade-off:safety"], Math.min(70000 / UNITS.netWorth, 4 / UNITS.safety));
});

test("the demo's substitution forks rank with their substitution attached", () => {
  const withSubstitution = forks.filter((f) => f.fork.substitutions.length > 0);
  assert.deepEqual(withSubstitution.map((f) => f.option), ["D16-B", "D16-C"]);
});
