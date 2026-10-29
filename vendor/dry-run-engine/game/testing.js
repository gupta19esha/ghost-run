// Testing tools (ruled 30 September 2026, ONBOARDING.md section 9). Only when TEST_TOOLS is on
// (game/config.js), which only a tester build does: none of this exists for a real player.
//
// A corner control on every screen but the landing, top left, inside the 24px margin every
// screen keeps, so it covers no words. A tap does nothing: it opens only when held for
// HOLD_MS, while a ring fills round it, so it cannot be hit by accident. It sits outside the
// screen, so pressing it is never the tap that moves a timed screen on.
//
// Held, it opens a panel over the screen: Start again, with the product owner's confirm, and
// jump to the start of a month, a run the Balanced player played for the tester. While the panel is open a timed
// screen's clock is paused; "Keep this run" closes it and the clock carries on.
//
// The web address backup: /game/?restart opens the same panel when the game loads.

// Every line is the product owner's: the confirm and its buttons from ONBOARDING.md section 8.1,
// the rest approved 30 September 2026 (section 9.1)
const CONFIRM = "Start again from 22? Your run is deleted and cannot be recovered.";
const CONFIRM_YES = "Delete and start again";
const CONFIRM_NO = "Keep this run";
const CONTROL_LABEL = "Testing: hold to start again";
const JUMP_LABEL = "Or jump to the start of month";
const JUMP = "Jump";

const HOLD_MS = 1000;
const FIRST_JUMP = 2;
const LAST_JUMP = 24;

function icon() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "22");
  svg.setAttribute("height", "22");
  svg.setAttribute("viewBox", "0 0 22 22");
  svg.setAttribute("aria-hidden", "true");
  // The ring fills while the control is held; inside it, a circular arrow
  svg.innerHTML = `
    <circle class="test-ring-track" cx="11" cy="11" r="10" fill="none" stroke-width="2"/>
    <circle class="test-ring" cx="11" cy="11" r="10" fill="none" stroke-width="2" pathLength="100" transform="rotate(-90 11 11)"/>
    <path d="M15.5 8.5A5 5 0 1 0 16 12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M16.4 5.6v3.3h-3.3" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
  return svg;
}

// currentScreen: the screen on the page. onRestart: delete the run, landing screen.
// onJump(month): replace the run with one played to the start of month.
export function installTestingTools({ currentScreen, onRestart, onJump }) {
  const control = document.createElement("button");
  control.type = "button";
  control.className = "test-control";
  control.setAttribute("aria-label", CONTROL_LABEL);
  control.hidden = true;
  control.append(icon());
  document.body.append(control);

  let holding = null;
  const cancelHold = () => {
    clearTimeout(holding);
    holding = null;
    control.classList.remove("holding");
  };
  control.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    control.classList.add("holding");
    holding = setTimeout(() => {
      cancelHold();
      openPanel();
    }, HOLD_MS);
  });
  for (const type of ["pointerup", "pointerleave", "pointercancel"]) control.addEventListener(type, cancelHold);
  // A long press on a phone would otherwise open the browser's own menu
  control.addEventListener("contextmenu", (event) => event.preventDefault());
  // A click on the control never reaches the screen under it
  control.addEventListener("click", (event) => event.stopPropagation());

  let panel = null;
  function closePanel() {
    panel?.remove();
    panel = null;
    currentScreen()?.resume?.();
  }
  function openPanel() {
    if (panel) return;
    currentScreen()?.pause?.();
    panel = document.createElement("div");
    panel.className = "test-scrim";
    const box = document.createElement("div");
    box.className = "test-panel";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");

    const question = document.createElement("p");
    question.className = "how-confirm";
    question.textContent = CONFIRM;
    const yes = document.createElement("button");
    yes.type = "button";
    yes.className = "close-button how-confirm-yes";
    yes.textContent = CONFIRM_YES;
    yes.addEventListener("click", () => {
      panel.remove();
      panel = null;
      onRestart();
    }, { once: true });
    const no = document.createElement("button");
    no.type = "button";
    no.className = "close-button";
    no.textContent = CONFIRM_NO;
    no.addEventListener("click", closePanel);

    const jump = document.createElement("div");
    jump.className = "test-jump";
    const label = document.createElement("label");
    label.htmlFor = "test-jump-month";
    label.textContent = JUMP_LABEL;
    const select = document.createElement("select");
    select.id = "test-jump-month";
    for (let month = FIRST_JUMP; month <= LAST_JUMP; month++) {
      const option = document.createElement("option");
      option.value = String(month);
      option.textContent = String(month);
      select.append(option);
    }
    const go = document.createElement("button");
    go.type = "button";
    go.className = "close-button test-jump-go";
    go.textContent = JUMP;
    go.addEventListener("click", () => {
      panel.remove();
      panel = null;
      onJump(Number(select.value));
    }, { once: true });
    jump.append(label, select, go);

    box.append(question, yes, no, jump);
    panel.append(box);
    // Taps on the panel never reach the screen under it
    panel.addEventListener("click", (event) => event.stopPropagation());
    document.body.append(panel);
    no.focus();
  }
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && panel) closePanel();
  });

  return {
    // Called each time a screen is shown. No control on the landing: there is no run yet
    shown(screen) {
      control.hidden = screen.dataset.screen === "landing";
    },
    openPanel,
  };
}
