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
import { h, s, ghostMark, chart, hideGhost, drawGhost, legend, arrive } from "./ui.js";

const money = (n) => formatMoney(n);
const rise = (el, delay, distance = 12) =>
  animate(el, [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: "translateY(0)" }], { duration: 420, delay, easing: CSS_EASE.out });

// ---------- The game's drawings ----------

// Every [data-illo] placeholder gets the game's own drawing for that decision, in full colour
function drawings() {
  for (const holder of document.querySelectorAll("[data-illo]")) {
    holder.append(illustration(holder.dataset.illo, "full"));
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

  // The options, as the decision screen has them: the same neutral cards, no colour on any. They
  // all stay where they are once one is chosen: the chosen one takes the game's chosen colours and tick, and
  // tapping another shows what it would have done. Nothing above the player's thumb changes
  // height, so the page never moves under it
  const buttons = [...choice.querySelectorAll("[data-option]")];
  for (const button of buttons) {
    button.addEventListener("click", () => {
      if (button.classList.contains("is-chosen")) return;
      for (const other of buttons) {
        other.classList.toggle("is-chosen", other === button);
        other.setAttribute("aria-pressed", String(other === button));
      }
      answer(byId.get(button.dataset.option));
    });
  }

  // The chosen card stays, the result line lands, and the month runs: net worth counts from where
  // the month found it, and each bar moves, teal up, vermilion down, as the game's month close
  function answer(option) {
    const outcome = monthOutcome(save, preview.index, option.id);
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
      h("p", { class: "lp-try" }, "Tap another card to see what it would have done.")].filter(Boolean));

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
  }
}

// The month arriving, about 1.4s, once: the band's lines rise one after another, the first salary
// comes up over the horizon, the road's first month lights, then the situation and the cards
function opening() {
  const band = document.querySelector(".lp-band-deep");
  const lines = [band.querySelector(".lp-month-line"), band.querySelector(".lp-salary")];
  lines.forEach((line, i) => rise(line, 80 + i * 110));
  animate(band.querySelector(".lp-art-coin"), [{ transform: "translateY(60px)" }, { transform: "translateY(0)" }], { duration: 900, delay: 200, easing: CSS_EASE.out });
  animate(band.querySelector(".lp-art-month.is-lit"), [{ fill: "var(--deep-muted)" }, { fill: "var(--marigold)" }], { duration: 300, delay: 950, easing: "ease-out" });
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

// ---------- How far through ----------

// The game's mark, as the desktop field shows it: 24 ticks round a circle, one for each month of
// chapter one (vendor/dry-run-engine/design/dry-run-mark.svg). Its months light as the page is read
function railMark() {
  const svg = s("svg", { viewBox: "0 0 118 118", fill: "none", width: 132, height: 132 });
  svg.append(s("circle", { cx: 59, cy: 59, r: 59, fill: "var(--deep)" }));
  const ticks = [];
  for (let i = 0; i < 24; i++) {
    const angle = ((i * 15 - 90) * Math.PI) / 180;
    const [c, n] = [Math.cos(angle), Math.sin(angle)];
    const tick = s("line", { x1: 59 + c * 30, y1: 59 + n * 30, x2: 59 + c * 49, y2: 59 + n * 49, "stroke-width": 5, "stroke-linecap": "round", class: "lp-rail-tick" });
    ticks.push(tick);
    svg.append(tick);
  }
  svg.append(s("circle", { cx: 59, cy: 59, r: 17, fill: "var(--ink)" }));
  document.querySelector(".lp-rail-mark-art").append(svg);
  return ticks;
}

// The rule at the top: one part for each of the page's four sections, each filling as the middle
// of the screen passes through its section. It follows the scroll directly, with no motion of
// its own, and under reduced motion it is not shown (landing.css)
function progress() {
  const parts = [...document.querySelectorAll(".lp-progress i")];
  const sections = [...document.querySelectorAll("[data-section]")];
  const ticks = railMark();
  let queued = false;
  const draw = () => {
    queued = false;
    const de = document.documentElement;
    de.style.setProperty("--scrollbar", `${innerWidth - de.clientWidth}px`);
    const middle = innerHeight / 2;
    sections.forEach((section, i) => {
      const box = section.getBoundingClientRect();
      const filled = Math.min(1, Math.max(0, (middle - box.top) / box.height));
      parts[i].style.setProperty("--fill", filled.toFixed(3));
    });
    const read = Math.min(1, Math.max(0, scrollY / Math.max(1, de.scrollHeight - innerHeight)));
    const lit = Math.max(1, Math.round(read * 24));
    ticks.forEach((tick, i) => tick.classList.toggle("is-lit", i < lit));
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  draw();

  // On a wide screen the rails come in once the hero band has gone by, and Play moves from the
  // dock into the field beside the column
  const band = document.querySelector(".lp-band-deep");
  if (typeof IntersectionObserver === "function") {
    new IntersectionObserver(([entry]) => document.body.classList.toggle("lp-past-hero", !entry.isIntersecting), { rootMargin: "-120px 0px 0px 0px" }).observe(band);
  }
}

// ---------- Start ----------

async function main() {
  drawings();
  if (!reduced()) opening();
  sections();
  progress();
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
