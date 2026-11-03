// The landing screen, built to design/Landing.html. Every line of copy and the mark are
// that file's, kept word for word (UI.md build rule 3: the UI writes no copy). The lede and
// the second bullet are the product owner's rewrites of 30 September 2026, and the name
// field is cut (ONBOARDING.md section 5): nothing read it.
//
// The opening (ruled 30 September 2026, LANDING-MOTION.md, directions A and E): the title's three
// lines rise into place one after another, the lede and bullets fade in, then the mark's 24
// ticks draw themselves round the circle and the first nine turn marigold, months played. About
// 1.8 s, then still. It plays in full the first time only; after that the landing appears in
// place. Any tap finishes it at once. With reduced motion on it never plays. What is moving
// always ends exactly where the still screen is, so nothing depends on it.
//
// On phones 640 px tall or more, a band above the title (direction B): four illustrations from
// across the chapter, fading one into the next, about 2.5 s each, stopping on the last. D10, the
// wedding invitation; D23, the telephone; D22, the scooter; D26, the fork in the road. None from
// D01 or D02, so nothing in the first two decisions is spoiled, and none whose colours hint at an
// answer (ruled 30 September 2026). It plays with the opening, the first time only; any tap
// ends it on the fork. Below 640 px there is no room, and no band.

import { illustration } from "./illustrations.js";

const TITLE = ["Twenty years of", "your money life.", "Four minutes a day."];

// Exported for How it works, which shows them again read-only
export const LEDE = "You start at 22 with your first salary. Every day you play one month: a few decisions, then you see what the month did. There are no right answers, only consequences.";

export const POINTS = [
  "Every choice pays out later, sometimes two years later",
  "You are tracked on four things: what you are worth, how safe you are, how free you are, and how much you are living",
  "No real money. Nothing to buy. It is a simulation",
];

const BUTTON = "Start at month 1";
const DISCLAIMER = "Educational simulation. Not investment advice.";

// The mark: 24 ticks round a circle, one for each month of Chapter 1, the first 9 in
// marigold and the other 15 in slate. Same drawing as design/dry-run-mark.svg.
function mark() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "118");
  svg.setAttribute("height", "118");
  svg.setAttribute("viewBox", "0 0 118 118");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const round = (n) => Math.round(n * 100) / 100;
  let ticks = "";
  for (let i = 0; i < 24; i++) {
    const angle = ((i * 15 - 90) * Math.PI) / 180;
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    const colour = i < 9 ? "--marigold" : "--slate-dim";
    ticks += `<line class="tick${i < 9 ? " lit" : ""}" style="--i: ${i}" pathLength="1" x1="${round(59 + c * 30)}" y1="${round(59 + s * 30)}" x2="${round(59 + c * 49)}" y2="${round(59 + s * 49)}" stroke="var(${colour})"/>`;
  }
  svg.innerHTML = `
    <circle cx="59" cy="59" r="59" fill="var(--deep)"/>
    <g stroke-width="5" stroke-linecap="round">${ticks}</g>
    <circle cx="59" cy="59" r="17" fill="var(--bone)"/>`;
  return svg;
}

// The opening runs this long, to its last tick turning marigold
const OPENING_MS = 1800;

// Direction B's pictures, in chapter order, and how long they take to reach the last
const PICTURES = ["D10", "D23", "D22", "D26"];
const PICTURES_MS = 10500;

function band() {
  const holder = document.createElement("div");
  holder.className = "landing-band";
  holder.setAttribute("aria-hidden", "true");
  PICTURES.forEach((id, i) => {
    const picture = illustration(id, "full");
    picture.classList.add("landing-picture");
    picture.style.setProperty("--p", String(i));
    holder.append(picture);
  });
  return holder;
}

// intro: play the opening. onIntroSeen: called once it has played or been tapped to its end.
export function landingScreen(onBegin, { intro = false, onIntroSeen = () => {} } = {}) {
  const screen = document.createElement("section");
  screen.className = "screen landing";
  screen.dataset.screen = "landing";

  const markHolder = document.createElement("div");
  markHolder.className = "landing-mark";
  markHolder.append(mark());

  const title = document.createElement("h1");
  title.className = "landing-title";
  // One block per line, laid out as the artboard's line breaks, so each can rise on its own
  TITLE.forEach((line, i) => {
    const words = document.createElement("span");
    words.className = "landing-title-line";
    words.style.setProperty("--n", String(i));
    words.textContent = line;
    title.append(words);
  });

  const lede = document.createElement("p");
  lede.className = "landing-lede";
  lede.textContent = LEDE;

  const points = document.createElement("ul");
  points.className = "landing-points";
  for (const point of POINTS) {
    const item = document.createElement("li");
    const words = document.createElement("span");
    words.textContent = point;
    item.append(words);
    points.append(item);
  }

  const grow = document.createElement("div");
  grow.className = "grow";

  const foot = document.createElement("div");
  foot.className = "landing-foot";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action";
  button.textContent = BUTTON;
  button.addEventListener("click", () => onBegin(), { once: true });
  const note = document.createElement("p");
  note.className = "landing-note";
  note.textContent = DISCLAIMER;
  foot.append(button, note);

  screen.append(markHolder, band(), title, lede, points, grow, foot);

  // The opening. Taking the class away puts every piece where the still screen has it
  // The pictures run longer than the rest, so they have their own class and clock. The opening
  // counts as seen once its own part has played, or on a tap, which also ends the pictures
  if (intro) {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      screen.classList.remove("intro");
      onIntroSeen();
    };
    const finishAll = () => {
      finish();
      screen.classList.remove("pictures");
    };
    screen.classList.add("intro", "pictures");
    screen.addEventListener("pointerdown", finishAll, { once: true });
    screen.addEventListener("keydown", finishAll, { once: true });
    screen.start = () => {
      setTimeout(finish, OPENING_MS);
      setTimeout(() => screen.classList.remove("pictures"), PICTURES_MS);
    };
  }
  return screen;
}
