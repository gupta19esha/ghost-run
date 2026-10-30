// What the ghost screen and the landing page both draw: elements, the chart with its ghost line
// drawing itself, the bars. Motion comes from web/motion.js; no sound is made here, so each page
// decides its own. Money is formatted by text/render.js, never here.

import { formatMoney } from "../vendor/dry-run-engine/text/render.js";
import { animate, later, tween, reduced, EASE, CSS_EASE } from "./motion.js";

const SVG = "http://www.w3.org/2000/svg";

// ---------- Elements ----------

export function h(tag, attrs = {}, ...children) {
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
export function s(tag, attrs = {}, ...children) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

// The ghost's mark: a small rounded ghost, in the ghost's blue
export function ghostMark(size = 18) {
  const svg = s("svg", { width: size, height: size, viewBox: "0 0 24 24", "aria-hidden": "true", class: "ghost-mark" });
  svg.innerHTML = `<path d="M12 2.5c-4.7 0-8 3.4-8 8.1v10.2c0 .6.7.9 1.1.5l1.9-1.6 2 1.7c.4.3.9.3 1.3 0l1.7-1.5 1.7 1.5c.4.3.9.3 1.3 0l2-1.7 1.9 1.6c.4.4 1.1.1 1.1-.5V10.6c0-4.7-3.3-8.1-8-8.1z" fill="var(--ghost-fill)" stroke="var(--ghost)" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9.2" cy="10.5" r="1.4" fill="var(--ghost)"/><circle cx="14.8" cy="10.5" r="1.4" fill="var(--ghost)"/>`;
  return svg;
}

// ---------- The chart ----------

// Net worth by month. real: [{month, netWorth}]. ghost: the same, or null. split: the month the
// ghost's choice was made. marks: months where the ghost could not take the real choice. height:
// the drawing's height, at the same width, so a short phone can give the chart less of the screen.
// A chart with a ghost carries svg.ghost, what drawGhost() needs to draw it in
let chartCount = 0;
export function chart({ real, ghost = null, split = null, marks = [], height = 214 }) {
  const W = 342, H = height, L = 6, R = 6, T = 30, B = 26;
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
  let pill = null;
  if (split !== null) {
    pill = s("g", { class: "chart-split-g" });
    pill.append(s("line", { x1: x(split), x2: x(split), y1: T - 4, y2: H - B, class: "chart-split" }));
    const label = `Split · month ${split}`;
    const w = label.length * 6.2 + 16;
    const lx = Math.min(Math.max(x(split) - w / 2, 0), W - w);
    pill.append(s("rect", { x: lx, y: 2, width: w, height: 20, rx: 10, class: "chart-split-pill" }));
    const t = s("text", { x: lx + w / 2, y: 16, class: "chart-split-text", "text-anchor": "middle" });
    t.textContent = label;
    pill.append(t);
    svg.append(pill);
  }

  svg.append(s("path", { d: `${path(real)} L${x(real.at(-1).month)} ${H - B} L${x(real[0].month)} ${H - B} Z`, class: "chart-real-area" }));
  if (!ghost) {
    svg.append(s("path", { d: path(real), class: "chart-real" }));
  } else {
    // The ghost from the month before it split, so it leaves the real line rather than starting
    // in the air. Line and halo sit under a mask whose one stroke is drawn in with
    // stroke-dasharray: the ghost's own dashes stay dashes while the line draws itself
    const from = ghost.filter((b) => b.month >= Math.max(1, split - 1));
    const points = from.map((b) => [x(b.month), y(b.netWorth)]);
    const lengths = [0];
    for (let i = 1; i < points.length; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
    const total = lengths.at(-1) || 1;
    const id = `ghost-reveal-${++chartCount}`;
    const reveal = s("path", { d: path(from), class: "chart-reveal", "stroke-dasharray": `${total} ${total}`, "stroke-dashoffset": 0 });
    const mask = s("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: W, height: H });
    mask.append(reveal);
    svg.append(s("defs", {}, mask));

    const drawn = s("g", { mask: `url(#${id})` },
      s("path", { d: path(from), class: "chart-ghost-halo" }),
      s("path", { d: path(from), class: "chart-ghost" }));
    svg.append(s("path", { d: path(real), class: "chart-real" }), drawn);

    const rings = marks.map((m) => {
      const i = from.findIndex((b) => b.month === m);
      if (i < 0) return null;
      const ring = s("circle", { cx: points[i][0], cy: points[i][1], r: 7, class: "chart-mark" });
      svg.append(ring);
      return { month: m, at: lengths[i] / total, el: ring };
    }).filter(Boolean);
    const [ex, ey] = points.at(-1);
    const endDot = s("circle", { cx: ex, cy: ey, r: 4.5, class: "chart-ghost-end" });
    const head = s("circle", { cx: points[0][0], cy: points[0][1], r: 4, class: "chart-ghost-head" });
    svg.append(endDot, head);
    svg.ghost = { reveal, total, points, lengths, rings, endDot, head, pill };
  }
  const r = real.at(-1);
  svg.append(s("circle", { cx: x(r.month), cy: y(r.netWorth), r: 4.5, class: "chart-real-end" }));
  return svg;
}

// Before the draw: the ghost undrawn, nothing of it showing, so the screen opens on your run
// alone. Not under reduced motion, where the line is simply there
export function hideGhost(svg) {
  if (reduced()) return;
  const { reveal, total, rings, endDot, pill } = svg.ghost;
  reveal.setAttribute("stroke-dashoffset", String(total));
  for (const ring of rings) ring.el.style.opacity = "0";
  endDot.style.opacity = "0";
  if (pill) pill.style.opacity = "0";
}

// The hero: the ghost line draws itself from the split, left to right, over 900ms. The split
// pill lands as it starts, each substitution ring as the line passes its month, the end mark
// when it arrives. progress(p) is told how far the line is, for anything keeping pace with it.
// A tap lands on the finished line, every ring in place
const DRAW_MS = 900;
export function drawGhost(svg, { onRing = () => {}, progress = () => {}, done = () => {} } = {}) {
  const g = svg.ghost;
  const { reveal, total, points, lengths, rings, endDot, head, pill } = g;
  const landed = new Set();
  const land = (ring) => {
    if (landed.has(ring)) return;
    landed.add(ring);
    animate(ring.el, [{ opacity: 0, transform: "scale(0.35)" }, { opacity: 1, transform: "scale(1)" }],
      { duration: 340, easing: CSS_EASE.land });
    onRing(ring);
  };
  // Where the head is at a fraction of the line's length: on the segment that contains it
  const at = (p) => {
    const want = p * total;
    let i = 1;
    while (i < lengths.length - 1 && lengths[i] < want) i++;
    const span = lengths[i] - lengths[i - 1] || 1;
    const f = Math.min(Math.max((want - lengths[i - 1]) / span, 0), 1);
    return [points[i - 1][0] + (points[i][0] - points[i - 1][0]) * f, points[i - 1][1] + (points[i][1] - points[i - 1][1]) * f];
  };

  if (pill) {
    pill.style.opacity = "";
    animate(pill, [{ opacity: 0, transform: "translateY(-9px)" }, { opacity: 1, transform: "translateY(0)" }],
      { duration: 360, easing: CSS_EASE.land });
  }
  tween({
    duration: DRAW_MS,
    ease: EASE.draw,
    update: (p) => {
      reveal.setAttribute("stroke-dashoffset", String(total * (1 - p)));
      const [hx, hy] = at(p);
      head.setAttribute("cx", hx.toFixed(1));
      head.setAttribute("cy", hy.toFixed(1));
      head.style.opacity = p > 0 && p < 1 ? "1" : "0";
      for (const ring of rings) if (p >= ring.at) land(ring);
      progress(p);
    },
    done: () => {
      endDot.style.opacity = "";
      animate(endDot, [{ transform: "scale(0.2)" }, { transform: "scale(1)" }], { duration: 300, easing: CSS_EASE.land });
      done();
    },
  });
}

export function legend(realEnd, ghostEnd = null, money = formatMoney) {
  return h("div", { class: "legend" },
    h("span", { class: "legend-item" }, h("i", { class: "swatch swatch-real" }), "You ", h("b", { class: "tabular" }, money(realEnd))),
    ghostEnd !== null && h("span", { class: "legend-item" }, h("i", { class: "swatch swatch-ghost" }), "Ghost ", h("b", { class: "tabular" }, money(ghostEnd))));
}

// A bar from 0 to 100: the real run's solid, the ghost's hatched
export const pct = (value) => `${Math.max(0, Math.min(100, value)).toFixed(1)}%`;
export function track(value, ghost = false) {
  return h("div", { class: `gbar-track${ghost ? " is-ghost" : ""}` },
    h("div", { class: "gbar-fill", style: `width: ${pct(value)}` }));
}

// A bar filling from its old value to its new one. A rise overshoots a little and settles over
// 500ms; a fall is flatter and quicker. Only the fill's width moves, inside a fixed track.
// onStart(rise) is told when it starts to move, for a sound to keep time with it
export function moveBar(trackEl, from, to, { delay = 0, onStart = () => {} } = {}) {
  const fill = trackEl.firstChild;
  const rise = to >= from;
  fill.style.width = pct(from);
  later(delay, () => {
    if (Math.abs(to - from) >= 0.5) onStart(rise);
    animate(fill, [{ width: pct(from) }, { width: pct(to) }], { duration: rise ? 500 : 360, easing: rise ? CSS_EASE.rise : CSS_EASE.fall });
  });
}

// Content arriving: a short rise into place
export function arrive(el, { delay = 0, distance = 14 } = {}) {
  el.style.opacity = reduced() ? "" : "0";
  later(delay, () => {
    el.style.opacity = "";
    animate(el, [{ opacity: 0, transform: `translateY(${distance}px)` }, { opacity: 1, transform: "translateY(0)" }], { duration: 320, easing: CSS_EASE.out });
  });
}
