// The landing page at the site root. Its words are in web/index.html; this adds the rest:
// - the opening: the month arrives the way the game's landing opens, its lines rising one after
//   another (vendor/dry-run-engine/LANDING-MOTION.md, direction E), the drawing, the situation,
//   then the option cards
// - month 7 of the demo life, playable: the result line and the month close for whichever option
//   is tapped, every figure from the engine (web/landing-model.js), at the game's own timing
// - the game's drawings, in the hero and on the tiles, popping in as they come on screen, and
//   chapter one's 24 ticks lighting in turn
// - a ghost, drawing itself from the split month when it comes on screen
// - the chapter two sign-up, which is connected to nothing (see signup below)
//
// Motion is web/motion.js's: a tap finishes it, and with reduced motion on everything is simply
// there. The page makes no sound.

import { monthPreview, monthOutcome, landingFork, BAR_KEYS, BAR_NAMES } from "./landing-model.js";
import { formatMoney } from "../vendor/dry-run-engine/text/render.js";
import { illustration } from "../vendor/dry-run-engine/game/screens/illustrations.js";
import { direction, arrow } from "../vendor/dry-run-engine/game/screens/moves.js";
import { animate, count, later, reduced, CSS_EASE } from "./motion.js";
import { h, ghostMark, chart, hideGhost, drawGhost, legend, arrive } from "./ui.js";

const money = (n) => formatMoney(n);
const rise = (el, delay, distance = 12) =>
  animate(el, [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: "translateY(0)" }], { duration: 420, delay, easing: CSS_EASE.out });

// ---------- The game's drawings ----------

// Every [data-illo] placeholder gets the game's own drawing for that decision, in full colour
function drawings() {
  for (const holder of document.querySelectorAll("[data-illo]")) {
    const block = illustration(holder.dataset.illo, "full");
    // The hero's band is shorter than the drawing's shape on most phones. The game fits the whole
    // drawing and lets the block's colour fill the sides, which leaves the edges of a shape that
    // runs off the drawing floating in the band; here the drawing fills the band and gives up a
    // little of its top and foot instead, where there is only ground
    if (holder.classList.contains("lp-illo")) block.querySelector("svg")?.setAttribute("preserveAspectRatio", "xMidYMid slice");
    holder.append(block);
  }
}

// ---------- Coming on screen ----------

function whenSeen(el, then, threshold = 0.2) {
  if (typeof IntersectionObserver !== "function") return then();
  const observer = new IntersectionObserver((entries) => {
    if (!entries.some((e) => e.isIntersecting)) return;
    observer.disconnect();
    then();
  }, { threshold });
  observer.observe(el);
}

// Each section's parts rise into place one after another the first time it comes on screen;
// the tiles pop in, and chapter one's months light in turn
function sections() {
  for (const section of document.querySelectorAll("[data-reveal]")) {
    const parts = [...section.children];
    if (!reduced()) for (const part of parts) part.style.opacity = "0";
    whenSeen(section, () => parts.forEach((part, i) => arrive(part, { delay: i * 80 })), 0.12);
  }
  const tiles = [...document.querySelectorAll(".lp-tile")];
  if (!reduced()) for (const tile of tiles) tile.style.opacity = "0";
  whenSeen(document.querySelector(".lp-tiles"), () => tiles.forEach((tile, i) => later(150 + i * 110, () => {
    tile.style.opacity = "";
    animate(tile, [{ opacity: 0, transform: "translateY(14px) scale(0.94)" }, { opacity: 1, transform: "translateY(0) scale(1)" }], { duration: 380, easing: CSS_EASE.land });
  })), 0.25);
  const ticks = document.querySelector(".lp-ticks");
  whenSeen(ticks, () => [...ticks.children].forEach((tick, i) => later(150 + i * 45, () => {
    tick.classList.add("is-closed");
    animate(tick, [{ transform: "scale(1)" }, { transform: "scale(1.35)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 360, easing: "ease-out", fill: "none" });
  })), 0.8);
}

// ---------- The month, playable ----------

function monthDemo(save) {
  const hero = document.querySelector("[data-month]");
  const choice = hero.querySelector(".lp-choice");
  const after = hero.querySelector(".lp-after");
  const preview = monthPreview(save);
  const byId = new Map(preview.options.map((option) => [option.id, option]));

  // The options, as the decision screen has them: the same neutral cards, no colour on any
  const bind = () => {
    for (const button of choice.querySelectorAll("[data-option]")) button.addEventListener("click", () => answer(byId.get(button.dataset.option)));
  };
  function ask() {
    after.replaceChildren();
    choice.replaceChildren(h("div", { class: "options" }, preview.options.map((option) =>
      h("button", { type: "button", class: "option", "data-option": option.id }, option.label))));
    bind();
    choice.scrollIntoView({ block: "center", behavior: reduced() ? "auto" : "smooth" });
  }

  // The chosen card stays, the result line lands, and the month runs: net worth counts from where
  // the month found it, and each bar moves, teal up, vermilion down, as the game's month close
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
    after.replaceChildren(...[result, close,
      h("p", { class: "lp-next-month" }, `Month ${outcome.month + 1} comes tomorrow.`),
      h("button", { type: "button", class: "close-button lp-again", onclick: ask }, "Try another option")].filter(Boolean));

    if (result) arrive(result, { distance: 8 });
    arrive(close, { delay: 300 });
    // The month close's own timing: the count 1.2s easing out, the bars waiting 0.2s then moving
    later(300, () => {
      count(worth, outcome.before.netWorth, outcome.after.netWorth, money, { duration: 1200 });
      for (const [fill, from, to] of fills) {
        fill.style.width = `${to}%`;
        animate(fill, [{ width: `${from}%` }, { width: `${to}%` }], { duration: 900, delay: 200, easing: CSS_EASE.out });
      }
    });
    close.scrollIntoView({ block: "nearest", behavior: reduced() ? "auto" : "smooth" });
  }
  bind();
}

// The month arriving, about 1.2s, once: the band's lines rise one after another, the drawing
// comes up, then the situation and the cards
function opening() {
  const band = document.querySelector(".lp-band-deep");
  const lines = [band.querySelector(".lp-month-line"), band.querySelector(".lp-salary")];
  lines.forEach((line, i) => rise(line, 80 + i * 110));
  animate(band.querySelector(".lp-illo"), [{ opacity: 0, transform: "scale(0.96)" }, { opacity: 1, transform: "scale(1)" }], { duration: 520, delay: 260, easing: CSS_EASE.out });
  rise(document.querySelector(".lp-situation"), 520);
  document.querySelectorAll(".lp-choice .option").forEach((card, i) => rise(card, 680 + i * 90, 16));
}

// ---------- A ghost ----------

function ghostDemo(holder, save) {
  const view = landingFork(save);
  const nw = view.compare[0];
  const drawing = chart({ real: view.result.real.bars, ghost: view.result.ghost.bars, split: view.month, marks: view.notices.map((n) => n.month) });
  const chartLegend = legend(nw.real, nw.ghost);
  const legendGhost = chartLegend.querySelectorAll("b")[1];
  holder.append(
    h("p", { class: "month-label" }, `Month ${view.month}`),
    h("p", { class: "lp-ghost-situation" }, view.situation),
    h("div", { class: "pair" },
      h("p", { class: "pair-label" }, "You chose"),
      h("div", { class: "chosen" }, view.real.label),
      h("p", { class: "pair-label is-ghost" }, ghostMark(16), "Your ghost chose"),
      h("div", { class: "ghost-card" }, view.ghost.label)),
    h("div", { class: "card chart-card" }, drawing, chartLegend),
    // The proof, where it is shown rather than argued
    h("p", { class: "lp-proof" }, "Both lines come from the game's simulator, not a language model."),
    h("p", { class: "lp-gap" }, `At 24, your ghost has ${nw.gap}.`),
    h("ul", { class: "lp-gap-chips" }, view.compare.slice(1).map((c) =>
      h("li", { class: "lp-gap-chip" }, h("b", {}, c.name), ` ${c.gap === "level" ? "level" : c.gap}`))));

  // Undrawn until it is on screen, then the line draws itself from the split month, the legend's
  // figure keeping pace
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
  drawings();
  if (!reduced()) opening();
  sections();
  signup(document.querySelector("[data-signup]"));

  const ghostHolder = document.querySelector("[data-ghost]");
  let save;
  try {
    save = await (await fetch(new URL("./demo/save.json", import.meta.url))).json();
  } catch (error) {
    document.querySelector(".lp-after").replaceChildren(h("p", { class: "lp-wait" }, `The month could not load: ${error.message}`));
    return;
  }
  try { monthDemo(save); } catch (error) {
    document.querySelector(".lp-after").replaceChildren(h("p", { class: "lp-wait" }, `The month could not load: ${error.message}`));
  }
  try { ghostDemo(ghostHolder, save); } catch (error) {
    ghostHolder.replaceChildren(h("p", { class: "lp-wait" }, `The ghost could not load: ${error.message}`));
  }
}

main();
