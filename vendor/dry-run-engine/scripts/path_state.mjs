// What a player actually has at decisions whose copy states a figure or assumes a state, on
// the path that takes each decision's quietest option except the one fixed. Used for the copy
// audit in FIRST-SESSION.md section 8.2. Usage: node scripts/path_state.mjs
import { createState, applyDecision, advanceMonth, decisionsForMonth, getBars } from "../engine/index.js";
import { savedTotal } from "../engine/bars.js";
import D from "../engine/decisions.js";

const moves = (o) => Math.abs(o.money_once || 0) + 24 * Math.abs(o.money_monthly || 0);
const quiet = (d) => Object.values(d.options).sort((a, b) => moves(a) - moves(b))[0].option_id;
function at(target, fixed) {
  let s = createState(1);
  for (;;) {
    for (const d of decisionsForMonth(s)) {
      if (d.decision_id === target) return s;
      s = applyDecision(s, d.decision_id, fixed[d.decision_id] || quiet(d)).state;
    }
    s = advanceMonth(s).state;
  }
}
const ctc = (s) => ((s.income.salary_net + s.commitments.filter((c) => c.kind === "income" && c.salary_change).reduce((t, c) => t + c.amount, 0)) * 52000 / 41300 * 12 / 1e5).toFixed(2);
const r = (n) => Math.round(n).toLocaleString("en-IN");

for (const d2 of ["D02-A", "D02-B", "D02-C"]) {
  for (const t of ["D03", "D07", "D08", "D16", "D19", "D22"]) {
    const s = at(t, { D02: d2 });
    console.log(d2, t, "cash", r(s.cash), "| saved", r(savedTotal(s)), "| NW", r(getBars(s).netWorth), "| debts", s.debts.map((x) => `${x.type}:${r(x.principal)}`).join(" ") || "none");
  }
}
for (const d13 of ["D13-A", "D13-B", "D13-C"]) console.log(d13, "CTC at D26, LPA", ctc(at("D26", { D13: d13 })));
for (const d26 of ["D26-A", "D26-B", "D26-C"]) {
  const before = at("D26", { D26: d26 });
  const s = at("D27", { D26: d26 });
  console.log(d26, "CTC before D26", ctc(before), "at D27", ctc(s));
}
for (const d11 of ["D11-A", "D11-C"]) console.log(d11, "debts at D21", at("D21", { D11: d11 }).debts.map((x) => `${x.type}:${r(x.principal)}`).join(" ") || "none");
console.log("quiet D16:", quiet(D.D16), "quiet D26:", quiet(D.D26), "quiet D17:", quiet(D.D17), "quiet D13:", quiet(D.D13), "quiet D11:", quiet(D.D11));
