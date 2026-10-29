// A screen that leaves by itself (UI.md rule 2: the player never taps Continue). The month
// card, the consequence and the callback all work this way; the last two also leave sooner
// on a tap, and show the timer running out with "tap to continue" under it.

const CONTINUE = "tap to continue";

// The foot from design/Consequence.html: a thin bar filling as the time runs out
export function timerFoot(holdMs) {
  const foot = document.createElement("div");
  foot.className = "timer-foot";
  const progress = document.createElement("div");
  progress.className = "progress";
  const fill = document.createElement("div");
  fill.className = "progress-fill";
  fill.style.animationDuration = `${holdMs}ms`;
  progress.append(fill);
  const hint = document.createElement("span");
  hint.className = "hint";
  hint.textContent = CONTINUE;
  foot.append(progress, hint);
  return foot;
}

// Gives the screen its start(): called by show() once the screen is on the page.
// hold keeps it there, for screenshots only. onStart runs first, for anything that animates.
//
// pause() and resume() hold the clock and the timer line where they are, for the testing
// panel (game/testing.js): while its confirm is open the screen must not leave by itself.
export function leaveAfter(screen, { holdMs, hold = false, tappable = true, onStart = null, onDone }) {
  let left = false;
  let timer = null;
  let remaining = holdMs;
  let startedAt = 0;
  const fill = () => screen.querySelector(".progress-fill");
  const leave = () => {
    if (left) return;
    left = true;
    clearTimeout(timer);
    onDone();
  };
  const run = () => {
    startedAt = performance.now();
    timer = setTimeout(leave, remaining);
    fill()?.style.setProperty("animation-play-state", "running");
  };
  if (tappable) {
    screen.classList.add("tappable");
    screen.addEventListener("click", leave);
  }
  screen.start = () => {
    onStart?.();
    if (hold) {
      fill()?.style.setProperty("animation-play-state", "paused");
      return;
    }
    run();
  };
  screen.pause = () => {
    if (left || timer === null) return;
    clearTimeout(timer);
    timer = null;
    remaining = Math.max(0, remaining - (performance.now() - startedAt));
    fill()?.style.setProperty("animation-play-state", "paused");
  };
  screen.resume = () => {
    if (left || timer !== null || hold) return;
    run();
  };
  return screen;
}
