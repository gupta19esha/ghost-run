// ENGINE.md step 7: the calibration harness. SIMULATION-MATHS.md section 13.
//
// Runs random playthroughs through the engine and measures them against the section 13
// targets, plus the four validation tests. It changes nothing: it reports, and constants
// change only by ruling. The harness is analysis, not the engine, so it may use Math.log
// for the league score (section 11). Nothing here feeds back into a game.
//
// Scope, as ruled for step 7:
//   Months 21 and 24 are measured: month 21 is how the chapter went, month 24 is how the
//   layoff went. Months 120 and 240 need Chapters 2 to 6 and are reported blank.
//   The targets are judged against the four player types, ruled 27 September 2026: weak play
//   is Spender, the median is bracketed by Balanced and Cautious, strong play is Maximum
//   saving. Random play is secondary: its 10th, 50th and 90th percentiles are still reported.
//   A prepared player has at least SAFETY_TARGET_MONTHS of runway the month before a shock.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import CONSTANTS from "../engine/constants.js";
import DECISIONS from "../engine/decisions.js";
import { createState, advanceMonth, applyDecision, getBars, optionsFor } from "../engine/index.js";
import { explainSafety, explainFreedom } from "../engine/bars.js";

const DOC_PATH = fileURLToPath(new URL("../SIMULATION-MATHS.md", import.meta.url));

export const CHAPTER_END = 24;
// Every callback lands by this month, so shocks can be followed to the end
export const LAST_CALLBACK_MONTH = Math.max(
  ...Object.values(DECISIONS).flatMap((d) => Object.values(d.options).map((o) => d.month + (o.deferred_offset_months || 0))),
);
const SHOCK_DECISIONS = Object.values(DECISIONS).filter((d) => d.type === "Shock");
const DECISIONS_BY_MONTH = {};
for (const d of Object.values(DECISIONS)) (DECISIONS_BY_MONTH[d.month] ||= []).push(d);

// ---------- Section 13, read from the doc so the targets live in one place ----------

// "2.5L" -> 250000, "50k" -> 50000, "-65k" -> -65000, "1.2Cr" -> 12000000, "45" -> 45
function parseAmount(text) {
  const m = text.trim().match(/^(-?[\d.]+)\s*(k|L|Cr)?$/);
  if (!m) return null;
  const scale = { k: 1e3, L: 1e5, Cr: 1e7 }[m[2]] || 1;
  return Number(m[1]) * scale;
}

// A cell is a single value, "under X" or "Negative to X"
function parseTarget(cell) {
  const text = cell.trim();
  let m = text.match(/^under (.+)$/i);
  if (m) return { below: parseAmount(m[1]), text };
  m = text.match(/^Negative to (.+)$/i);
  if (m) return { below: parseAmount(m[1]), text };
  const value = parseAmount(text);
  if (value === null) throw new Error(`Cannot read the section 13 target ${JSON.stringify(cell)}`);
  return { value, text };
}

function tableAfter(doc, heading) {
  const start = doc.indexOf(heading);
  if (start < 0) throw new Error(`No ${heading} in the maths doc`);
  const lines = doc.slice(start).split("\n");
  const first = lines.findIndex((l) => l.startsWith("|"));
  const rows = [];
  for (const line of lines.slice(first)) {
    if (!line.startsWith("|")) break;
    rows.push(line.split("|").slice(1, -1).map((c) => c.trim()));
  }
  return rows.slice(2); // header and divider
}

export function readTargets(doc = readFileSync(DOC_PATH, "utf8")) {
  const section = doc.slice(doc.indexOf("## 13. Calibration targets"));
  const checkpoints = tableAfter(section, "| Checkpoint | Weak play |").map(([checkpoint, weak, median, strong]) => {
    const m = checkpoint.match(/^Month (\d+) (.+)$/);
    return { checkpoint, month: Number(m[1]), measure: m[2], weak: parseTarget(weak), median: parseTarget(median), strong: parseTarget(strong) };
  });
  const league = tableAfter(section, "| Checkpoint | `ref` | `target` |").map(([checkpoint, ref, target]) => ({
    month: Number(checkpoint.match(/\d+/)[0]),
    ref: Number(ref.replace(/,/g, "")),
    target: Number(target.replace(/,/g, "")),
  }));
  return { checkpoints, league };
}

// The months the report reads, from the targets: every target month the playthroughs reach
export function measuredMonths(targets) {
  return [...new Set(targets.checkpoints.map((t) => t.month))].filter((m) => m <= CHAPTER_END).sort((a, b) => a - b);
}

// ---------- Section 11 ----------

export function leagueScore(bars, { ref, target }) {
  const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
  const nwIndex = clamp((100 * Math.log(Math.max(bars.netWorth, ref) / ref)) / Math.log(target / ref), 0, 100);
  return { nwIndex, score: 0.35 * nwIndex + 0.25 * bars.safety + 0.2 * bars.freedom + 0.2 * bars.life };
}

// ---------- Playthroughs ----------

// Choices use their own seeded generator, separate from the market's noise
export function choiceRandom(seed) {
  let s = (seed * 2654435761) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomPicker(seed) {
  const rand = choiceRandom(seed);
  return (decision) => {
    const ids = Object.keys(decision.options);
    return ids[Math.floor(rand() * ids.length)];
  };
}

// The option that moves the least money: the reference path for the validation tests
const moves = (o) => Math.abs((o.money_once || 0) + (o.money_once_2 || 0)) +
  CHAPTER_END * Math.abs((o.money_monthly || 0) + (o.money_monthly_2 || 0)) + (o.card_balance || 0);
export function quietOption(decision) {
  return Object.values(decision.options).sort((a, b) => moves(a) - moves(b))[0].option_id;
}

// A skipped decision still lands its income_event, as applyDecision would before any option:
// D14's bonus arrives whether or not the player chooses what to do with it
function landIncomeEvent(state, decision) {
  if (!decision.income_event) return state;
  const next = structuredClone(state);
  next.cash += decision.income_event;
  next.pending_flows.cash_in += decision.income_event;
  return next;
}

// The decision as this state offers it: only the options whose precondition holds (rule 29)
export function offered(state, decision) {
  const ids = new Set(optionsFor(state, decision));
  return { ...decision, options: Object.fromEntries(Object.entries(decision.options).filter(([id]) => ids.has(id))) };
}

// Plays from `state` to the end of `untilMonth`. pick(decision, state) returns an option,
// or null to skip the decision. Every pick sees only the options the state offers (rule 29);
// a pick of an option not offered, such as a choice fixed in advance for another path, takes
// the quiet option instead. Returns the final state and what each month recorded.
// `constants` defaults to section 12. A proposal can be tried by passing a changed copy,
// without editing section 12.
export function play(state, pick, untilMonth, constants = CONSTANTS) {
  const months = [];
  while (state.month <= untilMonth) {
    const runwayBefore = explainSafety(state, constants).runway_months;
    const chosen = {};
    for (const raw of DECISIONS_BY_MONTH[state.month] || []) {
      // A play can start partway through a month, after a decision of it is made
      if (state.decisions_taken[raw.decision_id]) continue;
      const decision = offered(state, raw);
      let optionId = pick(decision, state);
      if (optionId !== null && !decision.options[optionId]) optionId = quietOption(decision);
      if (optionId === null) {
        state = landIncomeEvent(state, decision);
        continue;
      }
      state = applyDecision(state, decision.decision_id, optionId, DECISIONS, constants).state;
      chosen[decision.decision_id] = optionId;
    }
    const month = state.month;
    const result = advanceMonth(state, constants);
    state = result.state;
    const cascade = result.events.find((e) => e.type === "cascade");
    months.push({
      month,
      runwayBefore,
      chosen,
      deepestStep: Math.max(cascade ? cascade.deepest_step : 0, state.flows.cascade_deepest_step || 0),
      bars: getBars(state, constants),
      employed: state.employment.employed,
      hasCard: state.has_card,
      cardPrincipal: (state.debts.find((d) => d.type === "card") || { principal: 0 }).principal,
      restartMonth: state.employment.restart_month,
    });
  }
  return { state, months };
}

export function randomPlaythrough(seed, constants = CONSTANTS) {
  const run = play(createState(seed, constants), randomPicker(seed), LAST_CALLBACK_MONTH, constants);
  const barsAt = {};
  for (const m of run.months) barsAt[m.month] = m.bars;
  return { seed, ...run, barsAt, bars24: barsAt[CHAPTER_END] };
}

export function percentile(sorted, p) {
  const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
  return sorted[rank - 1];
}

// ---------- Section 13 checkpoints ----------

export const MEASURES = { "net worth": (b) => b.netWorth, Safety: (b) => b.safety, Life: (b) => b.life };

// A single-value target is met within 20% of it. "Under X" and "Negative to X" are met below X.
export function targetVerdict(target, value) {
  if (target.below !== undefined) return value < target.below ? "in range" : "above";
  const low = target.value * 0.8;
  const high = target.value * 1.2;
  return value < low ? "below" : value > high ? "above" : "in range";
}

// The median target is judged against two player types, Balanced and Cautious (section 13).
// It is met when the two bracket it, or when either lands within range of it. Otherwise the
// verdict is the nearer type's.
export function bracketVerdict(target, a, b) {
  if (target.value !== undefined && Math.min(a, b) <= target.value && target.value <= Math.max(a, b)) return "bracketed";
  const verdicts = [targetVerdict(target, a), targetVerdict(target, b)];
  if (verdicts.includes("in range")) return "in range";
  if (target.value === undefined) return verdicts[0];
  return Math.abs(a - target.value) <= Math.abs(b - target.value) ? verdicts[0] : verdicts[1];
}

// The median verdict for a checkpoint (section 13). Net worth is bracketed by Balanced and
// Cautious. Safety is judged on Balanced alone: Cautious holds full runway and reads 100 by
// definition, so no Safety target below 100 could ever be bracketed.
export function medianVerdict(measure, target, balanced, cautious) {
  return measure === "Safety" ? targetVerdict(target, balanced) : bracketVerdict(target, balanced, cautious);
}

export function checkpoints(runs, targets) {
  return targets.checkpoints.map((t) => {
    if (t.month > CHAPTER_END) return { ...t, measured: null, note: "Needs Chapters 2 to 6" };
    const values = runs.map((r) => MEASURES[t.measure](r.barsAt[t.month])).sort((a, b) => a - b);
    const measured = { p10: percentile(values, 10), p25: percentile(values, 25), p50: percentile(values, 50), p75: percentile(values, 75), p90: percentile(values, 90) };
    return { ...t, measured };
  });
}

// ---------- Validation 1: no dominant strategy ----------

// Maximum-saving play: at each decision, the option that leaves the most net worth at month
// 24, with every later decision on its quiet option
export function maximumSavingPlay(seed = 1, constants = CONSTANTS) {
  const choices = {};
  const pick = (decision) => choices[decision.decision_id] || quietOption(decision);
  for (const decision of Object.values(DECISIONS).sort((a, b) => a.month - b.month)) {
    let best = null;
    // Only the options this path offers at the decision are tried (rule 29)
    const before = play(createState(seed, constants), pick, decision.month - 1, constants).state;
    for (const optionId of Object.keys(offered(before, decision).options)) {
      const trial = { ...choices, [decision.decision_id]: optionId };
      const run = play(createState(seed, constants), (d) => trial[d.decision_id] || quietOption(d), CHAPTER_END, constants);
      const nw = getBars(run.state, constants).netWorth;
      if (!best || nw > best.nw) best = { optionId, nw };
    }
    choices[decision.decision_id] = best.optionId;
  }
  const run = play(createState(seed, constants), pick, CHAPTER_END, constants);
  const barsAt = {};
  for (const m of run.months) barsAt[m.month] = m.bars;
  return { choices, bars: getBars(run.state, constants), barsAt };
}

// Validation 1 is not passable while every decision is in Chapter 1: no Chapter 1 decision
// costs a maximum saver real money, so the test would measure missing content (maths doc
// section 14). It is still measured and reported. It goes live again by itself once the sheet
// holds a decision from this chapter on, where hoarding can carry a money consequence.
export const VALIDATION_1_LIVE_FROM_CHAPTER = 2;
export function validationOneLive(decisions = DECISIONS) {
  return Math.max(...Object.values(decisions).map((d) => d.chapter)) >= VALIDATION_1_LIVE_FROM_CHAPTER;
}

export function noDominantStrategy(runs, targets, constants = CONSTANTS) {
  const bench = targets.league.find((l) => l.month === CHAPTER_END);
  const saver = maximumSavingPlay(1, constants);
  const saverScore = leagueScore(saver.bars, bench);
  const scores = runs.map((r) => ({ seed: r.seed, bars: r.bars24, ...leagueScore(r.bars24, bench) })).sort((a, b) => b.score - a.score);
  const beatenBy = scores.filter((s) => s.score > saverScore.score).length;
  const topNetWorth = [...runs].sort((a, b) => b.bars24.netWorth - a.bars24.netWorth)[0];
  return {
    pass: beatenBy > 0,
    live: validationOneLive(),
    saver: { ...saver, ...saverScore },
    beatenBy,
    league: runs.length + 1,
    top: scores[0],
    topNetWorthScore: leagueScore(topNetWorth.bars24, bench).score,
    topNetWorth: topNetWorth.bars24.netWorth,
  };
}

// ---------- Deterministic player types (maths doc section 13) ----------

// Random play is a weak proxy for people, so four fixed rules stand beside it. Each looks at
// one decision at a time, on the state the player is in when the decision arrives, and
// applies every option to a copy of that state to score it. No rule looks at a later month or
// a callback. Ties go to the option that moves less money (`moves`), then to the option that
// comes first on the sheet. Nothing is random, so a type and a seed always give the same run.
export const PLAYER_TYPES = ["cautious", "spender", "balanced", "maximum saving"];

// Balanced's two limits (maths doc section 13, ruled 30 September 2026): it never takes an
// option that commits more than this share of income (`committed_ratio`, section 5), or that
// leaves fewer than this many months of runway (section 4, card debt netted)
export const BALANCED_COMMITTED_LIMIT = 0.6;
export const BALANCED_RUNWAY_LIMIT = 1;

// The state right after the option is applied, before the month runs
const afterOption = (state, decision, option, constants) =>
  applyDecision(state, decision.decision_id, option.option_id, DECISIONS, constants).state;

// Picks the option with the highest score, or the lowest when `lowest` is set. `score` may
// return a number or [number, ...] to rank on several values in order.
function best(options, score, higher = true) {
  const sign = higher ? 1 : -1;
  return options
    .map((option, index) => ({ option, index, key: score(option) }))
    .sort((a, b) => {
      const ka = [].concat(a.key), kb = [].concat(b.key);
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return sign * (kb[i] - ka[i]);
      return moves(a.option) - moves(b.option) || a.index - b.index;
    })[0].option.option_id;
}

export function typePicker(type, constants = CONSTANTS) {
  if (type === "cautious") {
    // The most runway (months of essential costs the player's reachable money covers, maths
    // doc section 4) in the state right after the option is applied
    return (decision, state) =>
      best(Object.values(decision.options), (o) => explainSafety(afterOption(state, decision, o, constants), constants).runway_months);
  }
  if (type === "spender") {
    // The highest Life effect the sheet authors for the option: its `life` column plus its
    // `def_life` column. Not the engine's Life bar, which the option only starts to move
    return (decision) => best(Object.values(decision.options), (o) => (o.life || 0) + (o.def_life || 0));
  }
  if (type === "balanced") {
    // Balanced by habits (ruled 30 September 2026, maths doc section 13): the option whose net
    // worth at month 24 is nearest the midpoint of the lowest and highest any option of this
    // decision gives, among the options that cross neither of its limits right after they are
    // applied: committed income at most BALANCED_COMMITTED_LIMIT, runway at least
    // BALANCED_RUNWAY_LIMIT months. If every option crosses a limit, the options crossing the
    // fewest, then the nearest the middle: the least bad option, not the safest. Net worth at
    // month 24 is played on with every later decision on its quiet option, as maximum saving
    // scores it
    return (decision, state) => {
      const options = Object.values(decision.options);
      const scored = new Map(options.map((o) => {
        const after = afterOption(state, decision, o, constants);
        const worth = getBars(play(after, (d) => quietOption(d), CHAPTER_END, constants).state, constants).netWorth;
        const crosses = (explainFreedom(after, constants).committed_ratio > BALANCED_COMMITTED_LIMIT ? 1 : 0) +
          (explainSafety(after, constants).runway_months < BALANCED_RUNWAY_LIMIT ? 1 : 0);
        return [o.option_id, { worth, crosses }];
      }));
      const values = [...scored.values()].map((s) => s.worth);
      const middle = (Math.min(...values) + Math.max(...values)) / 2;
      const fewest = Math.min(...[...scored.values()].map((s) => s.crosses));
      const allowed = options.filter((o) => scored.get(o.option_id).crosses === fewest);
      return best(allowed, (o) => Math.abs(scored.get(o.option_id).worth - middle), false);
    };
  }
  throw new Error(`No player type ${type}`);
}

// One type through the same run as a random player: to the last callback, bars at the end of
// each month. Maximum saving is the section 13 definition, its choices found on `seed` 1 and
// played on the market of `seed`.
let savingChoices = null;
export function typePlaythrough(type, seed = 1, constants = CONSTANTS) {
  let pick;
  if (type === "maximum saving") {
    savingChoices ||= new Map();
    if (!savingChoices.has(constants)) savingChoices.set(constants, maximumSavingPlay(1, constants).choices);
    const choices = savingChoices.get(constants);
    pick = (d) => choices[d.decision_id] || quietOption(d);
  } else {
    pick = typePicker(type, constants);
  }
  const run = play(createState(seed, constants), pick, LAST_CALLBACK_MONTH, constants);
  const barsAt = {};
  const chosen = {};
  for (const m of run.months) {
    barsAt[m.month] = m.bars;
    Object.assign(chosen, m.chosen);
  }
  return { type, seed, ...run, barsAt, chosen };
}

// ---------- The D16-A target (maths doc section 14) ----------

// Share of seeds on which the D16-A balance is above the money put in at month 24, on a path
// that keeps D16-A running: D16-A chosen, and every other decision on its quiet option among
// those that do not redirect or cancel D16-A (D20-A and D28-B are left out). Target: at least
// 80%. Read at the end of month 24, the same convention as every other month 24 figure.
export function firstInvestmentUp(seeds = 200, constants = CONSTANTS) {
  let up = 0;
  const rows = [];
  for (let seed = 1; seed <= seeds; seed++) {
    let state = createState(seed, constants);
    while (state.month <= CHAPTER_END) {
      for (const raw of DECISIONS_BY_MONTH[state.month] || []) {
        const d = offered(state, raw);
        const keeps = { ...d, options: Object.fromEntries(Object.entries(d.options).filter(([, o]) => !(o.modifies_commitment || []).includes("D16-A"))) };
        state = applyDecision(state, d.decision_id, d.decision_id === "D16" ? "D16-A" : quietOption(keeps), DECISIONS, constants).state;
      }
      state = advanceMonth(state, constants).state;
    }
    const holding = state.equity.find((h) => h.opened_by === "D16-A");
    if (holding.value > holding.contributed) up += 1;
    rows.push({ seed, value: holding.value, contributed: holding.contributed });
  }
  return { seeds, up, share: up / seeds, rows };
}

// ---------- Validation 2: no free lunch ----------

// For each option: the reference path to the decision's month, then with and without the
// option, and nothing else, through its last callback
export function noFreeLunch(seed = 1, constants = CONSTANTS) {
  const rows = [];
  for (const decision of Object.values(DECISIONS).sort((a, b) => a.month - b.month)) {
    const before = play(createState(seed, constants), (d) => (d.month < decision.month ? quietOption(d) : null), decision.month - 1, constants).state;
    // Judged only where the reference path offers the option (rule 29)
    for (const option of Object.values(offered(before, decision).options)) {
      const through = Math.max(decision.month + (option.deferred_offset_months || 0), decision.month);
      const only = (id) => (d) => (d.decision_id === decision.decision_id ? id : null);
      const withIt = getBars(play(before, only(option.option_id), through, constants).state, constants);
      const without = getBars(play(before, only(null), through, constants).state, constants);
      const delta = {
        netWorth: withIt.netWorth - without.netWorth,
        safety: withIt.safety - without.safety,
        freedom: withIt.freedom - without.freedom,
        life: withIt.life - without.life,
      };
      const EPSILON = 1e-9;
      const values = Object.values(delta);
      const noCost = values.every((v) => v >= -EPSILON);
      const noEffect = values.every((v) => Math.abs(v) <= EPSILON);
      // Skipping is not a real alternative when every option restarts salary after the layoff
      const unskippable = Object.values(decision.options).every((o) => o.restarts_salary_after_months);
      rows.push({ option: option.option_id, label: option.option_label, through, delta, noCost, noEffect, unskippable });
    }
  }
  return { rows, flagged: rows.filter((r) => r.noCost) };
}

// ---------- Validation 3: shocks are survivable ----------

export function shocksSurvivable(runs, constants = CONSTANTS) {
  // The ruled definition reads prepared players from the random runs. The maximum-saving
  // player is reported beside it, as a player who should be prepared.

  return SHOCK_DECISIONS.map((shock) => {
    let prepared = 0;
    const failures = [];
    for (const run of runs) {
      const before = run.months.find((m) => m.month === shock.month);
      if (!(before.runwayBefore >= constants.SAFETY_TARGET_MONTHS)) continue;
      prepared += 1;
      const optionId = before.chosen[shock.decision_id];
      const callback = shock.month + (DECISIONS[shock.decision_id].options[optionId].deferred_offset_months || 0);
      // Until the callback lands and, after a layoff, salary is back
      const restart = run.months.find((m) => m.month === shock.month + 1)?.restartMonth;
      const until = Math.max(callback, shock.shock === "layoff" && restart ? restart : shock.month);
      const window = run.months.filter((m) => m.month >= shock.month && m.month <= until);
      const worst = window.reduce((w, m) => (m.deepestStep > w.deepestStep ? m : w), { deepestStep: 0 });
      if (worst.deepestStep >= 4) failures.push({ seed: run.seed, month: worst.month, step: worst.deepestStep, runway: before.runwayBefore });
    }
    return { shock: `${shock.decision_id} at month ${shock.month}`, prepared, failures, pass: prepared > 0 && failures.length === 0 };
  });
}

// ---------- Validation 4: compounding is visible ----------

const SIP_MONTHLY = 5000;

function sipValue(seed, startMonth, atMonth, constants) {
  let state = createState(seed, constants);
  state.cash = 1e12; // funded, so the layoff never sells the holding
  while (state.month < startMonth) state = advanceMonth(state, constants).state;
  state.commitments.push({
    amount: -SIP_MONTHLY, months_remaining: 0, destination: "equity", opened_by: "SIP", holding_opened_by: "SIP",
    kind: "saving", opened_month: startMonth, starts_month: startMonth, term_months: null, paused_months: 0, salary_change: false,
  });
  while (state.month <= atMonth) state = advanceMonth(state, constants).state;
  const holding = state.equity.find((h) => h.opened_by === "SIP");
  return { value: holding.value, contributed: holding.contributed };
}

export function compoundingVisible(seeds = 100, early = 10, late = 40, atMonth = 240, constants = CONSTANTS) {
  const rows = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const a = sipValue(seed, early, atMonth, constants);
    const b = sipValue(seed, late, atMonth, constants);
    rows.push({ seed, early: a.value, late: b.value, gap: a.value - b.value, extraPutIn: a.contributed - b.contributed, ratio: a.value / b.value });
  }
  const sorted = (f) => rows.map(f).sort((x, y) => x - y);
  return {
    seeds,
    earlyWinsEverySeed: rows.every((r) => r.early > r.late),
    medianEarly: percentile(sorted((r) => r.early), 50),
    medianLate: percentile(sorted((r) => r.late), 50),
    medianGap: percentile(sorted((r) => r.gap), 50),
    extraPutIn: rows[0].extraPutIn,
    medianRatio: percentile(sorted((r) => r.ratio), 50),
    worstRatio: sorted((r) => r.ratio)[0],
  };
}

export function saverThroughShocks(seed = 1, constants = CONSTANTS) {
  const { choices } = maximumSavingPlay(seed, constants);
  const run = play(createState(seed, constants), (d) => choices[d.decision_id] || quietOption(d), LAST_CALLBACK_MONTH, constants);
  return SHOCK_DECISIONS.map((shock) => {
    const before = run.months.find((m) => m.month === shock.month);
    const window = run.months.filter((m) => m.month >= shock.month);
    return { shock: `${shock.decision_id} at month ${shock.month}`, runway: before.runwayBefore, deepest: Math.max(...window.map((m) => m.deepestStep)) };
  });
}
