// The landing page at the site root. Its copy is in web/index.html; this adds what needs the
// simulation and the motion:
// - the opening: the mark's ticks draw round and the first nine light, as the game's landing
//   does, and the title's lines rise in (vendor/dry-run-engine/LANDING-MOTION.md, A and E)
// - each section rises into place as it comes on screen; chapter one's 24 ticks light in turn
// - month 7 of the demo life, playable: the month card, the decision, the result line and the
//   month close for whichever option is tapped, every figure from the engine (web/landing-model.js)
// - a ghost, drawing itself from the split month when it comes on screen
// - the chapter two sign-up, which is connected to nothing (see signup below)
//
// Motion is web/motion.js's: a tap finishes it, and with reduced motion on everything is simply
// there. The page makes no sound.

import { monthPreview, monthOutcome, landingFork, SHOWN_DECISION, BAR_KEYS, BAR_NAMES } from "./landing-model.js";
import { formatMoney } from "../vendor/dry-run-engine/text/render.js";
import { illustration } from "../vendor/dry-run-engine/game/screens/illustrations.js";
import { direction, arrow } from "../vendor/dry-run-engine/game/screens/moves.js";
import { animate, count, later, reduced, CSS_EASE } from "./motion.js";
import { h, s, ghostMark, chart, hideGhost, drawGhost, legend, arrive } from "./ui.js";

// ---------- The opening ----------

// The game's mark: 24 ticks round a circle, one for each month of chapter one, the first nine in
// marigold. The same drawing as vendor/dry-run-engine/design/dry-run-mark.svg
function mark() {
  const svg = s("svg", { width: 88, height: 88, viewBox: "0 0 118 118", fill: "none" });
  svg.append(s("circle", { cx: 59, cy: 59, r: 59, fill: "var(--deep)" }));
  const ticks = s("g", { "stroke-width": 5, "stroke-linecap": "round" });
  for (let i = 0; i < 24; i++) {
    const angle = ((i * 15 - 90) * Math.PI) / 180;
    const [c, n] = [Math.cos(angle), Math.sin(angle)];
    ticks.append(s("line", { pathLength: 1, x1: 59 + c * 30, y1: 59 + n * 30, x2: 59 + c * 49, y2: 59 + n * 49,
      stroke: i < 9 ? "var(--marigold)" : "var(--slate-dim)", "stroke-dasharray": 1, class: i < 9 ? "lp-tick lit" : "lp-tick" }));
  }
  svg.append(ticks, s("circle", { cx: 59, cy: 59, r: 17, fill: "var(--bone)" }));
  return svg;
}

function opening() {
  const holder = document.querySelector(".lp-mark");
  const svg = mark();
  holder.append(svg);
  // The title's lines rise one after another, the lede and the facts follow, then the ticks draw
  // round and the first nine turn marigold: about 1.8s, once
  document.querySelectorAll(".lp-title-line").forEach((line, i) =>
    animate(line, [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 420, delay: i * 110, easing: CSS_EASE.out }));
  for (const [i, el] of [document.querySelector(".lp-lede"), document.querySelector(".lp-facts")].entries()) {
    animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 420, delay: 380 + i * 100, easing: "ease-out" });
  }
  svg.querySelectorAll(".lp-tick").forEach((tick, i) => {
    animate(tick, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 240, delay: 600 + i * 30, easing: "ease-out" });
    if (tick.classList.contains("lit")) {
      animate(tick, [{ stroke: "var(--slate-dim)" }, { stroke: "var(--marigold)" }], { duration: 260, delay: 1340 + i * 50, easing: "ease-out" });
    }
  });
}

// ---------- Sections arriving ----------

// Each section's parts rise into place, one after another, the first time it comes on screen.
// then() runs at the same moment, for anything in the section with its own motion
function whenSeen(el, then, threshold = 0.2) {
  if (typeof IntersectionObserver !== "function") return then();
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    then();
  }, { threshold });
  observer.observe(el);
}

function sections() {
  for (const section of document.querySelectorAll("[data-reveal]")) {
    const parts = [...section.children];
    if (!reduced()) for (const part of parts) part.style.opacity = "0";
    whenSeen(section, () => parts.forEach((part, i) => arrive(part, { delay: i * 70 })), 0.12);
  }
  // Chapter one's months, lighting one after another
  const ticks = document.querySelector(".lp-ticks");
  whenSeen(ticks, () => [...ticks.children].forEach((tick, i) => later(250 + i * 45, () => {
    tick.classList.add("is-closed");
    animate(tick, [{ transform: "scale(1)" }, { transform: "scale(1.35)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 360, easing: "ease-out", fill: "none" });
  })), 0.6);
}

// ---------- A month, playable ----------

const money = (n) => formatMoney(n);

function monthDemo(holder, save) {
  const preview = monthPreview(save);
  const card = h("div", { class: "lp-month-card" },
    h("p", { class: "month-line" }, `Month ${preview.month}. You are ${preview.age}.`),
    preview.salary && h("p", { class: "salary-line" }, "Salary credited. ", h("span", { class: "money" }, preview.salary), " in."));
  const decision = h("div", { class: "lp-decision" },
    illustration(SHOWN_DECISION, "full"),
    h("div", { class: "lp-decision-body" },
      h("p", { class: "month-label" }, `Month ${preview.month}`),
      h("p", { class: "lp-situation" }, preview.situation)));
  const choice = h("div", { class: "lp-choice" });
  const after = h("div", { class: "lp-after" });
  holder.replaceChildren(card, decision, choice, after);

  // The options, as the decision screen has them: the same neutral cards, no colour on any
  function ask() {
    after.replaceChildren();
    choice.replaceChildren(h("div", { class: "options" }, preview.options.map((option) =>
      h("button", { type: "button", class: "option", onclick: () => answer(option) }, option.label))));
  }

  // The chosen card stays, the result line lands, and the month runs: net worth counts from
  // where the month found it, and each bar moves, teal up, vermilion down, as the game's close
  function answer(option) {
    const outcome = monthOutcome(save, preview.index, option.id);
    choice.replaceChildren(h("div", { class: "chosen" }, option.label));
    const result = option.line ? h("p", { class: "lp-result" }, option.line) : null;

    const change = outcome.after.netWorth - outcome.before.netWorth;
    const dir = direction(change);
    const worth = h("p", { class: "net-worth money tabular" }, money(outcome.before.netWorth));
    const fills = [];
    const bars = h("div", { class: "close-bars" }, BAR_KEYS.map((key) => {
      const fill = h("div", { class: "close-bar-fill", style: `width: ${outcome.before[key]}%; transition: none` });
      fills.push([fill, outcome.before[key], outcome.after[key]]);
      const danger = key === "safety" && outcome.danger;
      return h("div", { class: `close-bar move-${direction(outcome.after[key] - outcome.before[key])}${danger ? " danger" : ""}` },
        h("span", { class: "close-bar-name" }, BAR_NAMES[key]),
        h("div", { class: "close-bar-track" }, fill));
    }));
    const close = h("div", { class: "lp-close" },
      h("p", { class: "month-label" }, `Month ${outcome.month} closed`),
      worth,
      dir !== "flat" && h("div", { class: `chip chip-large move-${dir}` }, arrow(dir), h("span", { class: "tabular" }, money(Math.abs(change)))),
      bars);
    const again = h("button", { type: "button", class: "close-button lp-again", onclick: ask }, "Try another option");
    after.replaceChildren(...[result, close,
      h("p", { class: "lp-note" }, "In the game you live with it, and every month after builds on it. Here you can try the others."),
      again].filter(Boolean));

    if (result) arrive(result, { distance: 8 });
    arrive(close, { delay: 350 });
    // The month close's own timing: the count 1.2s easing out, the bars waiting 0.2s then moving
    later(350, () => {
      count(worth, outcome.before.netWorth, outcome.after.netWorth, money, { duration: 1200 });
      for (const [fill, from, to] of fills) {
        fill.style.width = `${to}%`;
        animate(fill, [{ width: `${from}%` }, { width: `${to}%` }], { duration: 900, delay: 200, easing: CSS_EASE.out });
      }
    });
  }
  ask();
}

// ---------- A ghost ----------

function ghostDemo(holder, save) {
  const view = landingFork(save);
  const nw = view.compare[0];
  const drawing = chart({ real: view.result.real.bars, ghost: view.result.ghost.bars, split: view.month, marks: view.notices.map((n) => n.month) });
  const chartLegend = legend(nw.real, nw.ghost);
  const legendGhost = chartLegend.querySelectorAll("b")[1];
  const bars = view.compare.slice(1).map((c) => `${c.name} ${c.gap === "level" ? "level" : c.gap}`).join(" · ");
  holder.append(
    h("p", { class: "month-label" }, `Month ${view.month}`),
    h("p", { class: "lp-situation" }, view.situation),
    h("div", { class: "pair" },
      h("p", { class: "pair-label" }, "You chose"),
      h("div", { class: "chosen" }, view.real.label),
      h("p", { class: "pair-label is-ghost" }, ghostMark(16), "The ghost chose"),
      h("div", { class: "ghost-card" }, view.ghost.label)),
    h("div", { class: "card chart-card" }, drawing, chartLegend),
    h("p", { class: "lp-gap" }, `By month ${view.endMonth}, the ghost has ${nw.gap}.`),
    h("p", { class: "lp-gap-bars" }, bars),
    h("p", { class: "lp-note" }, "Neither life is the right one. Both are what the same two years could have been."));

  // Undrawn until it is on screen, then the line draws itself from the split month, the
  // legend's figure keeping pace
  hideGhost(drawing);
  if (!reduced()) legendGhost.textContent = money(nw.real);
  whenSeen(drawing, () => later(250, () => drawGhost(drawing, {
    progress: (p) => { legendGhost.textContent = money(nw.real + (nw.ghost - nw.real) * p); },
  })), 0.6);
}

// ---------- Chapter two ----------

// The chapter two sign-up is connected to nothing. There is no backend: an address typed here is
// not sent anywhere and not stored, and the page says exactly that rather than showing a success
// that did not happen. Connecting it needs somewhere to send the address and, before that, a line
// on this page saying what the address is used for.
function signup(form) {
  const input = form.querySelector("input");
  const status = form.querySelector(".lp-form-status");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!input.value.trim() || !input.checkValidity()) {
      status.textContent = "That doesn't look like an email address.";
      return;
    }
    status.textContent = "Sign-up isn't connected yet, so your email wasn't sent or saved. Chapter one is ready to play now.";
  });
}

// ---------- Start ----------

async function main() {
  if (!reduced()) opening();
  else document.querySelector(".lp-mark").append(mark());
  sections();
  signup(document.querySelector("[data-signup]"));

  const monthHolder = document.querySelector("[data-month]");
  const ghostHolder = document.querySelector("[data-ghost]");
  let save;
  try {
    save = await (await fetch(new URL("./demo/save.json", import.meta.url))).json();
  } catch (error) {
    monthHolder.replaceChildren(h("p", { class: "lp-month-wait" }, `The month could not load: ${error.message}`));
    return;
  }
  try { monthDemo(monthHolder, save); } catch (error) {
    monthHolder.replaceChildren(h("p", { class: "lp-month-wait" }, `The month could not load: ${error.message}`));
  }
  try { ghostDemo(ghostHolder, save); } catch (error) {
    ghostHolder.replaceChildren(h("p", { class: "lp-month-wait" }, `The ghost could not load: ${error.message}`));
  }
}

main();
