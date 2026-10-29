// Trial, not applied (FIRST-SESSION.md 15.2): Balanced by habits. The middle option on net worth at month 24,
// except it never takes an option that, right after it is applied, commits more than 60% of
// income or leaves under one month of runway. If the middle option crosses a limit it takes the
// nearest option that does not; if every option crosses one, it takes the options crossing the
// fewest limits and, among them, the one nearest the middle.
import { play, quietOption, percentile, CHAPTER_END } from "./harness.js";
import { createState, getBars, applyDecision } from "../engine/index.js";
import { explainSafety, explainFreedom } from "../engine/bars.js";
const COMMITTED_LIMIT = 0.6, RUNWAY_LIMIT = 1;
const moves = (o) => Math.abs((o.money_once || 0) + (o.money_once_2 || 0)) + 24 * Math.abs((o.money_monthly || 0) + (o.money_monthly_2 || 0)) + (o.card_balance || 0);
const fallbacks = {};
function picker(log) {
  return (decision, state) => {
    const opts = Object.values(decision.options).map((o, i) => {
      const after = applyDecision(state, decision.decision_id, o.option_id).state;
      const nw24 = getBars(play(after, (d) => quietOption(d), CHAPTER_END).state).netWorth;
      const ratio = explainFreedom(after).committed_ratio, runway = explainSafety(after).runway_months;
      const crosses = (ratio > COMMITTED_LIMIT ? 1 : 0) + (runway < RUNWAY_LIMIT ? 1 : 0);
      return { o, i, nw24, crosses };
    });
    const v = opts.map((x) => x.nw24); const mid = (Math.min(...v) + Math.max(...v)) / 2;
    const fewest = Math.min(...opts.map((x) => x.crosses));
    if (fewest > 0 && log) fallbacks[decision.decision_id] = (fallbacks[decision.decision_id] || 0) + 1;
    return opts.filter((x) => x.crosses === fewest)
      .sort((a, b) => Math.abs(a.nw24 - mid) - Math.abs(b.nw24 - mid) || moves(a.o) - moves(b.o) || a.i - b.i)[0].o.option_id;
  };
}
const rows = [];
const SEEDS = Number(process.argv[2] || 100);
for (let seed = 1; seed <= SEEDS; seed++) {
  const run = play(createState(seed), picker(true), 24);
  const at = (m) => run.months.find((x) => x.month === m).bars;
  rows.push({ b21: at(21), b24: at(24), chosen: Object.assign({}, ...run.months.map((m) => m.chosen)) });
}
const med = (f) => percentile(rows.map(f).sort((a, b) => a - b), 50);
const r = (n) => Math.round(n).toLocaleString("en-IN");
for (const m of [21, 24]) console.log(`month ${m}: NW ${r(med((x) => x[`b${m}`].netWorth))}, Safety ${med((x) => x[`b${m}`].safety).toFixed(1)}, Freedom ${med((x) => x[`b${m}`].freedom).toFixed(1)}, Life ${med((x) => x[`b${m}`].life).toFixed(1)}`);
console.log("seed 1 choices:", Object.values(rows[0].chosen).join(" "));
console.log(`decisions where every option crossed a limit (count of ${SEEDS} seeds):`, JSON.stringify(fallbacks));
