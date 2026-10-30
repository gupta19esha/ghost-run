// Motion for the ghost screen: tweens, counts and timed steps that a tap always finishes.
//
// Rules (README section Motion):
// - prefers-reduced-motion: everything lands on its finished state at once
// - nothing delays the player: a tap anywhere finishes every running animation and every step
//   still waiting, in order, before the tap does anything else, so it never lands in between
// - motion never changes layout: transforms, opacity, stroke offsets, and widths inside fixed
//   tracks only
// No libraries: requestAnimationFrame, and the Web Animations API.

const running = new Set();
export const reduced = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function track(item) {
  running.add(item);
  return item;
}

// Finish everything: animations jump to their end, waiting steps run now. A finished step may
// start more motion, which is finished too
export function finishAll() {
  for (let pass = 0; running.size > 0 && pass < 100; pass++) {
    for (const item of [...running]) {
      running.delete(item);
      item.finish();
    }
  }
}

// Leaving a screen: everything still running is dropped where it is, and waiting steps never
// run, so nothing of the old screen plays, or sounds, over the new one
export function stopAll() {
  for (const item of [...running]) {
    running.delete(item);
    item.stop();
  }
}

// A tap finishes motion first, in the capture phase, then does what it does
if (typeof document !== "undefined") {
  document.addEventListener("pointerdown", finishAll, { capture: true });
  document.addEventListener("keydown", finishAll, { capture: true });
}

// A cubic Bézier easing, as CSS defines it: x is time, y is progress
export function bezier(x1, y1, x2, y2) {
  const at = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  const slope = (a, b, t) => 3 * a * (1 - t) ** 2 + 6 * (b - a) * t * (1 - t) + 3 * (1 - b) * t ** 2;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const d = slope(x1, x2, t);
      if (Math.abs(d) < 1e-6) break;
      t -= (at(x1, x2, t) - x) / d;
    }
    // Newton can wander on steep curves: fall back to bisection when it has
    if (t < 0 || t > 1 || Math.abs(at(x1, x2, t) - x) > 1e-4) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) { t = (lo + hi) / 2; if (at(x1, x2, t) < x) lo = t; else hi = t; }
    }
    return at(y1, y2, t);
  };
}

// The few easings this screen uses, each for one job
export const EASE = {
  // The ghost line: it leaves the split unhurried, crosses the middle months at pace, and spends
  // its last third settling onto month 24, so the end, where the two lives stand apart, is where
  // the eye arrives slowly
  draw: bezier(0.42, 0, 0.18, 1),
  out: bezier(0.2, 0.7, 0.2, 1),         // counts and arrivals: fast, then a long settle
  rise: bezier(0.3, 1.45, 0.55, 1),      // a bar going up overshoots a little and settles
  fall: bezier(0.45, 0, 0.75, 0.9),      // a bar going down is flatter, and quicker
  land: bezier(0.34, 1.56, 0.64, 1),     // a mark dropping into place
};
export const CSS_EASE = {
  out: "cubic-bezier(0.2, 0.7, 0.2, 1)",
  rise: "cubic-bezier(0.3, 1.45, 0.55, 1)",
  fall: "cubic-bezier(0.45, 0, 0.75, 0.9)",
  land: "cubic-bezier(0.34, 1.56, 0.64, 1)",
};

// A step that runs after ms, or at once under reduced motion, or the moment a tap finishes motion
export function later(ms, fn) {
  if (reduced() || ms <= 0) return fn();
  const item = track({ finish: () => { clearTimeout(id); fn(); }, stop: () => clearTimeout(id) });
  const id = setTimeout(() => { running.delete(item); fn(); }, ms);
}

// A tween: update(p) with p eased from 0 to 1 over duration, then done(). A tap jumps to update(1)
export function tween({ duration, ease = EASE.out, update, done = () => {} }) {
  if (reduced()) {
    update(1);
    return done();
  }
  let frame = 0;
  const start = performance.now();
  const item = track({ finish: () => { cancelAnimationFrame(frame); update(1); done(); }, stop: () => cancelAnimationFrame(frame) });
  const step = (now) => {
    const t = Math.min((now - start) / duration, 1);
    update(ease(t), t);
    if (t < 1) frame = requestAnimationFrame(step);
    else { running.delete(item); done(); }
  };
  update(0, 0);
  frame = requestAnimationFrame(step);
}

// A Web Animation that a tap finishes; under reduced motion it starts finished
export function animate(el, keyframes, options) {
  const animation = el.animate(keyframes, { fill: "both", ...options });
  if (reduced()) {
    animation.finish();
    return animation;
  }
  const item = track({ finish: () => { try { animation.finish(); } catch {} }, stop: () => { try { animation.finish(); } catch {} } });
  animation.finished.then(() => running.delete(item), () => running.delete(item));
  return animation;
}

// A figure counting from one value to another, written with format at every frame. Money never
// cuts from one value to the next
export function count(el, from, to, format, { duration = 600, done } = {}) {
  tween({ duration, ease: EASE.out, update: (p) => { el.textContent = format(from + (to - from) * p); }, done });
}
