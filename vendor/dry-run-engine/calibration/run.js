// Runs the calibration harness and prints the report.
// Usage, from the project root: node calibration/run.js [playthroughs] [NAME=value ...]
//   node calibration/run.js                          1,000 playthroughs on section 12 as written
//   node calibration/run.js 1000 CASH_LEAK_RATE=0.1  the same, trying a proposed constant
// A NAME=value changes the run only. Section 12 changes by ruling, never from here.
//
// The player types come first: the section 13 targets are judged against them (ruled 27
// September 2026). Random play follows as a secondary measure of the spread of outcomes.

import CONSTANTS from "../engine/constants.js";
import { createState } from "../engine/index.js";
import {
  readTargets, randomPlaythrough, checkpoints, noDominantStrategy, noFreeLunch, shocksSurvivable,
  compoundingVisible, saverThroughShocks, typePlaythrough, PLAYER_TYPES, firstInvestmentUp, leagueScore, measuredMonths, percentile, CHAPTER_END, LAST_CALLBACK_MONTH,
  MEASURES, targetVerdict, medianVerdict, OPENING_END, openingTargets, noDominantStrategyAt, play,
} from "./harness.js";

const args = process.argv.slice(2);
const N = Number(args.find((a) => /^\d+$/.test(a)) || 1000);
const overrides = {};
for (const arg of args.filter((a) => a.includes("="))) {
  const [name, value] = arg.split("=");
  if (!(name in CONSTANTS)) throw new Error(`${name} is not a section 12 constant`);
  overrides[name] = Number(value);
}
const constants = Object.freeze({ ...CONSTANTS, ...overrides });
const started = Date.now();
const targets = readTargets();

const rupees = (n) => {
  const sign = n < 0 ? "-" : "";
  const digits = String(Math.round(Math.abs(n)));
  const last = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return sign + (rest ? `${rest},${last}` : last);
};
const one = (n) => n.toFixed(1);
const table = (header, rows) => {
  console.log(`| ${header.join(" | ")} |`);
  console.log(`|${header.map(() => "---").join("|")}|`);
  for (const r of rows) console.log(`| ${r.join(" | ")} |`);
  console.log("");
};

const TYPE_SEEDS = 100;
console.log(`# Calibration report\n`);
if (Object.keys(overrides).length) {
  console.log(`**Trial constants, not section 12:** ${Object.entries(overrides).map(([k, v]) => `${k} ${CONSTANTS[k]} -> ${v}`).join(", ")}\n`);
}
const MONTHS = measuredMonths(targets);
console.log(`Four player types on seeds 1 to ${TYPE_SEEDS}, and ${N} random playthroughs on seeds 1 to ${N}. Every run goes to month ${LAST_CALLBACK_MONTH} so every callback lands. Checkpoints read at the end of months ${MONTHS.join(" and ")}.\n`);

const runs = [];
for (let seed = 1; seed <= N; seed++) runs.push(randomPlaythrough(seed, constants));
const cps = checkpoints(runs, targets);
const bench24 = targets.league.find((l) => l.month === CHAPTER_END);
const format = (measure, v) => (measure === "net worth" ? rupees(v) : one(v));
const bars = (month, f) => runs.map((r) => f(r.barsAt[month])).sort((a, b) => a - b);
const share = (month, f) => `${Math.round((100 * runs.filter((r) => f(r.barsAt[month])).length) / N)}%`;

// The player types: seed 1, and each type across seeds 1 to TYPE_SEEDS
const seedOne = PLAYER_TYPES.map((t) => typePlaythrough(t, 1, constants));
const across = Object.fromEntries(PLAYER_TYPES.map((t) => [t, Array.from({ length: TYPE_SEEDS }, (_, i) => typePlaythrough(t, i + 1, constants))]));
const median = (rs, month, f) => percentile(rs.map((r) => f(r.barsAt[month])).sort((a, b) => a - b), 50);
const typeValue = (type, c) => median(across[type], c.month, MEASURES[c.measure]);

// Section 13 targets, judged against the player types
console.log(`## Section 13 targets, judged against the player types\n`);
console.log(`The player types are the primary result. Random play is not a model of a human player: it takes the expensive option at D02, D10, D19 and D23 about two times in three, so its percentiles describe the spread of outcomes, not how people play. They follow as a secondary measure.\n`);
console.log(`Weak play is judged against Spender, the median against Balanced and Cautious, strong play against Maximum saving (maths doc section 13). Each figure is the type's median over seeds 1 to ${TYPE_SEEDS}.\n`);
table(
  ["Checkpoint", "Weak target", "Spender", "Median target", "Balanced", "Cautious", "Median verdict", "Strong target", "Maximum saving"],
  cps.map((c) => {
    if (!c.measured) return [c.checkpoint, c.weak.text, c.note, c.median.text, c.note, c.note, ".", c.strong.text, c.note];
    const [sp, ba, ca, ms] = ["spender", "balanced", "cautious", "maximum saving"].map((t) => typeValue(t, c));
    return [c.checkpoint,
      c.weak.text, `${format(c.measure, sp)} (${targetVerdict(c.weak, sp)})`,
      c.median.text, format(c.measure, ba), format(c.measure, ca), medianVerdict(c.measure, c.median, ba, ca),
      c.strong.text, `${format(c.measure, ms)} (${targetVerdict(c.strong, ms)})`];
  }),
);
console.log(`"In range" for a single-value target means within 20% of it. "Under X" and "negative to X" targets are in range below X. For net worth the median target is "bracketed" when it lies between Balanced and Cautious; otherwise it takes the nearer type's verdict, or "in range" if either type is. For Safety the median is Balanced's verdict alone, since Cautious holds full runway and reads 100 by definition.\n`);

// Chapter 2's opening, months 25 to OPENING_END: the player types against targets derived by
// section 13's own rule, and validation 1 read at OPENING_END
const opening = openingTargets(targets);
const OPENING_MONTHS = Array.from({ length: OPENING_END - CHAPTER_END }, (_, i) => CHAPTER_END + 1 + i);
console.log(`## Chapter 2's opening, months ${CHAPTER_END + 1} to ${OPENING_END}\n`);
console.log(`**Chapter two's opening has no ruled target.** Section 13 has no target between month 24 and month 120. These month ${OPENING_END} targets are derived by its own rule for a month between checkpoints, geometric interpolation, to show where the opening lands; they are not ruled, so a verdict against them is a reading, not a pass or a failure. Weak play uses the league ref, because the month 24 weak target is negative and a geometric rule cannot cross zero. There is no Safety target after month 24 to derive one from.\n`);
// Ruled 30 October 2026: strong play's overshoot of the derived month 30 target is recorded and
// left, because the target is interpolated, not ruled
const recorded = (verdict) => (verdict === "above" ? "above, recorded and left: the target is derived, not ruled" : verdict);
const openingNw = (type) => median(across[type], OPENING_END, (b) => b.netWorth);
const [osp, oba, oca, oms] = ["spender", "balanced", "cautious", "maximum saving"].map(openingNw);
table(
  [`Month ${OPENING_END} net worth`, "Derived from", "Target", "Judged against", "Measured", "Verdict"],
  [
    ["Weak", opening.weak.from, `under ${rupees(opening.weak.below)}`, "Spender", rupees(osp), targetVerdict({ below: opening.weak.below }, osp)],
    ["Median", opening.median.from, rupees(opening.median.value), "Balanced, Cautious", `${rupees(oba)}, ${rupees(oca)}`, medianVerdict("net worth", { value: opening.median.value }, oba, oca)],
    ["Strong", opening.strong.from, rupees(opening.strong.value), "Maximum saving", rupees(oms), recorded(targetVerdict({ value: opening.strong.value }, oms))],
  ],
);
table(
  [`Median of seeds 1 to ${TYPE_SEEDS}`, "Month", "Net worth", "Safety", "Freedom", "Life"],
  [CHAPTER_END, ...OPENING_MONTHS].flatMap((m) => PLAYER_TYPES.map((type) => {
    const rs = across[type];
    return [type, m, rupees(median(rs, m, (b) => b.netWorth)), one(median(rs, m, (b) => b.safety)), one(median(rs, m, (b) => b.freedom)), one(median(rs, m, (b) => b.life))];
  })),
);
const chapterTwo = (r) => Object.entries(r.chosen).filter(([id]) => Number(id.slice(1)) >= 31).map(([, o]) => o).join(" ");
for (const r of seedOne) console.log(`${r.type}, chapter 2 choices, seed 1: ${chapterTwo(r)}\n`);
const v1o = noDominantStrategyAt(runs, opening.league, OPENING_END, constants);
console.log(`Validation 1 at month ${OPENING_END}, on the interpolated league benchmark (ref ${rupees(opening.league.ref)}, target ${rupees(opening.league.target)}): maximum saving scores ${one(v1o.score)} with ${rupees(v1o.saver.netWorth)}, Safety ${one(v1o.saver.safety)}, Freedom ${one(v1o.saver.freedom)}, Life ${one(v1o.saver.life)}. ${v1o.beatenBy} of ${v1o.league - 1} random players score above it: ${v1o.beatenBy > 0 ? "PASS" : "FAIL"}.\n`);

// Deterministic player types
console.log(`## Player types\n`);
console.log(`Four fixed rules, defined in maths doc section 13. Each is judged on the state it is in when the decision arrives.\n`);
table(
  ["Seed 1", "Month", "Net worth", "Safety", "Freedom", "Life", "League score"],
  MONTHS.flatMap((m) => seedOne.map((r) => {
    const b = r.barsAt[m];
    return [r.type, m, rupees(b.netWorth), one(b.safety), one(b.freedom), one(b.life), m === CHAPTER_END ? one(leagueScore(b, bench24).score) : "."];
  })),
);
table(
  [`Median of seeds 1 to ${TYPE_SEEDS}`, "Month", "Net worth", "Safety", "Freedom", "Life"],
  MONTHS.flatMap((m) => PLAYER_TYPES.map((type) => {
    const rs = across[type];
    return [type, m, rupees(median(rs, m, (b) => b.netWorth)), one(median(rs, m, (b) => b.safety)), one(median(rs, m, (b) => b.freedom)), one(median(rs, m, (b) => b.life))];
  })),
);
console.log(`Maximum saving's choices are found once, on seed 1, and played on each market. The other three choose again on every seed.\n`);
for (const r of seedOne) console.log(`${r.type} choices, seed 1: ${Object.values(r.chosen).join(" ")}\n`);

// D16-A target
const d16 = firstInvestmentUp(200, constants);
console.log(`D16-A balance above money put in at the end of month 24, on a path that keeps it running: ${d16.up} of ${d16.seeds}, ${Math.round(100 * d16.share)}%. Target at least 80%.\n`);

// Random play, secondary
console.log(`## Random play, secondary\n`);
console.log(`${N} random playthroughs, every option at every decision equally likely. Secondary since 27 September 2026, because random play is not a model of a human player. Weak, median and strong are read here as the 10th, 50th and 90th percentiles.\n`);
table(
  ["Checkpoint", "Weak target", "Weak, p10", "Median target", "Median, p50", "Strong target", "Strong, p90"],
  cps.map((c) => c.measured
    ? [c.checkpoint,
      c.weak.text, `${format(c.measure, c.measured.p10)} (${targetVerdict(c.weak, c.measured.p10)})`,
      c.median.text, `${format(c.measure, c.measured.p50)} (${targetVerdict(c.median, c.measured.p50)})`,
      c.strong.text, `${format(c.measure, c.measured.p90)} (${targetVerdict(c.strong, c.measured.p90)})`]
    : [c.checkpoint, c.weak.text, c.note, c.median.text, c.note, c.strong.text, c.note]),
);
table(
  ["Measured", "p10", "p25", "p50", "p75", "p90"],
  cps.filter((c) => c.measured).map((c) => [c.checkpoint, ...["p10", "p25", "p50", "p75", "p90"].map((p) => format(c.measure, c.measured[p]))]),
);

// Everything else a designer would ask about the same runs
table(
  ["Not targeted", "p10", "p50", "p90"],
  MONTHS.flatMap((m) => [
    [`Month ${m} Freedom`, ...[10, 50, 90].map((p) => one(percentile(bars(m, (b) => b.freedom), p)))],
    [`Month ${m} Life`, ...[10, 50, 90].map((p) => one(percentile(bars(m, (b) => b.life), p)))],
  ]),
);
table(
  ["Pinned", ...MONTHS.map((m) => `Month ${m}`)],
  [
    ["Safety exactly 30, cover points only and no runway", ...MONTHS.map((m) => share(m, (b) => Math.abs(b.safety - 30) < 1e-9))],
    ["Freedom 0", ...MONTHS.map((m) => share(m, (b) => b.freedom === 0))],
  ],
);
const reached = (step) => runs.filter((r) => r.months.some((m) => m.month <= CHAPTER_END && m.deepestStep >= step)).length;
table(
  ["Months 1 to 24: deepest cascade step reached", "Playthroughs", "Share"],
  [1, 2, 3, 4, 5].map((s) => [`Step ${s} or deeper`, reached(s), `${Math.round((100 * reached(s)) / N)}%`]),
);
const everAtLimit = runs.filter((r) => r.months.some((m) => m.cardPrincipal >= constants.CARD_LIMIT - 1e-6));
const holders = runs.filter((r) => r.months.some((m) => m.hasCard));
const holdersAtLimit = holders.filter((r) => everAtLimit.includes(r));
console.log(`At the ${rupees(constants.CARD_LIMIT)} card limit at some month to month ${LAST_CALLBACK_MONTH}: ${everAtLimit.length} of ${N}, ${Math.round((100 * everAtLimit.length) / N)}%. Of the ${holders.length} players who ever held a card, ${holdersAtLimit.length}, ${Math.round((100 * holdersAtLimit.length) / holders.length)}%.\n`);

// Validation 1
console.log(`## Validation 1: no dominant strategy\n`);
const v1 = noDominantStrategy(runs, targets, constants);
console.log(`Maximum-saving play: at each decision, the option leaving the most net worth at month 24, later decisions on their quiet option.\n`);
table(
  ["Player", "Net worth", "Safety", "Freedom", "Life", "NW index", "League score"],
  [
    ["Maximum saving", rupees(v1.saver.bars.netWorth), one(v1.saver.bars.safety), one(v1.saver.bars.freedom), one(v1.saver.bars.life), one(v1.saver.nwIndex), one(v1.saver.score)],
    [`Top random, seed ${v1.top.seed}`, rupees(v1.top.bars.netWorth), one(v1.top.bars.safety), one(v1.top.bars.freedom), one(v1.top.bars.life), one(v1.top.nwIndex), one(v1.top.score)],
  ],
);
table(
  ["Maximum-saving player against the random median", "Net worth", "Safety", "Freedom", "Life"],
  MONTHS.flatMap((m) => {
    const s = v1.saver.barsAt[m];
    const med = (f) => percentile(bars(m, f), 50);
    return [
      [`Month ${m}, maximum saving`, rupees(s.netWorth), one(s.safety), one(s.freedom), one(s.life)],
      [`Month ${m}, random median`, rupees(med((b) => b.netWorth)), one(med((b) => b.safety)), one(med((b) => b.freedom)), one(med((b) => b.life))],
    ];
  }),
);
// Month 24 sees chapter 1 alone, which cannot pass it whatever comes later in the sheet; since
// v35 validation 1 is judged at OPENING_END, in chapter 2's opening section above
const v1Status = "NOT PASSABLE IN CHAPTER 1";
console.log(`${v1Status}: ${v1.beatenBy} of ${v1.league - 1} random players score above maximum-saving play.\n`);
console.log(`Not judged here. No Chapter 1 decision costs a maximum saver real money, so at month 24 this measures missing content, not the score (maths doc section 14). The sheet has chapter 2 decisions since v35, so it is judged at month ${OPENING_END}, in chapter 2's opening section above.\n`);
console.log(`Maximum-saving choices: ${Object.values(v1.saver.choices).join(" ")}\n`);

// Validation 2
console.log(`## Validation 2: no free lunch\n`);
const v2 = noFreeLunch(1, constants);
console.log(`Each option against skipping its decision, from the quiet path, through its last callback. Flagged when Net Worth, Safety, Freedom and Life all change by zero or more.\n`);
const gains = v2.flagged.filter((r) => !r.noEffect && !r.unskippable);
const unskippable = v2.flagged.filter((r) => r.unskippable);
const nothing = v2.flagged.filter((r) => r.noEffect);
console.log(`${gains.length === 0 ? "PASS" : "FAIL"}: ${gains.length} options gain or hold on all four bars with at least one gain. ${nothing.length} more change nothing at all.\n`);
if (gains.length) {
  table(["Option", "Label", "Net worth", "Safety", "Freedom", "Life", "Through month"],
    gains.map((r) => [r.option, r.label, rupees(r.delta.netWorth), one(r.delta.safety), one(r.delta.freedom), one(r.delta.life), r.through]));
}
if (nothing.length) console.log(`No effect on any bar: ${nothing.map((r) => r.option).join(", ")}\n`);
if (unskippable.length) console.log(`Not judged, because skipping the decision means salary never restarts: ${unskippable.map((r) => r.option).join(", ")}\n`);

// Validation 3
console.log(`## Validation 3: shocks are survivable\n`);
const v3 = shocksSurvivable(runs, constants);
console.log(`Prepared: at least ${constants.SAFETY_TARGET_MONTHS} months of runway the month before the shock. Watched from the shock month until its callback lands and, after the layoff, salary is back.\n`);
table(["Shock", "Prepared players", "Reached step 4 or 5", "Result"],
  v3.map((s) => [s.shock, s.prepared, s.failures.length, s.prepared === 0 ? "NOT TESTED, no prepared player" : s.pass ? "PASS" : "FAIL"]));
for (const s of v3.filter((x) => x.failures.length)) {
  console.log(`${s.shock}, first failures: ${s.failures.slice(0, 5).map((f) => `seed ${f.seed} step ${f.step} at month ${f.month} (runway ${one(f.runway)})`).join("; ")}\n`);
}
// The exact path behind each failure (recorded 30 October 2026, window and content left as they
// are): every choice the random player made, month by month to the failing month, what it could
// reach as that month began, and how deep the cascade went in each month of the shock's window
const reachable = (state) => ({
  cash: state.cash,
  liquid: state.liquid_fund,
  fds: state.fds.reduce((a, d) => a + d.value, 0),
  equity: [...state.equity, ...state.small_cap].reduce((a, h) => a + h.value, 0),
});
for (const s of v3.filter((x) => x.failures.length)) {
  for (const f of s.failures) {
    const run = runs.find((r) => r.seed === f.seed);
    const chosen = Object.assign({}, ...run.months.map((m) => m.chosen));
    const start = play(createState(f.seed, constants), (d) => chosen[d.decision_id] ?? null, f.month - 1, constants).state;
    const r = reachable(start);
    console.log(`### ${s.shock}: the path behind seed ${f.seed}\n`);
    console.log(`Prepared: ${one(f.runway)} months of runway the month before the shock. Reaches step ${f.step} at month ${f.month}.\n`);
    table(["Month", "Choices", "Deepest step", "Employed", "Net worth"],
      run.months.filter((m) => m.month <= f.month).map((m) => [m.month, Object.values(m.chosen).join(" ") || ".", m.deepestStep, m.employed ? "yes" : "no", rupees(m.bars.netWorth)]));
    console.log(`Reachable as month ${f.month} began: cash ${rupees(r.cash)}, liquid fund ${rupees(r.liquid)}, deposits ${rupees(r.fds)}, equity and small caps ${rupees(r.equity)}. Month ${f.month}'s choices: ${Object.values(run.months.find((m) => m.month === f.month).chosen).join(", ")}.\n`);
  }
}

const saverShocks = saverThroughShocks(1, constants);
table(["Maximum-saving player", "Runway the month before", "Deepest step to month 30"],
  saverShocks.map((s) => [s.shock, one(s.runway), s.deepest]));

// Validation 4
console.log(`## Validation 4: compounding is visible\n`);
const v4 = compoundingVisible(100, 10, 40, 240, constants);
table(["5,000 a month into broad equity", "Value at month 240, median"],
  [["From month 10", rupees(v4.medianEarly)], ["From month 40", rupees(v4.medianLate)], ["Gap", rupees(v4.medianGap)], ["Extra money put in by starting early", rupees(v4.extraPutIn)]]);
console.log(`${v4.earlyWinsEverySeed ? "PASS" : "FAIL"}: starting at month 10 ends ahead on ${v4.earlyWinsEverySeed ? "every one" : "not every one"} of ${v4.seeds} seeds. Median ratio ${v4.medianRatio.toFixed(2)}, worst ${v4.worstRatio.toFixed(2)}. The gap is ${(v4.medianGap / v4.extraPutIn).toFixed(1)} times the extra money put in.\n`);

console.log(`Ran in ${Math.round((Date.now() - started) / 1000)} seconds.`);
