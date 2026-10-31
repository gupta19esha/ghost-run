// The chapter card: the chapter closed, drawn for the player to keep and post. Net worth and how
// it moved, the three bars, the shape of the chapter as a line of net worth month by month, a
// line of the run's own figures, and the ideas the chapter collected, numbered, in the order they
// came: what finishing the chapter taught, by name (UI.md rule 10, ruled 31 October 2026).
// 1200 by 1000: it was 1200 by 627, LinkedIn's landscape link image, until the twenty ideas
// needed the room. A post shows an image of this shape whole.
//
// Drawn in the browser from the save, on a canvas, with no server: the figures come from
// game/certificate.js, which takes every one from the engine and words every piece of money
// with text/. Nothing here computes a figure; it places them and scales the line to the box.
// The colours are the game's tokens, read off the page, and the type is the game's.
//
// Saving makes a PNG of the canvas and downloads it.

import { PRODUCT_NAME } from "../config.js";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 1000;

const HEADING = "Your chapter card";
const SAVE = "Save the card";
const NET_WORTH = "Net worth";
const DISCLAIMER = "Educational simulation. Not investment advice.";
// For a screen reader only: the locked card, which the eye sees by its lock
const LOCKED = "locked";

const DISPLAY = '"Baloo 2", "Mukta", system-ui, sans-serif';
const BODY = '"Mukta", system-ui, sans-serif';
const FONTS = [`800 76px ${DISPLAY}`, `700 30px ${DISPLAY}`, `400 20px ${BODY}`, `600 20px ${BODY}`];

// The tokens the card is drawn in, as the page has them now, with Daylight's own as the fallback
function tokens() {
  const css = getComputedStyle(document.documentElement);
  const read = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
  return {
    paper: read("--ink", "#FBF4E6"),
    raised: read("--ink-raised", "#FFFFFF"),
    text: read("--bone", "#211C16"),
    slate: read("--slate", "#6B6255"),
    rule: read("--rule", "#E6DAC4"),
    deep: read("--deep", "#1E4F96"),
    deepRaised: read("--deep-raised", "#3A6DB8"),
    mutedPaper: read("--muted-paper", "#C1C9D4"),
    wash: read("--concept-ground", "#EAF0F8"),
    marigold: read("--marigold", "#F5A00A"),
    teal: read("--teal", "#12A383"),
    vermilion: read("--vermilion", "#E23D1F"),
  };
}

// color-mix(in srgb, a, b share), as daylight.css mixes the big figures toward the ink
function mix(a, b, share) {
  const rgb = (hex) => {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
    return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  };
  const [x, y] = [rgb(a), rgb(b)];
  return `rgb(${x.map((v, i) => Math.round(v * (1 - share) + y[i] * share)).join(", ")})`;
}

// Sets the font, shrinking it until the text fits the width or reaches the smallest size
function fit(ctx, text, { weight, size, min, family, width }) {
  for (let px = size; px >= min; px--) {
    ctx.font = `${weight} ${px}px ${family}`;
    if (ctx.measureText(text).width <= width) return px;
  }
  return min;
}

// Breaks the text into lines of at most width, at spaces, or with sentences, at the end of a
// sentence where one fits, so a figure is not left on a line of its own
function lines(ctx, text, width, by = " ") {
  const out = [];
  let line = "";
  for (const word of by === " " ? text.split(" ") : text.split(/(?<=\.) /)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      out.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) out.push(line);
  return out;
}

// The game's mark: a tick round a circle for each month of the chapter, the first lit of them
// marigold. Every one is lit on a finished chapter's card; none on a locked one
function drawMark(ctx, { x, y, r, months, lit = months }, t) {
  ctx.fillStyle = t.deepRaised;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = r * 0.085;
  ctx.lineCap = "round";
  for (let i = 0; i < months; i++) {
    ctx.strokeStyle = i < lit ? t.marigold : t.mutedPaper;
    const angle = ((i * (360 / months) - 90) * Math.PI) / 180;
    const [c, s] = [Math.cos(angle), Math.sin(angle)];
    ctx.beginPath();
    ctx.moveTo(x + c * r * 0.51, y + s * r * 0.51);
    ctx.lineTo(x + c * r * 0.83, y + s * r * 0.83);
    ctx.stroke();
  }
  ctx.fillStyle = t.paper;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.29, 0, Math.PI * 2);
  ctx.fill();
}

// The chapter's shape: net worth at the end of every month, from where the run began
function drawShape(ctx, shape, { x, y, w, h }, t) {
  const values = shape.map((p) => p.net_worth);
  const low = Math.min(0, ...values);
  const high = Math.max(...values);
  const span = high - low || 1;
  const px = (i) => x + (i / (shape.length - 1)) * w;
  const py = (v) => y + h - ((v - low) / span) * h;

  ctx.strokeStyle = t.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, py(0));
  ctx.lineTo(x + w, py(0));
  ctx.stroke();

  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(px(i), py(p.net_worth)) : ctx.lineTo(px(i), py(p.net_worth))));
  ctx.lineTo(px(shape.length - 1), py(low));
  ctx.lineTo(px(0), py(low));
  ctx.closePath();
  ctx.fillStyle = t.wash;
  ctx.fill();

  ctx.beginPath();
  shape.forEach((p, i) => (i === 0 ? ctx.moveTo(px(i), py(p.net_worth)) : ctx.lineTo(px(i), py(p.net_worth))));
  ctx.strokeStyle = t.deep;
  ctx.lineWidth = 4;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  const last = shape[shape.length - 1];
  ctx.fillStyle = t.marigold;
  ctx.beginPath();
  ctx.arc(px(shape.length - 1), py(last.net_worth), 8, 0, Math.PI * 2);
  ctx.fill();

  // One tick for each month under the line, as the mark has round its circle
  ctx.strokeStyle = t.marigold;
  ctx.lineWidth = 3;
  for (let i = 1; i < shape.length; i++) {
    ctx.beginPath();
    ctx.moveTo(px(i), y + h + 14);
    ctx.lineTo(px(i), y + h + 24);
    ctx.stroke();
  }
}

// The ideas, numbered, down one column and then the next, so they read in the order they came.
// Not yet collected, on a locked card, they are slate
function drawIdeas(ctx, ideas, { x, y, w }, t, locked = false) {
  ctx.fillStyle = t.slate;
  ctx.font = `600 20px ${BODY}`;
  ctx.fillText(ideas.count, x, y);
  const columns = 2;
  const gap = 28;
  const column = (w - gap * (columns - 1)) / columns;
  const rows = Math.ceil(ideas.titles.length / columns);
  const number = 34;
  ideas.titles.forEach((title, i) => {
    const left = x + Math.floor(i / rows) * (column + gap);
    const baseline = y + 40 + (i % rows) * 26;
    ctx.fillStyle = t.slate;
    ctx.font = `600 17px ${BODY}`;
    ctx.textAlign = "right";
    ctx.fillText(String(i + 1), left + number - 12, baseline);
    ctx.textAlign = "left";
    ctx.fillStyle = locked ? t.slate : t.text;
    fit(ctx, title, { weight: 400, size: 19, min: 15, family: BODY, width: column - number });
    ctx.fillText(title, left + number, baseline);
  });
}

// card: chapterCard's figures. host: where the game is, for the foot. Draws onto canvas
export function drawCard(canvas, card, host) {
  const t = tokens();
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext("2d");
  ctx.textBaseline = "alphabetic";

  ctx.fillStyle = t.paper;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // The chapter, on the deep panel
  const panel = 400;
  ctx.fillStyle = t.deep;
  ctx.fillRect(0, 0, panel, CARD_HEIGHT);
  const months = card.locked ? card.months : card.shape.length - 1;
  drawMark(ctx, { x: 116, y: 116, r: 60, months, lit: card.locked ? 0 : months }, t);
  ctx.fillStyle = t.mutedPaper;
  ctx.font = `600 20px ${BODY}`;
  ctx.letterSpacing = "2px";
  ctx.fillText(`CHAPTER ${card.chapter.number.toUpperCase()}`, 56, 256);
  ctx.letterSpacing = "0px";
  ctx.fillStyle = t.paper;
  ctx.font = `800 64px ${DISPLAY}`;
  const title = lines(ctx, card.chapter.title, panel - 112);
  title.forEach((line, i) => ctx.fillText(line, 56, 324 + i * 66));
  ctx.fillStyle = t.mutedPaper;
  ctx.font = `700 30px ${DISPLAY}`;
  ctx.fillText(`${card.ages.from} to ${card.ages.to}`, 56, 324 + (title.length - 1) * 66 + 52);
  ctx.fillStyle = t.paper;
  ctx.font = `800 30px ${DISPLAY}`;
  ctx.fillText(PRODUCT_NAME, 56, CARD_HEIGHT - 79);
  ctx.fillStyle = t.mutedPaper;
  ctx.font = `400 18px ${BODY}`;
  ctx.fillText(host, 56, CARD_HEIGHT - 49);

  const left = 456;
  const width = CARD_WIDTH - left - 56;
  if (card.locked) {
    drawLocked(ctx, card, { left, width }, t);
    return;
  }

  // Net worth and how it moved
  ctx.fillStyle = t.slate;
  ctx.font = `600 20px ${BODY}`;
  ctx.fillText(NET_WORTH, left, 80);
  ctx.fillStyle = mix(t.marigold, t.text, 0.36);
  ctx.font = `800 76px ${DISPLAY}`;
  ctx.fillText(card.netWorth.text, left, 154);
  if (card.change.way !== "flat") {
    const move = card.change.way === "up" ? t.teal : t.vermilion;
    ctx.fillStyle = mix(move, t.text, 0.36);
    ctx.font = `600 22px ${BODY}`;
    ctx.fillText(`${card.change.way === "up" ? "▲" : "▼"} ${card.change.text} over ${card.years} years`, left, 194);
  }

  drawShape(ctx, card.shape, { x: left, y: 224, w: width, h: 150 }, t);

  // The three bars, side by side
  const gap = 28;
  const column = (width - gap * 2) / 3;
  card.bars.forEach((bar, i) => {
    const x = left + i * (column + gap);
    const colour = bar.danger || bar.way === "down" ? t.vermilion : bar.way === "up" ? t.teal : t.slate;
    ctx.fillStyle = t.text;
    ctx.font = `600 22px ${BODY}`;
    ctx.fillText(bar.name, x, 448);
    if (bar.label) {
      ctx.fillStyle = t.slate;
      fit(ctx, bar.label, { weight: 400, size: 17, min: 13, family: BODY, width: column });
      ctx.fillText(bar.label, x, 472);
    }
    ctx.fillStyle = t.raised;
    ctx.beginPath();
    ctx.roundRect(x, 486, column, 14, 7);
    ctx.fill();
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.roundRect(x, 486, Math.max(14, (column * bar.value) / 100), 14, 7);
    ctx.fill();
  });

  // The run's own figures, the ideas under a hairline, then the disclaimer
  ctx.fillStyle = t.text;
  ctx.font = `400 21px ${BODY}`;
  const sentences = lines(ctx, card.line, width, "sentence");
  const run = sentences.every((l) => ctx.measureText(l).width <= width) ? sentences : lines(ctx, card.line, width);
  run.slice(0, 2).forEach((line, i) => ctx.fillText(line, left, 548 + i * 28));
  ctx.fillStyle = t.rule;
  ctx.fillRect(left, 610, width, 2);
  drawIdeas(ctx, card.ideas, { x: left, y: 650, w: width }, t);
  ctx.fillStyle = t.slate;
  ctx.font = `400 15px ${BODY}`;
  ctx.fillText(DISCLAIMER, left, CARD_HEIGHT - 36);
}

// A chapter's card before it is played (UI.md rule 11): the same card, its figures' places left
// empty, since there are none yet, its ideas in slate, and a lock over it
function drawLocked(ctx, card, { left, width }, t) {
  const empty = (x, y, w, h) => {
    ctx.fillStyle = t.rule;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(h / 2, 12));
    ctx.fill();
  };
  ctx.fillStyle = t.slate;
  ctx.font = `600 20px ${BODY}`;
  ctx.fillText(NET_WORTH, left, 80);
  empty(left, 100, 320, 60);
  empty(left, 178, 240, 18);
  // The shape's ground and a tick for each month, nothing drawn on them
  ctx.fillRect(left, 372, width, 2);
  for (let i = 1; i <= card.months; i++) {
    const x = left + (i / card.months) * width;
    ctx.fillRect(x - 1.5, 388, 3, 10);
  }
  const gap = 28;
  const column = (width - gap * 2) / 3;
  card.bars.forEach((bar, i) => {
    const x = left + i * (column + gap);
    ctx.fillStyle = t.text;
    ctx.font = `600 22px ${BODY}`;
    ctx.fillText(bar.name, x, 448);
    ctx.fillStyle = t.raised;
    ctx.beginPath();
    ctx.roundRect(x, 486, column, 14, 7);
    ctx.fill();
  });
  empty(left, 530, width * 0.78, 18);
  empty(left, 558, width * 0.52, 18);
  ctx.fillStyle = t.rule;
  ctx.fillRect(left, 610, width, 2);
  drawIdeas(ctx, card.ideas, { x: left, y: 650, w: width }, t, true);
  ctx.fillStyle = t.slate;
  ctx.font = `400 15px ${BODY}`;
  ctx.fillText(DISCLAIMER, left, CARD_HEIGHT - 36);

  // The lock, where the chapter's line will be drawn
  const [x, y] = [left + width / 2, 290];
  ctx.fillStyle = t.raised;
  ctx.beginPath();
  ctx.arc(x, y, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = t.rule;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = t.slate;
  ctx.beginPath();
  ctx.roundRect(x - 26, y - 6, 52, 40, 8);
  ctx.fill();
  ctx.strokeStyle = t.slate;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - 15, y - 6);
  ctx.lineTo(x - 15, y - 16);
  ctx.arc(x, y - 16, 15, Math.PI, 0);
  ctx.lineTo(x + 15, y - 6);
  ctx.stroke();
}

// The words a screen reader has for the card
function describe(card) {
  if (card.locked) return `${HEADING}, ${LOCKED}. Chapter ${card.chapter.number}, ${card.chapter.title}, ${card.ages.from} to ${card.ages.to}. ${card.ideas.count}: ${card.ideas.titles.join(", ")}.`;
  return `Chapter ${card.chapter.number}, ${card.chapter.title}, ${card.ages.from} to ${card.ages.to}. ${NET_WORTH} ${card.netWorth.text}. ${card.line} ${card.ideas.count}: ${card.ideas.titles.join(", ")}.`;
}

// The card on its own canvas, drawn once the type has loaded: for a screen that shows it inside
// other things, such as the chapter start. Returns the canvas and a start() to call once it is
// on the page
export function cardCanvas(card) {
  const canvas = document.createElement("canvas");
  canvas.className = "certificate-card";
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", describe(card));
  const start = () => {
    const draw = () => drawCard(canvas, card, location.host);
    draw();
    Promise.all(FONTS.map((font) => document.fonts.load(font, "₹0 Aa"))).then(draw, draw);
  };
  return { canvas, start };
}

// card: chapterCard's figures. onBack: the button under it, with its words in back.
export function certificateScreen({ card, back, onBack }) {
  const screen = document.createElement("section");
  screen.className = "screen certificate";
  screen.dataset.screen = "card";

  const head = document.createElement("div");
  head.className = "certificate-head";
  const label = document.createElement("div");
  label.className = "month-label";
  label.textContent = HEADING;
  head.append(label);

  const canvas = document.createElement("canvas");
  canvas.className = "certificate-card";
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  canvas.setAttribute("role", "img");
  canvas.setAttribute("aria-label", describe(card));

  const foot = document.createElement("div");
  foot.className = "certificate-foot";
  const save = document.createElement("button");
  save.type = "button";
  save.className = "action";
  save.textContent = SAVE;
  save.addEventListener("click", () => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ghost-run-chapter-${card.chapter.number}.png`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, "image/png");
  });
  const leave = document.createElement("button");
  leave.type = "button";
  leave.className = "close-button";
  leave.textContent = back;
  leave.addEventListener("click", onBack, { once: true });
  foot.append(save, leave);

  const grow = document.createElement("div");
  grow.className = "grow";
  screen.append(head, canvas, grow, foot);

  // The type has to be loaded before it is drawn, or the canvas keeps the fallback
  screen.start = () => {
    window.scrollTo(0, 0);
    const draw = () => drawCard(canvas, card, location.host);
    draw();
    Promise.all(FONTS.map((font) => document.fonts.load(font, "₹0 Aa"))).then(draw, draw);
  };
  return screen;
}
