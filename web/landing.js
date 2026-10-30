// The landing page at the site root. Its words are in web/index.html; this adds the rest:
// - the opening: the hero's lines rise one after another (vendor/dry-run-engine/LANDING-MOTION.md,
//   direction E), the first salary comes up over the horizon and the road's first month lights
// - month 7 of the demo life, playable: the result line and the month close for whichever option
//   is tapped, every figure from the engine (web/landing-model.js), at the game's own timing
// - each section rising into place as it comes on screen, and each chapter's days drawn as the
//   game's ticks, chapter one's lighting in turn
// - a ghost, drawing itself from the split month when it comes on screen
// - the four-part progress rule at the top
// - the chapter two sign-up, which is connected to nothing (see signup below)
//
// Motion is web/motion.js's: a tap finishes it, and with reduced motion on everything is simply
// there. The page makes no sound. Nothing here moves the page under the player's thumb.

import { monthPreview, monthOutcome, landingFork, BAR_KEYS, BAR_NAMES } from "./landing-model.js";
import { formatMoney } from "../vendor/dry-run-engine/text/render.js";
import { illustration } from "../vendor/dry-run-engine/game/screens/illustrations.js";
import { direction, arrow } from "../vendor/dry-run-engine/game/screens/moves.js";
import { animate, count, later, reduced, CSS_EASE } from "./motion.js";
import { h, ghostMark, chart, hideGhost, drawGhost, legend, arrive } from "./ui.js";

const money = (n) => formatMoney(n);
const rise = (el, delay, distance = 12) =>
  animate(el, [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: "translateY(0)" }], { duration: 420, delay, easing: CSS_EASE.out });

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

// Each section's parts rise into place one after another the first time it comes on screen
function sections() {
  for (const section of document.querySelectorAll("[data-section]")) {
    const parts = [...section.children];
    if (!reduced()) for (const part of parts) part.style.opacity = "0";
    whenSeen(section, () => parts.forEach((part, i) => arrive(part, { delay: i * 80 })), 0.08);
  }
}

// ---------- The opening ----------

// About 1.4s, once: the hero's lines rise one after another, the first salary comes up over the
// horizon, and the road's first month lights
function opening() {
  const hero = document.querySelector(".lp-hero");
  [".lp-title", ".lp-lede", ".lp-hero-play"].forEach((selector, i) => rise(hero.querySelector(selector), 80 + i * 120));
  // Both crops of the scene, the phone's and the desktop's; one of them is shown
  for (const coin of hero.querySelectorAll(".lp-art-coin")) animate(coin, [{ transform: "translateY(60px)" }, { transform: "translateY(0)" }], { duration: 900, delay: 200, easing: CSS_EASE.out });
  for (const month of hero.querySelectorAll(".lp-art-month.is-lit")) animate(month, [{ fill: "var(--deep-muted)" }, { fill: "var(--marigold)" }], { duration: 300, delay: 950, easing: "ease-out" });
}

// ---------- How a month works: the month, playable ----------

function monthDemo(save) {
  const phone = document.querySelector("[data-month]");
  const screen = phone.querySelector(".lp-phone-screen");
  const choice = phone.querySelector(".lp-choice");
  const after = phone.querySelector(".lp-after");
  const preview = monthPreview(save);
  const byId = new Map(preview.options.map((option) => [option.id, option]));

  // The month's own drawing, whole, where the game puts it: above the decision
  const holder = phone.querySelector("[data-illo]");
  holder.append(illustration(holder.dataset.illo, "full"));

  // The options, as the decision screen has them: the same neutral cards, no colour on any. They
  // all stay where they are once one is chosen: the chosen one takes the game's chosen colours and
  // tick, and tapping another shows what it would have done. Nothing above the player's thumb
  // changes height, so the page never moves under it
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

  // The result line lands, and the month runs: net worth counts from where the month found it,
  // and each bar moves, teal up, vermilion down, as the game's month close
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
    // In the desktop's phone, the screen scrolls inside the phone to the result, as a phone would.
    // The page itself does not move. On a phone the screen does not scroll, so this does nothing
    if (screen.scrollHeight > screen.clientHeight + 1 && result) {
      screen.scrollTo({ top: result.offsetTop - 16, behavior: reduced() ? "auto" : "smooth" });
    }
  }
}

// ---------- The chapters ----------

// Each chapter's days as the game's month ticks; the written days of a playable chapter light in
// turn when the row comes on screen: all of chapter one's, and the opening of chapter two
function chapterDays() {
  for (const card of document.querySelectorAll(".lp-chapter")) {
    const days = Number(card.dataset.days);
    card.append(h("ol", { class: "lp-chapter-ticks", "aria-hidden": "true" },
      Array.from({ length: days }, () => h("li", { class: "lp-chapter-tick" }))));
  }
  const live = [...document.querySelectorAll(".lp-chapter.is-live")].flatMap((card) =>
    [...card.querySelectorAll(".lp-chapter-tick")].slice(0, Number(card.dataset.written || card.dataset.days)));
  const row = document.querySelector(".lp-chapters");
  whenSeen(row, () => live.forEach((tick, i) => later(250 + i * 35, () => {
    tick.classList.add("is-lit");
    animate(tick, [{ transform: "scale(1)" }, { transform: "scale(1.4)", offset: 0.35 }, { transform: "scale(1)" }], { duration: 320, easing: "ease-out", fill: "none" });
  })), 0.3);
}

// ---------- The ghost run ----------

function ghostDemo(holder, resultHolder, save) {
  const view = landingFork(save);
  const nw = view.compare[0];
  // On a desktop the chart has most of a row: drawn wider, so the months spread out and the
  // labels stay the size they are on a phone
  const wide = typeof matchMedia === "function" && matchMedia("(min-width: 900px)").matches;
  const drawing = chart({ real: view.result.real.bars, ghost: view.result.ghost.bars, split: view.month, marks: view.notices.map((n) => n.month), width: wide ? 640 : 342, height: wide ? 300 : 214 });
  const chartLegend = legend(nw.real, nw.ghost);
  const legendGhost = chartLegend.querySelectorAll("b")[1];
  holder.append(
    h("p", { class: "month-label" }, `Month ${view.month}`),
    h("p", { class: "lp-ghost-situation" }, view.situation),
    h("div", { class: "pair" },
      h("div", { class: "pair-side" }, h("p", { class: "pair-label" }, "You chose"), h("div", { class: "chosen" }, view.real.label)),
      h("div", { class: "pair-side" }, h("p", { class: "pair-label is-ghost" }, ghostMark(16), "Your ghost chose"), h("div", { class: "ghost-card" }, view.ghost.label))),
    h("div", { class: "card chart-card" }, drawing, chartLegend),
    // The proof, where it is shown rather than argued
    h("p", { class: "lp-proof" }, "Both lines come from the game's simulator, not a language model."));
  resultHolder.append(
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

// ---------- How far through ----------

// The rule at the top: one part for each of the four sections after the hero, each filling as
// the middle of the screen passes through it. It follows the scroll directly, with no motion of
// its own, and under reduced motion it is not shown (landing.css)
function progress() {
  const parts = [...document.querySelectorAll(".lp-progress i")];
  const sections = [...document.querySelectorAll("[data-section]")];
  let queued = false;
  const draw = () => {
    queued = false;
    const de = document.documentElement;
    de.style.setProperty("--scrollbar", `${innerWidth - de.clientWidth}px`);
    const middle = innerHeight / 2;
    sections.forEach((section, i) => {
      const box = section.getBoundingClientRect();
      parts[i]?.style.setProperty("--fill", Math.min(1, Math.max(0, (middle - box.top) / box.height)).toFixed(3));
    });
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
  addEventListener("scroll", queue, { passive: true });
  addEventListener("resize", queue);
  draw();
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
  sections();
  chapterDays();
  progress();
  signup(document.querySelector("[data-signup]"));

  const fail = (holder, what, error) => holder.replaceChildren(h("p", { class: "lp-wait" }, `${what} could not load: ${error.message}`));
  const after = document.querySelector(".lp-after");
  const ghostHolder = document.querySelector("[data-ghost]");
  let save;
  try {
    save = await (await fetch(new URL("./demo/save.json", import.meta.url))).json();
  } catch (error) {
    return fail(after, "The month", error);
  }
  try { monthDemo(save); } catch (error) { fail(after, "The month", error); }
  try { ghostDemo(ghostHolder, document.querySelector("[data-ghost-result]"), save); } catch (error) { fail(ghostHolder, "The ghost", error); }
}

main();
