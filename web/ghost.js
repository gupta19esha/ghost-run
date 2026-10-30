// The ghost screen: a finished life (web/demo/save.json), and the life it would have been with
// one choice changed. Another screen of the same game: Daylight tokens, Baloo 2, the game's card
// shapes, from the game's own stylesheets. Everything shown is computed here, in the browser,
// by the engine in vendor/ through runner/, agent/ and verify/. No model is called.
//
// Two views, by the address: the run (#), and a fork (#fork/<choice index>/<option id>).

import { readRun, forkView, checkAttempts, costList, surpriseList, surpriseWords, reasons, markedDraft, BAR_KEYS, BAR_NAMES, optionLabel } from "./ghost-model.js";
import { formatMoney, formatRupees } from "../vendor/dry-run-engine/text/render.js";
import { FORMATS } from "../verify/render.js";
import { animate, count, later, tween, reduced, stopAll, CSS_EASE } from "./motion.js";
import { h, ghostMark, chart, hideGhost, drawGhost, legend, track, moveBar, arrive } from "./ui.js";
import { sound, buzz, isMuted, setMuted } from "./sound.js";

const app = document.getElementById("app");
const money = (n) => formatMoney(n);
const short = (n) => `${n < 0 ? "−" : ""}₹${formatRupees(Math.abs(n))}`;

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

// The card the player tapped to fork, so the fork screen can move it into place: the choice is
// the hinge between the two screens
let hinge = null;
const goFork = (index, option, event = null) => {
  hinge = event?.currentTarget ? { rect: event.currentTarget.getBoundingClientRect(), option } : null;
  location.hash = `#fork/${index}/${option}`;
};

let runShown = false;
function runView() {
  const end = run.end;
  const first = !runShown;
  runShown = true;
  const screen = h("section", { class: "screen ghost-screen", "data-screen": "run" });

  // The chapter at a glance: a tick for each month, every one closed
  const ticks = h("ol", { class: "ticks", "aria-label": `${run.months.length} of 24 months closed` },
    Array.from({ length: 24 }, (_, i) => h("li", { class: `tick${i < run.months.length ? " is-closed" : ""}` })));
  const worth = h("p", { class: "home-net-worth money tabular" }, money(end.netWorth));
  const gain = end.netWorth - run.startNetWorth;
  const gainText = h("span", { class: "tabular" }, money(Math.abs(gain)));
  const bars = BAR_KEYS.map((k) => h("div", { class: "gbar" }, h("span", { class: "gbar-name" }, BAR_NAMES[k]), track(end[k])));

  screen.append(
    h("header", { class: "ghost-head" },
      h("div", { class: "brand" }, ghostMark(22), "Ghost Run"),
      h("p", { class: "month-label" }, "Chapter one · finished"),
      h("h1", { class: "ghost-title" }, "Two years. You are 24."),
      ticks,
      h("p", { class: "ghost-lede" }, "A whole life, already played. Pick any choice in it and watch the ghost live the same two years the other way.")),
    h("div", { class: "ghost-worth" },
      h("p", { class: "month-label" }, "Net worth"),
      worth,
      h("span", { class: `chip chip-large move-${gain >= 0 ? "up" : "down"}` }, `${gain >= 0 ? "▲" : "▼"} `, gainText, " over two years")),
    h("div", { class: "card chart-card" }, chart({ real: run.bars }), legend(end.netWorth)),
    h("div", { class: "gbars" }, bars),
  );

  // The first time the run is shown, it plays in: the ticks light month by month, the figures
  // count up from where the life began, the bars fill. Coming back to it, it is simply there
  const play = () => {
    if (!first) return;
    [...ticks.children].forEach((tick, i) => later(120 + i * 28, () => lightTick(tick)));
    // The chapter closing: one chord as the last tick lights, not one for every month
    later(120 + 23 * 28, () => sound.close());
    count(worth, run.startNetWorth, end.netWorth, money, { duration: 700 });
    count(gainText, 0, Math.abs(gain), money, { duration: 700 });
    bars.forEach((bar, i) => moveBar(bar.querySelector(".gbar-track"), 0, end[BAR_KEYS[i]], { delay: 200 + i * 90 }));
  };

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
      h("button", { type: "button", class: "option list-item", "data-choose": "", onclick: (e) => goFork(f.monthIndex, f.option, e) },
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
        h("button", { type: "button", class: "option", "data-choose": "", onclick: (e) => goFork(c.index, a.option, e) }, a.label))))));
    const row = h("button", { type: "button", class: "month-row", "aria-expanded": "false", "data-month": String(m.month),
      onclick: () => {
        const open = detail.hidden;
        detail.hidden = !open;
        row.setAttribute("aria-expanded", String(open));
      } },
      h("span", { class: `month-num${first ? "" : " is-closed"}` }, String(m.month)),
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

  // Each month's tick lights, with its pulse, as the list brings it into view
  let observer = null;
  if (first && typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const delay = Number(entry.target.closest(".month-row").dataset.month) % 6 * 40;
        later(delay, () => lightTick(entry.target));
      }
    }, { threshold: 0.6 });
    for (const num of months.querySelectorAll(".month-num")) observer.observe(num);
  } else if (first) {
    for (const num of months.querySelectorAll(".month-num")) num.classList.add("is-closed");
  }

  return { screen, play, cleanup: () => { listeners.delete(redraw); observer?.disconnect(); } };
}

// A month's tick lighting as the month closes: it takes the closed colour with a short pulse
function lightTick(tick) {
  tick.classList.add("is-closed");
  animate(tick, [{ transform: "scale(1)" }, { transform: "scale(1.35)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 360, easing: "ease-out", fill: "none" });
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
  const { result } = view;
  const screen = h("section", { class: "screen ghost-screen", "data-screen": "fork" });

  screen.append(
    h("div", { class: "fork-top" },
      h("button", { type: "button", class: "back", onclick: () => { location.hash = ""; } }, "‹ Your run"),
      h("div", { class: "brand" }, ghostMark(20), "Ghost Run")),
    h("p", { class: "month-label" }, `What if · Month ${view.month}`));
  const ghostCard = h("div", { class: "ghost-card" }, view.ghost.label);
  const forkChart = chart({ real: result.real.bars, ghost: result.ghost.bars, split: view.month, marks: view.notices.map((n) => n.month) });
  const chartLegend = legend(view.compare[0].real, view.compare[0].ghost);
  const legendGhost = chartLegend.querySelectorAll("b")[1];
  screen.append(
    h("div", { class: "pair" },
      h("p", { class: "pair-label" }, "You chose"),
      h("div", { class: "chosen" }, view.real.label),
      h("p", { class: "pair-label is-ghost" }, ghostMark(16), "The ghost chose"),
      ghostCard),
    h("div", { class: "card chart-card" }, forkChart, chartLegend),
  );

  const notices = new Map();
  if (view.notices.length) {
    screen.append(h("div", { class: "notices" }, view.notices.map((n) => {
      const el = h("p", { class: "notice" }, h("i", { class: "notice-mark", "aria-hidden": "true" }), n.text);
      notices.set(n.month, el);
      return el;
    })));
  }

  const nw = view.compare[0];
  const ghostFigure = h("p", { class: "compare-figure ghost-figure tabular" }, money(nw.ghost));
  const gapLine = h("span", { class: "tabular" }, nw.gap);
  const rows = view.compare.slice(1).map((c) => {
    const label = h("span", { class: "gbar-gap tabular" }, c.gap === "level" ? "Level" : `Ghost ${c.gap}`);
    const realTrack = track(c.real);
    const ghostTrack = track(c.ghost, true);
    return { c, label, realTrack, ghostTrack, el: h("div", { class: "gbar" }, h("div", { class: "gbar-head" }, h("span", { class: "gbar-name" }, c.name), label), realTrack, ghostTrack) };
  });
  const compare = h("section", { class: "ghost-section" },
    h("h2", { class: "section-title" }, `Month ${view.endMonth}`),
    h("div", { class: "compare-worth" },
      h("div", {}, h("p", { class: "month-label" }, "You"), h("p", { class: "compare-figure money tabular" }, money(nw.real))),
      h("div", { class: "is-ghost" }, h("p", { class: "month-label" }, "Ghost"), ghostFigure)),
    h("p", { class: "compare-gap" }, "The ghost has ", gapLine, "."),
    h("div", { class: "gbars" }, rows.map((r) => r.el)));
  screen.append(compare);

  // The sequence: the ghost card moves into place from where it was tapped, the ghost line draws
  // itself, and when it is done the month 24 comparison comes in, real bars, then the ghost's.
  // A tap at any point lands on the end of it
  const gapOf = (c) => c.ghost - c.real;
  const play = (from) => {
    hideGhost(forkChart);
    legendGhost.textContent = money(nw.real);
    if (from) flyFrom(ghostCard, from);
    for (const el of notices.values()) el.style.opacity = reduced() ? "" : "0";
    for (const child of compare.children) child.style.opacity = reduced() ? "" : "0";
    for (const r of rows) {
      r.ghostTrack.style.opacity = reduced() ? "" : "0";
      if (!reduced()) r.label.textContent = "Level";
    }
    later(260, () => drawGhost(forkChart, {
      progress: (p) => { legendGhost.textContent = money(nw.real + (nw.ghost - nw.real) * p); },
      onRing: (ring) => { const el = notices.get(ring.month); if (el) arrive(el, { distance: 8 }); },
      done: () => {
        sound.ghost();
        // A notice whose month the line never passed still arrives, with the comparison
        for (const el of notices.values()) if (el.style.opacity === "0") arrive(el, { distance: 8 });
        buzz([8, 60, 8]);
        [...compare.children].forEach((child, i) => arrive(child, { delay: i * 70 }));
        count(ghostFigure, nw.real, nw.ghost, money, { duration: 600 });
        tween({ duration: 600, update: (p) => { gapLine.textContent = FORMATS.net_worth_gap((nw.ghost - nw.real) * p); } });
        rows.forEach((r, i) => {
          moveBar(r.realTrack, 0, r.c.real, { delay: 120 + i * 80 });
          // The ghost's hatched bar draws in after the real ones, from the real value to its own
          later(520 + i * 120, () => {
            r.ghostTrack.style.opacity = "";
            animate(r.ghostTrack, [{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
            moveBar(r.ghostTrack, r.c.real, r.c.ghost, { onStart: (rise) => (rise ? sound.rise : sound.fall)() });
            const gap = gapOf(r.c);
            tween({ duration: gap >= 0 ? 500 : 360, update: (p) => {
              const v = gap * p;
              r.label.textContent = Math.round(Math.abs(v)) === 0 ? "Level" : `Ghost ${FORMATS[`${r.c.key}_gap`](v)}`;
            } });
          });
        });
      },
    }));
  };

  // The narration: asked of api/narrate.js, then every attempt it made checked here by verify()
  const card = h("div", { class: "card narration" },
    h("p", { class: "month-label" }, "Narration"),
    h("p", { class: "narration-wait" }, ghostMark(18), "The narrator is writing, and every attempt is being checked…"));
  screen.append(h("section", { class: "ghost-section" }, card),
    h("div", { class: "fork-foot" },
      h("button", { type: "button", class: "action", onclick: () => { location.hash = ""; } }, "Back to your run")));
  let gone = false;
  requestNarration(index, option)
    .then((served) => { if (!gone) card.replaceChildren(...narrationCard(view, checkAttempts(result, served))); })
    .catch((error) => {
      if (gone) return;
      card.replaceChildren(
        h("p", { class: "month-label" }, "Narration"),
        h("p", { class: "narration-text is-missing" }, error.message));
    });
  return { screen, play, cleanup: () => { gone = true; } };
}

// FLIP: the element starts where the tapped card was and moves to where it is now
function flyFrom(el, rect) {
  const now = el.getBoundingClientRect();
  if (!now.width || !rect.width) return;
  const dx = rect.left - now.left, dy = rect.top - now.top;
  const sx = rect.width / now.width, sy = rect.height / now.height;
  animate(el, [
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, borderStyle: "solid" },
    { transform: "translate(0, 0) scale(1, 1)" },
  ], { duration: 460, easing: CSS_EASE.out });
}

// Asks the server to narrate a fork of the demo life: every attempt it made, in order
async function requestNarration(index, option) {
  let response;
  try {
    response = await fetch("/api/narrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seed: save.seed, choices: save.choices, monthIndex: index, option }),
    });
  } catch {
    throw new Error("The narrator could not be reached.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ? `${data.error}.` : `The narrator answered ${response.status}.`);
  return data.attempts;
}

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
function toggleFor(target, show, hide) {
  const button = h("button", { type: "button", class: "text-toggle", "aria-expanded": "false",
    onclick: () => {
      target.hidden = !target.hidden;
      button.setAttribute("aria-expanded", String(!target.hidden));
      button.textContent = target.hidden ? show : hide;
    } }, show);
  return button;
}

// The card's contents once the attempts are in and checked
function narrationCard(view, checked) {
  record(view, checked);
  const { accepted, rejected, attempts } = checked;

  // The accepted narration. A same-money fork's first sentence is its headline
  let lead = null;
  let body = checked.rendered;
  if (checked.rendered && view.sameMoney) {
    const cut = checked.rendered.indexOf(". ") + 1;
    lead = checked.rendered.slice(0, cut);
    body = checked.rendered.slice(cut + 1);
  }

  const figures = accepted && h("ul", { class: "figures", hidden: true }, accepted.figures.map((f) =>
    h("li", {}, h("code", {}, `{${f.token}}`), " ", h("span", {}, FORMATS[f.token](f.value)))));

  const rejectedList = rejected.map((a) => {
    const draft = h("p", { class: "draft", hidden: true },
      markedDraft(a.narration, a.failures).map((part) => (part.mark ? h("mark", {}, part.text) : part.text)));
    return h("li", { class: "attempt" },
      h("p", { class: "attempt-head" }, h("b", {}, "✕"), ` Attempt ${a.number} · rejected`,
        h("span", { class: "attempt-rules" }, a.failures.map((f) => f.rule).filter((r, i, all) => all.indexOf(r) === i).join(", "))),
      h("ul", { class: "reasons" }, reasons(a).map((r) => h("li", {}, r.text))),
      toggleFor(draft, "Show the draft", "Hide the draft"),
      draft);
  });

  return [
    h("p", { class: "month-label" }, "Narration"),
    lead && h("p", { class: "narration-lead" }, lead),
    checked.rendered
      ? h("p", { class: "narration-text" }, body)
      : h("p", { class: "narration-text is-missing" }, `No attempt passed in ${plural(attempts.length, "try", "tries")}, so there is nothing to show.`),
    h("div", { class: `verdict ${accepted ? "is-ok" : "is-bad"}` },
      accepted
        ? h("p", { class: "verdict-line" }, h("b", {}, "✓"),
          ` Accepted on attempt ${accepted.number} of ${attempts.length}. ${plural(accepted.figures.length, "figure", "figures")} checked against the simulation.`)
        : h("p", { class: "verdict-line" }, h("b", {}, "✕"), ` None of ${plural(attempts.length, "attempt", "attempts")} passed.`),
      h("p", { class: `rejected-count${rejected.length ? " has-some" : ""}` },
        rejected.length ? `${plural(rejected.length, "attempt", "attempts")} rejected` : "No attempts rejected on this fork"),
      rejectedList.length > 0 && h("ol", { class: "attempts" }, rejectedList),
      !checked.agrees && h("p", { class: "verdict-warning" }, "This browser's check disagrees with the server's on at least one attempt. The browser's verdict is shown."),
      h("p", { class: "verdict-note" },
        "Every attempt the narrator made is checked again by verify() in this browser, against this fork, and kept, passed or not. ",
        "A rejected attempt's reasons went back to the narrator before it tried again."),
      h("p", { class: "verdict-tally" }, tallyLine()),
      figures && toggleFor(figures, "Show the figures", "Hide the figures"),
      figures),
  ].filter(Boolean);
}

// ---------- The attempt record ----------

// Every attempt on every fork opened this session, kept by fork so reopening one does not count
// it twice
const attemptLog = new Map();
function record(view, checked) {
  attemptLog.set(`${view.monthIndex}:${view.ghost.option}`, checked.attempts.map((a) => ({ number: a.number, ok: a.ok, rules: a.failures.map((f) => f.rule) })));
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
  stopAll();
  const next = match ? { name: "fork", ...forkScreen(Number(match[1]), match[2]) } : { name: "run", ...runView() };
  const forward = next.name === "fork";
  const from = forward && hinge && hinge.option === match[2] ? hinge.rect : null;
  hinge = null;
  app.replaceChildren(next.screen);
  window.scrollTo(0, next.name === "run" ? runScroll : 0);
  // Into a fork moves forward, back to the run moves back. The card that was tapped is not part
  // of the move: it travels on its own, from where it was
  if (current) {
    for (const child of next.screen.children) {
      if (from && child.classList.contains("pair")) continue;
      animate(child, [{ opacity: 0, transform: `translateX(${forward ? 28 : -28}px)` }, { opacity: 1, transform: "translateX(0)" }],
        { duration: 300, easing: CSS_EASE.out });
    }
  }
  current = next;
  next.play?.(from);
}

// The mute control: always on screen, in the dock at the foot, sound on until the player turns it off
function muteControl() {
  const button = h("button", { type: "button", class: "mute", "data-silent": "" });
  const draw = () => {
    const off = isMuted();
    button.setAttribute("aria-pressed", String(off));
    button.setAttribute("aria-label", off ? "Sound is off. Turn sound on" : "Sound is on. Turn sound off");
    button.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor"/>${off
      ? '<path d="M16 9.5l5 5M21 9.5l-5 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
      : '<path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>'}</svg><span>${off ? "Off" : "On"}</span>`;
  };
  button.addEventListener("click", () => {
    setMuted(!isMuted());
    draw();
    sound.tap();
  });
  draw();
  return h("div", { class: "dock" }, h("div", { class: "dock-inner" }, button));
}

// Every button taps; choosing a fork confirms, with a short buzz where the device can
document.addEventListener("click", (event) => {
  const button = event.target.closest?.("button");
  if (!button || button.hasAttribute("data-silent")) return;
  if (button.hasAttribute("data-choose")) {
    sound.confirm();
    buzz(12);
  } else {
    sound.tap();
  }
});

async function main() {
  try {
    save = await (await fetch(new URL("./demo/save.json", import.meta.url))).json();
    run = readRun(save);
  } catch (error) {
    app.replaceChildren(h("p", { class: "ghost-error" }, `The demo life could not load: ${error.message}`));
    return;
  }
  document.body.append(muteControl());
  window.addEventListener("hashchange", route);
  route();
  startRanking();
}

main();
