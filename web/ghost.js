// The ghost screen: a finished life (web/demo/save.json), and the life it would have been with
// one choice changed. Another screen of the same game: Daylight tokens, Baloo 2, the game's card
// shapes, from the game's own stylesheets. Everything shown is computed here, in the browser,
// by the engine in vendor/ through runner/, agent/ and verify/. No model is called.
//
// Two views, by the address: the run (#), and a fork (#fork/<choice index>/<option id>).

import { readRun, forkView, costList, surpriseList, surpriseWords, reasons, markedDraft, BAR_KEYS, BAR_NAMES, optionLabel } from "./ghost-model.js";
import { formatMoney, formatRupees } from "../vendor/dry-run-engine/text/render.js";
import { FORMATS } from "../verify/render.js";

const app = document.getElementById("app");
const SVG = "http://www.w3.org/2000/svg";

// ---------- Elements ----------

function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === "class") el.className = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  el.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
  return el;
}
function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

// The ghost's mark: a small rounded ghost, in the ghost's blue
function ghostMark(size = 18) {
  const svg = s("svg", { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", class: "ghost-mark" });
  svg.innerHTML = `<path d="M12 2.5c-4.7 0-8 3.4-8 8.1v10.2c0 .6.7.9 1.1.5l1.9-1.6 2 1.7c.4.3.9.3 1.3 0l1.7-1.5 1.7 1.5c.4.3.9.3 1.3 0l2-1.7 1.9 1.6c.4.4 1.1.1 1.1-.5V10.6c0-4.7-3.3-8.1-8-8.1z" fill="var(--ghost-fill)" stroke="var(--ghost)" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9.2" cy="10.5" r="1.4" fill="var(--ghost)"/><circle cx="14.8" cy="10.5" r="1.4" fill="var(--ghost)"/>`;
  return svg;
}

const money = (n) => formatMoney(n);
const short = (n) => `${n < 0 ? "−" : ""}₹${formatRupees(Math.abs(n))}`;

// ---------- The chart ----------

// Net worth by month. real: [{month, netWorth}]. ghost: the same, or null. split: the month the
// ghost's choice was made. marks: months where the ghost could not take the real choice
function chart({ real, ghost = null, split = null, marks = [] }) {
  const W = 342, H = 214, L = 6, R = 6, T = 30, B = 26;
  const all = [...real, ...(ghost ?? [])].map((b) => b.netWorth);
  let lo = Math.min(0, ...all), hi = Math.max(...all);
  const pad = (hi - lo) * 0.08 || 1;
  lo -= lo < 0 ? pad : 0; hi += pad;
  const x = (m) => L + ((m - 1) / 23) * (W - L - R);
  const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const path = (rows) => rows.map((b, i) => `${i ? "L" : "M"}${x(b.month).toFixed(1)} ${y(b.netWorth).toFixed(1)}`).join(" ");

  const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img" });
  svg.setAttribute("aria-label", ghost ? "Net worth by month, your run and the ghost's" : "Net worth by month");

  // Grid: zero, and the months a chapter is read in
  if (lo < 0) svg.append(s("line", { x1: L, x2: W - R, y1: y(0), y2: y(0), class: "chart-zero" }));
  for (const m of [1, 6, 12, 18, 24]) {
    svg.append(s("line", { x1: x(m), x2: x(m), y1: T, y2: H - B, class: "chart-grid" }));
    const t = s("text", { x: x(m), y: H - 8, class: "chart-axis", "text-anchor": m === 1 ? "start" : m === 24 ? "end" : "middle" });
    t.textContent = m === 1 ? "Month 1" : String(m);
    svg.append(t);
  }

  // The split: where the two lives part
  if (split !== null) {
    svg.append(s("line", { x1: x(split), x2: x(split), y1: T - 4, y2: H - B, class: "chart-split" }));
    const label = `Split · month ${split}`;
    const w = label.length * 6.2 + 16;
    const lx = Math.min(Math.max(x(split) - w / 2, 0), W - w);
    svg.append(s("rect", { x: lx, y: 2, width: w, height: 20, rx: 10, class: "chart-split-pill" }));
    const t = s("text", { x: lx + w / 2, y: 16, class: "chart-split-text", "text-anchor": "middle" });
    t.textContent = label;
    svg.append(t);
  }

  svg.append(s("path", { d: `${path(real)} L${x(real.at(-1).month)} ${H - B} L${x(real[0].month)} ${H - B} Z`, class: "chart-real-area" }));
  // The ghost from the month before it split, so it leaves the real line rather than starting in the air
  if (ghost) {
    const from = ghost.filter((b) => b.month >= Math.max(1, split - 1));
    svg.append(s("path", { d: path(from), class: "chart-ghost-halo" }));
    svg.append(s("path", { d: path(real), class: "chart-real" }));
    svg.append(s("path", { d: path(from), class: "chart-ghost" }));
    for (const m of marks) {
      const b = ghost.find((g) => g.month === m);
      if (b) svg.append(s("circle", { cx: x(m), cy: y(b.netWorth), r: 7, class: "chart-mark" }));
    }
    const g = ghost.at(-1);
    svg.append(s("circle", { cx: x(g.month), cy: y(g.netWorth), r: 4.5, class: "chart-ghost-end" }));
  } else {
    svg.append(s("path", { d: path(real), class: "chart-real" }));
  }
  const r = real.at(-1);
  svg.append(s("circle", { cx: x(r.month), cy: y(r.netWorth), r: 4.5, class: "chart-real-end" }));
  return svg;
}

function legend(realEnd, ghostEnd = null) {
  return h("div", { class: "legend" },
    h("span", { class: "legend-item" }, h("i", { class: "swatch swatch-real" }), "You ", h("b", { class: "tabular" }, money(realEnd))),
    ghostEnd !== null && h("span", { class: "legend-item" }, h("i", { class: "swatch swatch-ghost" }), "Ghost ", h("b", { class: "tabular" }, money(ghostEnd))));
}

// A bar from 0 to 100: the real run's solid, the ghost's hatched
function track(value, ghost = false) {
  return h("div", { class: `gbar-track${ghost ? " is-ghost" : ""}` },
    h("div", { class: "gbar-fill", style: `width: ${Math.max(0, Math.min(100, value)).toFixed(1)}%` }));
}

// ---------- The run ----------

let save = null;
let run = null;
let ranked = null;      // rank summaries, once the worker is done
let progress = null;    // { done, total } while it works
const listeners = new Set();

function startRanking() {
  const worker = new Worker(new URL("./rank-worker.js", import.meta.url), { type: "module" });
  worker.onmessage = ({ data }) => {
    if (data.type === "progress") progress = { done: data.done, total: data.total };
    else { ranked = data.forks; worker.terminate(); }
    for (const fn of listeners) fn();
  };
  worker.onerror = (e) => { progress = { error: e.message || "The ranking could not run" }; for (const fn of listeners) fn(); };
  worker.postMessage(save);
}

const goFork = (index, option) => { location.hash = `#fork/${index}/${option}`; };

function runView() {
  const end = run.end;
  const screen = h("section", { class: "screen ghost-screen", "data-screen": "run" });

  screen.append(
    h("header", { class: "ghost-head" },
      h("div", { class: "brand" }, ghostMark(22), "Ghost Run"),
      h("p", { class: "month-label" }, "Chapter one · finished"),
      h("h1", { class: "ghost-title" }, "Two years. You are 24."),
      h("p", { class: "ghost-lede" }, "A whole life, already played. Pick any choice in it and watch the ghost live the same two years the other way.")),
    h("div", { class: "ghost-worth" },
      h("p", { class: "month-label" }, "Net worth"),
      h("p", { class: "home-net-worth money" }, money(end.netWorth)),
      h("span", { class: `chip chip-large move-${end.netWorth >= run.startNetWorth ? "up" : "down"}` },
        `${end.netWorth >= run.startNetWorth ? "▲" : "▼"} ${money(Math.abs(end.netWorth - run.startNetWorth))} over two years`)),
    h("div", { class: "card chart-card" }, chart({ real: run.bars }), legend(end.netWorth)),
    h("div", { class: "gbars" }, BAR_KEYS.map((k) => h("div", { class: "gbar" },
      h("span", { class: "gbar-name" }, BAR_NAMES[k]), track(end[k])))),
  );

  // The two lists
  const lists = h("div", { class: "lists" });
  const which = { open: null };
  const listBody = h("div", { class: "list-body" });
  const tabs = [
    ["cost", "Cost you the most", "The choices whose other road ends richest"],
    ["surprise", "You wouldn't guess", "Where something moved that money doesn't show"],
  ].map(([key, title, caption]) => {
    const tab = h("button", { type: "button", class: "list-tab", "aria-expanded": "false",
      onclick: () => { which.open = which.open === key ? null : key; drawLists(); } },
      h("span", { class: "list-tab-title" }, title), h("span", { class: "list-tab-caption" }, caption));
    tab.dataset.key = key;
    return tab;
  });
  lists.append(h("div", { class: "list-tabs" }, tabs), listBody);

  function drawLists() {
    for (const tab of tabs) {
      tab.setAttribute("aria-expanded", String(tab.dataset.key === which.open));
      tab.classList.toggle("is-open", tab.dataset.key === which.open);
    }
    listBody.replaceChildren();
    if (!which.open) return;
    if (!ranked) {
      listBody.append(h("p", { class: "list-wait" }, ghostMark(18),
        progress?.error ? `The ranking could not run: ${progress.error}` :
          progress ? `Living every other life: ${progress.done} of ${progress.total}` : "Living every other life…"));
      return;
    }
    const items = which.open === "cost" ? costList(ranked) : surpriseList(ranked);
    listBody.append(h("ol", { class: "list" }, items.map((f) => h("li", {},
      h("button", { type: "button", class: "option list-item", onclick: () => goFork(f.monthIndex, f.option) },
        h("span", { class: "list-month" }, `Month ${f.month}`),
        h("span", { class: "list-what" }, `${optionLabel(f.option)}`),
        h("span", { class: "list-instead" }, `instead of “${optionLabel(f.real)}”`),
        h("span", { class: "list-why" }, which.open === "cost"
          ? `The ghost ends ${money(f.features.end.netWorth)} richer`
          : surpriseWords(f.reason, f.features.end)))))));
  }
  const redraw = () => { if (which.open && document.body.contains(listBody)) drawLists(); };
  listeners.add(redraw);

  screen.append(
    h("section", { class: "ghost-section" },
      h("h2", { class: "section-title" }, "What if?"),
      h("p", { class: "section-lede" }, "Two ways in: the choices that cost you most, or the ones you would never guess mattered."),
      lists));

  // Every month
  const months = h("ol", { class: "months" }, run.months.map((m) => {
    const detail = h("div", { class: "month-detail", hidden: true }, m.choices.map((c) => h("div", { class: "month-choice" },
      h("p", { class: "month-situation" }, c.situation),
      h("div", { class: "chosen" }, c.chosen.label),
      h("p", { class: "or-label" }, "Fork it:"),
      h("div", { class: "options" }, c.alternatives.map((a) =>
        h("button", { type: "button", class: "option", onclick: () => goFork(c.index, a.option) }, a.label))))));
    const row = h("button", { type: "button", class: "month-row", "aria-expanded": "false",
      onclick: () => {
        const open = detail.hidden;
        detail.hidden = !open;
        row.setAttribute("aria-expanded", String(open));
      } },
      h("span", { class: "month-num" }, String(m.month)),
      h("span", { class: "month-text" },
        h("span", { class: "month-summary" }, m.summary ?? `Month ${m.month}`),
        h("span", { class: "month-chose" }, m.choices.map((c) => c.chosen.label).join(" · "))),
      h("span", { class: "month-worth tabular" }, short(run.bars.find((b) => b.month === m.month).netWorth)));
    return h("li", { class: "month" }, row, detail);
  }));
  screen.append(h("section", { class: "ghost-section" },
    h("h2", { class: "section-title" }, "Every month"),
    h("p", { class: "section-lede" }, "Tap a month to see what you chose, and fork it."),
    months),
  h("p", { class: "ghost-foot" }, "Educational simulation. Not investment advice."));

  return { screen, cleanup: () => listeners.delete(redraw) };
}

// ---------- A fork ----------

function forkScreen(index, option) {
  let view;
  try {
    view = forkView(save, index, option);
  } catch (error) {
    return { screen: h("section", { class: "screen ghost-screen" },
      h("p", { class: "ghost-error" }, `That fork cannot be run: ${error.message}`),
      h("button", { type: "button", class: "close-button", onclick: () => { location.hash = ""; } }, "Back to your run")) };
  }
  const { result, accepted } = view;
  const screen = h("section", { class: "screen ghost-screen", "data-screen": "fork" });

  screen.append(
    h("div", { class: "fork-top" },
      h("button", { type: "button", class: "back", onclick: () => { location.hash = ""; } }, "‹ Your run"),
      h("div", { class: "brand" }, ghostMark(20), "Ghost Run")),
    h("p", { class: "month-label" }, `What if · Month ${view.month}`),
    h("div", { class: "pair" },
      h("p", { class: "pair-label" }, "You chose"),
      h("div", { class: "chosen" }, view.real.label),
      h("p", { class: "pair-label is-ghost" }, ghostMark(16), "The ghost chose"),
      h("div", { class: "ghost-card" }, view.ghost.label)),
    h("div", { class: "card chart-card" },
      chart({ real: result.real.bars, ghost: result.ghost.bars, split: view.month, marks: view.notices.map((n) => n.month) }),
      legend(view.compare[0].real, view.compare[0].ghost)),
  );

  if (view.notices.length) {
    screen.append(h("div", { class: "notices" }, view.notices.map((n) =>
      h("p", { class: "notice" }, h("i", { class: "notice-mark", "aria-hidden": "true" }), n.text))));
  }

  const nw = view.compare[0];
  screen.append(h("section", { class: "ghost-section" },
    h("h2", { class: "section-title" }, `Month ${view.endMonth}`),
    h("div", { class: "compare-worth" },
      h("div", {}, h("p", { class: "month-label" }, "You"), h("p", { class: "compare-figure money tabular" }, money(nw.real))),
      h("div", { class: "is-ghost" }, h("p", { class: "month-label" }, "Ghost"), h("p", { class: "compare-figure ghost-figure tabular" }, money(nw.ghost)))),
    h("p", { class: "compare-gap" }, `The ghost has ${nw.gap}.`),
    h("div", { class: "gbars" }, view.compare.slice(1).map((c) => h("div", { class: "gbar" },
      h("div", { class: "gbar-head" }, h("span", { class: "gbar-name" }, c.name), h("span", { class: "gbar-gap" }, c.gap === "level" ? "Level" : `Ghost ${c.gap}`)),
      track(c.real), track(c.ghost, true))))));

  // The narration, and every attempt at it: verify()'s verdict on each, in this browser
  record(view);
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  const toggleFor = (target, show, hide) => {
    const button = h("button", { type: "button", class: "text-toggle", "aria-expanded": "false",
      onclick: () => {
        target.hidden = !target.hidden;
        button.setAttribute("aria-expanded", String(!target.hidden));
        button.textContent = target.hidden ? show : hide;
      } }, show);
    return button;
  };

  // The accepted narration. A same-money fork's first sentence is its headline
  let lead = null;
  let body = view.rendered;
  if (view.rendered && view.sameMoney) {
    const cut = view.rendered.indexOf(". ") + 1;
    lead = view.rendered.slice(0, cut);
    body = view.rendered.slice(cut + 1);
  }

  const figures = accepted && h("ul", { class: "figures", hidden: true }, accepted.figures.map((f) =>
    h("li", {}, h("code", {}, `{${f.token}}`), " ", h("span", {}, FORMATS[f.token](f.value)))));

  const rejectedList = view.rejected.map((a) => {
    const draft = h("p", { class: "draft", hidden: true },
      markedDraft(a.narration, a.failures).map((part) => (part.mark ? h("mark", {}, part.text) : part.text)));
    return h("li", { class: "attempt" },
      h("p", { class: "attempt-head" }, h("b", {}, "✕"), ` Attempt ${a.number} · rejected`,
        h("span", { class: "attempt-rules" }, a.failures.map((f) => f.rule).filter((r, i, all) => all.indexOf(r) === i).join(", "))),
      h("ul", { class: "reasons" }, reasons(a).map((r) => h("li", {}, r.text))),
      toggleFor(draft, "Show the draft", "Hide the draft"),
      draft);
  });

  const total = view.attempts.length;
  screen.append(h("section", { class: "ghost-section" },
    h("div", { class: "card narration" },
      h("p", { class: "month-label" }, "Narration · placeholder"),
      lead && h("p", { class: "narration-lead" }, lead),
      view.rendered
        ? h("p", { class: "narration-text" }, body)
        : h("p", { class: "narration-text is-missing" }, "No attempt passed, so there is nothing to show."),
      h("div", { class: `verdict ${accepted ? "is-ok" : "is-bad"}` },
        accepted
          ? h("p", { class: "verdict-line" }, h("b", {}, "✓"),
            ` Accepted on attempt ${accepted.number} of ${total}. ${plural(accepted.figures.length, "figure", "figures")} checked against the simulation.`)
          : h("p", { class: "verdict-line" }, h("b", {}, "✕"), ` None of ${plural(total, "attempt", "attempts")} passed.`),
        h("p", { class: `rejected-count${view.rejected.length ? " has-some" : ""}` },
          view.rejected.length ? `${plural(view.rejected.length, "attempt", "attempts")} rejected` : "No attempts rejected on this fork"),
        rejectedList.length > 0 && h("ol", { class: "attempts" }, rejectedList),
        h("p", { class: "verdict-note" },
          "Every attempt is checked by verify() in this browser, against this fork, and kept, passed or not. ",
          "No model has written anything yet: the rejected drafts are deliberate rehearsals of the mistakes a model will make."),
        h("p", { class: "verdict-tally" }, tallyLine()),
        figures && toggleFor(figures, "Show the figures", "Hide the figures"),
        figures))),
  h("div", { class: "fork-foot" },
    h("button", { type: "button", class: "action", onclick: () => { location.hash = ""; } }, "Back to your run")));
  return { screen };
}

// ---------- The attempt record ----------

// Every attempt on every fork opened this session, kept by fork so reopening one does not count
// it twice
const attemptLog = new Map();
function record(view) {
  attemptLog.set(`${view.monthIndex}:${view.ghost.option}`, view.attempts.map((a) => ({ number: a.number, ok: a.ok, rules: a.failures.map((f) => f.rule) })));
}
function tallyLine() {
  const all = [...attemptLog.values()].flat();
  const rejected = all.filter((a) => !a.ok).length;
  return `This session: ${attemptLog.size} ${attemptLog.size === 1 ? "fork" : "forks"} narrated, ${all.length} ${all.length === 1 ? "attempt" : "attempts"} checked, ${rejected} rejected.`;
}

// ---------- Routing ----------

let current = null;
let runScroll = 0;
function route() {
  const match = location.hash.match(/^#fork\/(\d+)\/([A-Z0-9]+-[A-Z])$/);
  if (current?.name === "run") runScroll = window.scrollY;
  current?.cleanup?.();
  const next = match ? { name: "fork", ...forkScreen(Number(match[1]), match[2]) } : { name: "run", ...runView() };
  app.replaceChildren(next.screen);
  current = next;
  window.scrollTo(0, next.name === "run" ? runScroll : 0);
}

async function main() {
  try {
    save = await (await fetch(new URL("./demo/save.json", import.meta.url))).json();
    run = readRun(save);
  } catch (error) {
    app.replaceChildren(h("p", { class: "ghost-error" }, `The demo life could not load: ${error.message}`));
    return;
  }
  window.addEventListener("hashchange", route);
  route();
  startRanking();
}

main();
