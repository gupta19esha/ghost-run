// Trial runs for calibration proposals. Nothing here is applied: it runs the 1,000 random
// playthroughs, the D16-A check, three player types and maximum saving on a changed copy of
// section 12, a changed equity drift, or changed sheet cells, and prints one JSON line each.
// With "types": true a config also reports the four player types, as medians over seeds 1 to
// 100 at months 21 and 24, and the share of each that reaches family money by month 24.
// Usage, from the project root:
//   node calibration/trial.mjs '[{"name":"leak 0.1","c":{"CASH_LEAK_RATE":0.1}}]'
// A config is {name, c: constants, drift: {from, to, value} (broad equity monthly drift),
// patch: [{opt, field, value}] (sheet cells). About 45 seconds a config.
import CONSTANTS from "../engine/constants.js";
import DECISIONS from "../engine/decisions.js";
import MARKET from "../engine/market-script.js";
import { readTargets, randomPlaythrough, percentile, leagueScore, typePlaythrough, firstInvestmentUp, maximumSavingPlay, PLAYER_TYPES } from "./harness.js";
const targets = readTargets(); const bench = targets.league.find((l) => l.month === 24);
const rup = (n) => Math.round(n).toLocaleString("en-IN");
const eqDrift = MARKET.instruments.equity.monthly_drift.slice();
const CONFIGS = JSON.parse(process.argv[2]);
for (const cfg of CONFIGS) {
  const { name, c = {}, drift, patch = [], types: allTypes = false } = cfg;
  const saved = patch.map((x) => [x, DECISIONS[x.opt.split("-")[0]].options[x.opt][x.field]]);
  for (const x of patch) DECISIONS[x.opt.split("-")[0]].options[x.opt][x.field] = x.value;
  const constants = Object.freeze({ ...CONSTANTS, ...c });
  MARKET.instruments.equity.monthly_drift.splice(0, 240, ...eqDrift);
  if (drift) for (let m = drift.from; m <= drift.to; m++) MARKET.instruments.equity.monthly_drift[m - 1] = drift.value;
  const runs = []; for (let s = 1; s <= 1000; s++) runs.push(randomPlaythrough(s, constants));
  const q = (m, f, p) => percentile(runs.map((r) => f(r.barsAt[m])).sort((a, b) => a - b), p);
  const sh = (m, f) => Math.round((100 * runs.filter((r) => f(r.barsAt[m])).length) / 1000);
  const step5 = Math.round(runs.filter((r) => r.months.some((m) => m.month <= 24 && m.deepestStep >= 5)).length / 10);
  const step5m1 = Math.round(runs.filter((r) => r.months.find((m) => m.month === 1).deepestStep >= 5).length / 10);
  const d16 = firstInvestmentUp(200, constants);
  const types = ["cautious", "spender", "balanced"].map((t) => { const b = typePlaythrough(t, 1, constants).barsAt[24]; return `${t[0]}:${rup(b.netWorth)}/S${Math.round(b.safety)}`; }).join(" ");
  const saver = maximumSavingPlay(1, constants); const ss = leagueScore(saver.bars, bench).score;
  const best = Math.max(...runs.map((r) => leagueScore(r.bars24, bench).score));
  const typeReport = {};
  if (allTypes) {
    for (const t of PLAYER_TYPES) {
      const rs = Array.from({ length: 100 }, (_, i) => typePlaythrough(t, i + 1, constants));
      const med = (m, f) => percentile(rs.map((r) => f(r.barsAt[m])).sort((a, b) => a - b), 50);
      typeReport[t] = {};
      for (const m of [21, 24]) typeReport[t][m] = { nw: Math.round(med(m, (b) => b.netWorth)), s: +med(m, (b) => b.safety).toFixed(1), f: +med(m, (b) => b.freedom).toFixed(1), l: +med(m, (b) => b.life).toFixed(1) };
      typeReport[t].step5 = Math.round(rs.filter((r) => r.months.some((m) => m.month <= 24 && m.deepestStep >= 5)).length);
    }
  }
  console.log(JSON.stringify({ typeReport, name, nw21: rup(q(21, (b) => b.netWorth, 50)), nw24: rup(q(24, (b) => b.netWorth, 50)), nw24p90: rup(q(24, (b) => b.netWorth, 90)), pin21: sh(21, (b) => Math.abs(b.safety - 30) < 1e-9), pin24: sh(24, (b) => Math.abs(b.safety - 30) < 1e-9), s50_21: q(21, (b) => b.safety, 50).toFixed(1), s50_24: q(24, (b) => b.safety, 50).toFixed(1), step5, step5m1, d16up: Math.round(100 * d16.share), types, saverMinusBest: (ss - best).toFixed(1), saverNW: rup(saver.bars.netWorth) }));
  for (const [x, v] of saved) DECISIONS[x.opt.split("-")[0]].options[x.opt][x.field] = v;
}
