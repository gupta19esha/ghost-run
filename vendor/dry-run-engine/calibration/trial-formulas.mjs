// Trial runs for formula proposals: the 27 September 2026 Life and Freedom options (maths
// doc section 14). Nothing here is applied. Each variant copies engine/, calibration/harness.js
// and the maths doc into a temporary folder, patches the copy's source, and measures it there.
// The real engine is never touched. A patch that no longer finds its anchor line stops the run,
// so a changed engine cannot be measured by accident.
// L3-30 and F1 were ruled and applied later on 27 September 2026, so the engine no longer has
// the lines these patches anchor on and every L and F variant now refuses to run. The file is
// kept as the record of how the proposals in maths doc section 14 were measured, and as the
// pattern for the next formula trial.
// Usage, from the project root: node calibration/trial-formulas.mjs [variant ...]
// With no names, every variant runs. About 45 seconds a variant.

import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TYPE_SEEDS = 100;
const RANDOM = 1000;

// ---------- Patches ----------

// Recurring saving paid this month: every saving commitment that pays, whatever its destination
const SAVING_PAID = {
  file: "engine/apply.js",
  anchor: "  for (const c of state.commitments) {",
  replace: "  for (const c of state.commitments) {\n    if (state.month >= c.starts_month && !(c.paused_months > 0) && c.kind === \"saving\" && c.amount < 0) state.flows.saving_paid = (state.flows.saving_paid || 0) - c.amount;",
};

// Money the player deliberately allocated to saving or investment this month. Recurring
// saving from SAVING_PAID; with `oneOffs`, each one-off into a saving or investment class
// spread over 12 months from its decision (the O2 rule of the step 7 Life study).
const SAVING_HELPERS = `
import TRIAL_DECISIONS from "./decisions.js";
const TRIAL_SAVING_CLASSES = new Set(["cash", "cash_at_home", "liquid", "locked_short", "equity", "small_cap", "gold", "retirement", "endowment", "tax_product"]);
function trialSaving(state, oneOffs) {
  let saving = state.flows.saving_paid || 0;
  if (!oneOffs) return saving;
  for (const [decisionId, optionId] of Object.entries(state.decisions_taken)) {
    const d = TRIAL_DECISIONS[decisionId];
    const age = state.month - d.month;
    if (age < 0 || age >= 12) continue;
    const o = d.options[optionId];
    for (const [amount, cls] of [[o.money_once, o.liquidity_class], [o.money_once_2, o.liquidity_class_2]]) {
      if (amount < 0 && TRIAL_SAVING_CLASSES.has(cls)) saving += -amount / 12;
    }
  }
  return saving;
}
function trialReference(state, constants) {
  return constants.SALARY_NET_START * (state.costs.normal_living / constants.NORMAL_LIVING_START);
}
`;

const DISCRETIONARY_ANCHOR = "    state.costs.living_costs - state.costs.normal_living + leak * constants.LEAK_DISCRETIONARY_SHARE;";
function discretionary(expression, oneOffs = false) {
  return [
    SAVING_PAID,
    { file: "engine/ledger.js", anchor: DISCRETIONARY_ANCHOR, replace: `    ${expression.replace(/SAVING/g, `trialSaving(state, ${oneOffs})`)};` },
    { file: "engine/ledger.js", append: SAVING_HELPERS },
  ];
}
const ABOVE_NORMAL = "(state.costs.living_costs - state.costs.normal_living)";
const shareOff = (ratio) => `${ABOVE_NORMAL} * (1 - Math.min(1, SAVING / (${ratio} * trialReference(state, constants))))`;

// Freedom against the last salary earned while there is no salary. salary_net_last_job is the
// salary at the layoff with raises folded in (section 9).
const FREEDOM_LAST_SALARY = [
  {
    file: "engine/bars.js",
    anchor: "  const committed_ratio = income_net > 0 ? committed / income_net : Infinity;",
    replace: "  const income_for_ratio = state.income.salary_net > 0 ? income_net : income_net + state.income.salary_net_last_job;\n  const committed_ratio = income_for_ratio > 0 ? committed / income_for_ratio : Infinity;",
  },
  {
    file: "engine/bars.js",
    anchor: "  const freedom = income_net > 0 ? clamp((ceiling - committed_ratio) / ceiling, 0, 1) * BAR_MAX : 0;",
    replace: "  const freedom = income_for_ratio > 0 ? clamp((ceiling - committed_ratio) / ceiling, 0, 1) * BAR_MAX : 0;",
  },
];

// Freedom held at its last salaried month's value while there is no salary
const FREEDOM_FROZEN = [
  {
    file: "engine/bars.js",
    anchor: "  const freedom = income_net > 0 ? clamp((ceiling - committed_ratio) / ceiling, 0, 1) * BAR_MAX : 0;",
    replace: "  const live = income_net > 0 ? clamp((ceiling - committed_ratio) / ceiling, 0, 1) * BAR_MAX : 0;\n  const freedom = state.income.salary_net > 0 || state.trial_frozen_freedom === undefined ? live : state.trial_frozen_freedom;",
  },
  {
    file: "engine/ledger.js",
    anchor: "  const bars = getBars(state, constants);",
    replace: "  const bars = getBars(state, constants);\n  if (state.income.salary_net > 0) state.trial_frozen_freedom = bars.freedom;",
  },
];

export const VARIANTS = {
  base: { bar: "both", patches: [], note: "The engine as it stands, after the D16-A market ruling" },
  L1: { bar: "life", patches: discretionary(`Math.max(0, ${ABOVE_NORMAL} - SAVING)`), note: "Recurring saving comes out of spending above a normal month, rupee for rupee" },
  "L2-20": { bar: "life", patches: discretionary(shareOff(0.2)), note: "Spending above normal shrinks by the share of the yardstick saved; all of it gone at 20%" },
  "L2-30": { bar: "life", patches: discretionary(shareOff(0.3)), note: "As L2-20, all of it gone at 30%" },
  "L3-30": { bar: "life", patches: discretionary(shareOff(0.3), true), note: "As L2-30, also counting one-offs into saving or investment, spread over 12 months" },
  F1: { bar: "freedom", patches: FREEDOM_LAST_SALARY, note: "Committed ratio against the last salary earned while there is no salary" },
  F2: { bar: "freedom", patches: FREEDOM_FROZEN, note: "Freedom frozen at its last salaried value while there is no salary" },
  F3: { bar: "freedom", patches: [], naWithoutSalary: true, note: "Freedom not applicable while there is no salary; the league score spreads its 0.20 over the other three bars" },
};

function buildCopy(patches) {
  const dir = mkdtempSync(join(tmpdir(), "trial-formulas-"));
  cpSync(join(ROOT, "engine"), join(dir, "engine"), { recursive: true });
  cpSync(join(ROOT, "calibration", "harness.js"), join(dir, "calibration", "harness.js"));
  cpSync(join(ROOT, "SIMULATION-MATHS.md"), join(dir, "SIMULATION-MATHS.md"));
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module" }));
  for (const p of patches) {
    const file = join(dir, p.file);
    let src = readFileSync(file, "utf8");
    if (p.append) {
      src += p.append;
    } else {
      const count = src.split(p.anchor).length - 1;
      if (count !== 1) throw new Error(`Patch anchor found ${count} times in ${p.file}: ${p.anchor}`);
      src = src.replace(p.anchor, () => p.replace);
    }
    writeFileSync(file, src);
  }
  return dir;
}

// ---------- Measuring ----------

async function measure(name) {
  const variant = VARIANTS[name];
  const dir = buildCopy(variant.patches);
  try {
    const H = await import(pathToFileURL(join(dir, "calibration", "harness.js")).href);
    const targets = H.readTargets();
    const bench = targets.league.find((l) => l.month === H.CHAPTER_END);

    // Freedom is null for a month with no salary under F3, and the league score reweights
    const na = variant.naWithoutSalary;
    const barsOf = (run, month) => {
      const m = run.months.find((x) => x.month === month);
      return na && !m.employed ? { ...m.bars, freedom: null } : m.bars;
    };
    const score = (b) => {
      if (b.freedom !== null) return H.leagueScore(b, bench).score;
      const { nwIndex } = H.leagueScore(b, bench);
      return (0.35 * nwIndex + 0.25 * b.safety + 0.2 * b.life) / 0.8;
    };

    const med = (values) => H.percentile(values.filter((v) => v !== null).sort((a, b) => a - b), 50);
    const types = {};
    for (const type of H.PLAYER_TYPES) {
      const runs = Array.from({ length: TYPE_SEEDS }, (_, i) => H.typePlaythrough(type, i + 1));
      types[type] = {};
      for (const month of [21, 24]) {
        const seed1 = barsOf(runs[0], month);
        types[type][month] = {
          life: seed1.life, freedom: seed1.freedom, netWorth: seed1.netWorth, score: month === 24 ? score(seed1) : null,
          medLife: med(runs.map((r) => barsOf(r, month).life)),
          medFreedom: med(runs.map((r) => barsOf(r, month).freedom)),
          naShare: na ? runs.filter((r) => barsOf(r, month).freedom === null).length / TYPE_SEEDS : 0,
        };
      }
    }

    const randomRuns = Array.from({ length: RANDOM }, (_, i) => H.randomPlaythrough(i + 1));
    const random = {};
    for (const month of [21, 24]) {
      const all = randomRuns.map((r) => barsOf(r, month));
      const pct = (f, p) => { const v = all.map(f).filter((x) => x !== null).sort((a, b) => a - b); return v.length ? H.percentile(v, p) : null; };
      random[month] = {
        life: [10, 50, 90].map((p) => pct((b) => b.life, p)),
        freedom: [10, 50, 90].map((p) => pct((b) => b.freedom, p)),
        lifeAtFloor: all.filter((b) => b.life <= 40 + 1e-9).length / RANDOM,
        freedomZero: all.filter((b) => b.freedom === 0).length / RANDOM,
        freedomNA: all.filter((b) => b.freedom === null).length / RANDOM,
      };
    }

    // Validation 1: the maximum saver against every random player, at month 24
    const saver = H.typePlaythrough("maximum saving", 1);
    const saverScore = score(barsOf(saver, 24));
    const scored = randomRuns.map((r) => ({ seed: r.seed, score: score(barsOf(r, 24)) })).sort((a, b) => b.score - a.score);
    const v1 = { saverScore, top: scored[0], beatenBy: scored.filter((s) => s.score > saverScore).length };

    // Validation 2, as the harness defines it
    const v2 = H.noFreeLunch(1);
    const gains = v2.flagged.filter((r) => !r.noEffect && !r.unskippable).map((r) => r.option);
    const lifeDelta = Object.fromEntries(v2.rows.map((r) => [r.option, r.delta.life]));
    const freedomDelta = Object.fromEntries(v2.rows.map((r) => [r.option, r.delta.freedom]));

    return { name, note: variant.note, bar: variant.bar, types, random, v1, v2: { gains, lifeDelta, freedomDelta } };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(VARIANTS);
for (const name of names) {
  if (!VARIANTS[name]) throw new Error(`No variant ${name}. Variants: ${Object.keys(VARIANTS).join(", ")}`);
  const started = Date.now();
  const result = await measure(name);
  console.log(JSON.stringify({ ...result, seconds: Math.round((Date.now() - started) / 1000) }));
}
