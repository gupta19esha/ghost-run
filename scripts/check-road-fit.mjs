// The road's fit check: the timeline as a road and the split step's branching road, at any window
// size, in headless Chrome. check-game-fit.mjs plays the whole chapter and takes the road once in
// passing; this looks at it closely.
//
// The timeline, part way through the chapter and finished: 24 stops, one figure at the month
// reached, nothing ahead told, Close in reach, nothing scrolling sideways but the road itself across
// a desktop window, and a stop's month and an idea opening when tapped. The split, on a fork from
// each end of the run and the one with the substitution: the road and the dock on screen together,
// no sideways scroll, the substitution ringed.
//
// node --experimental-websocket scripts/check-road-fit.mjs [--sizes=390x844,1440x900] [--shots=dir]
//   [--origin=https://ghost-run.vercel.app], to check a deployed site rather than a local one
// (Node 22 and later need no flag.) Chrome: CHROME, or the usual install path.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDecision } from "../vendor/dry-run-engine/engine/index.js";
import { play } from "../runner/replay.js";
import { SAVE_KEY } from "../vendor/dry-run-engine/game/config.js";

const ALL = [[320, 568], [360, 640], [390, 664], [390, 745], [390, 844], [900, 600], [1024, 768], [1280, 720], [1366, 768], [1440, 900], [1920, 1080]];
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const SIZES = arg("sizes") ? arg("sizes").split(",").map((s) => s.split("x").map(Number)) : ALL;
const SHOTS = arg("shots");
if (SHOTS) mkdirSync(SHOTS, { recursive: true });
const PORT = 3092;
const DEBUG_PORT = 9392;
const LIVE = arg("origin");
const ORIGIN = LIVE ?? `http://127.0.0.1:${PORT}`;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const chromePath = [process.env.CHROME, "C:/Program Files/Google/Chrome/Application/chrome.exe", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/usr/bin/google-chrome", "/usr/bin/chromium"]
  .filter(Boolean).find((p) => existsSync(p));
if (!chromePath) throw new Error("No Chrome found: set CHROME to its path");

// The narration route is never asked for here unless the split's step is left, and it is not.
const server = LIVE ? null : spawn(process.execPath, ["scripts/dev.mjs", `--port=${PORT}`], { stdio: "ignore", env: { ...process.env, NARRATE_PROVIDER: "stub", NARRATE_LIVE: "" } });
const chrome = spawn(chromePath, ["--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars", `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "road-"))}`, "about:blank"], { stdio: "ignore" });

async function reachable(url) {
  for (let i = 0; i < 60; i++) {
    try { return await (await fetch(url)).json().catch(() => true); } catch { await wait(200); }
  }
  throw new Error(`${url} did not answer`);
}

const problems = [];
const say = (size, where, text) => problems.push(`${size} ${where}: ${text}`);

try {
  await reachable(ORIGIN);
  const { webSocketDebuggerUrl } = await reachable(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
  const ws = new WebSocket(webSocketDebuggerUrl);
  await new Promise((r) => { ws.onopen = r; });
  let id = 0;
  const pending = new Map();
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  };
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, (m) => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
    ws.send(JSON.stringify({ id: n, method, params, sessionId }));
  });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const page = (method, params) => send(method, params, sessionId);
  await page("Page.enable");
  await page("Runtime.enable");
  const js = async (expression) => {
    const { result, exceptionDetails } = await page("Runtime.evaluate", { expression: `(() => { ${expression} })()`, returnByValue: true, awaitPromise: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const go = async (url, settle = 900) => {
    await page("Page.navigate", { url: "about:blank" });
    await page("Page.navigate", { url });
    await wait(settle);
  };
  const shot = async (name) => {
    if (!SHOTS) return;
    const { data } = await page("Page.captureScreenshot", { format: "png" });
    writeFileSync(join(SHOTS, `${name}.png`), Buffer.from(data, "base64"));
  };

  const until = async (condition, what) => {
    for (let i = 0; i < 100; i++) {
      if (await js(`return !!(${condition})`)) return;
      await wait(200);
    }
    throw new Error(`${what} never appeared`);
  };
  // A run loads from a save, as a player coming back does: the demo life, whole or up to a month
  const demo = JSON.parse(readFileSync("web/demo/save.json", "utf8"));
  const choices = demo.choices;
  const openRoad = async (through) => {
    const run = { ...demo, closed: through, choices: choices.filter((c) => getDecision(c.split("-")[0]).month <= through) };
    await go(`${ORIGIN}/web/index.html`, 200);
    await js(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(run))}); return 1`);
    await go(`${ORIGIN}/game/`, 1200);
    // Over a network the page takes its time
    await until(`document.querySelector(".home-road, .report button")`, "Home or the report");
    // Home is the road; once the chapter is over, the report opens it
    await js(`if (!document.querySelector(".home-road")) [...document.querySelectorAll(".report button")].at(-1).click(); return 1`);
    await wait(900);
  };
  const reachableBox = `const inView = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.top >= 0 && b.bottom <= innerHeight + 0.5 && b.left >= 0 && b.right <= innerWidth + 0.5; };
    const sideways = document.documentElement.scrollWidth - innerWidth;`;

  for (const [w, h] of SIZES) {
    const size = `${w}x${h}`;
    await page("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 });

    // ---------- The road opening the chapter, from a new run ----------
    await go(`${ORIGIN}/web/index.html`, 200);
    await js(`localStorage.clear(); return 1`);
    await go(`${ORIGIN}/game/`, 800);
    await until(`document.querySelector(".screen .action")`, "The game's landing");
    await js(`document.querySelector(".screen .action").click(); return 1`);
    await until(`document.querySelector(".road")`, "The opening road");
    await wait(1000);
    const opening = await js(`${reachableBox}
      const road = document.querySelector(".road");
      const stops = [...document.querySelectorAll(".road-stop:not(.road-end)")];
      const here = document.querySelector(".road-stop[aria-current]");
      const b = document.querySelector(".start-foot .action");
      return {
        name: document.querySelector(".screen").dataset.screen,
        stops: stops.length,
        dark: stops.filter((s) => s.classList.contains("is-ahead")).length,
        here: here && here.dataset.month,
        figures: document.querySelectorAll(".road-figure").length,
        locked: document.querySelectorAll(".road-idea.is-locked").length,
        open: document.querySelectorAll("button.road-idea").length,
        title: document.querySelector(".chapter-title")?.textContent,
        span: document.querySelector(".road-span")?.textContent,
        card: road.lastElementChild.classList.contains("road-end") && !!road.lastElementChild.querySelector("canvas"),
        playInView: inView(b),
        sideways,
        scroll: [scrollY, road.scrollLeft],
        close: !!document.querySelector(".timeline .icon-button"),
        picks: [...document.querySelectorAll(".road-pick")].map((p) => [p.dataset.character, p.getAttribute("aria-pressed"), p.getBoundingClientRect().height >= 44]),
      };`);
    if (opening.picks.length !== 2 || opening.picks.filter((p) => p[1] === "true").length !== 1 || !opening.picks.every((p) => p[2])) say(size, "opening", `the character choice: ${JSON.stringify(opening.picks)}`);
    await shot(`opening-girl-${size}`);
    const picked = await js(`const before = document.querySelector(".road-figure").innerHTML; document.querySelector('.road-pick[data-character="boy"]').click(); const after = document.querySelector(".road-figure").innerHTML; return { changed: before !== after, saved: JSON.parse(localStorage.getItem(${JSON.stringify(SAVE_KEY)})).character };`);
    if (!picked.changed) say(size, "opening", "choosing a character does not change the road's figure");
    if (picked.saved !== "boy") say(size, "opening", `the choice is not in the save: ${picked.saved}`);
    if (opening.name !== "start") say(size, "opening", `showed ${opening.name}`);
    if (opening.stops !== 24 || opening.dark !== 24) say(size, "opening", `${opening.stops} stops, ${opening.dark} dark`);
    if (opening.here !== "1" || opening.figures !== 1) say(size, "opening", `figure at ${opening.here}`);
    if (opening.locked !== 20 || opening.open !== 0) say(size, "opening", `${opening.locked} locked markers, ${opening.open} open`);
    if (!opening.card) say(size, "opening", "no chapter card at the road's end");
    if (!opening.playInView) say(size, "opening", "Play the month is not on screen");
    if (opening.sideways > 0) say(size, "opening", `scrolls sideways by ${opening.sideways}px`);
    if (opening.scroll[0] !== 0 || opening.scroll[1] !== 0) say(size, "opening", `does not open at the start: ${opening.scroll}`);
    if (opening.close) say(size, "opening", "has a close button as well as Play");
    if (!opening.span?.includes("22 to 24") || !opening.span?.includes("0 of 20 ideas")) say(size, "opening", `says "${opening.span}"`);
    await shot(`opening-${size}`);
    await js(`window.scrollTo(0, document.documentElement.scrollHeight); document.querySelector(".road").scrollLeft = 99999; return 1`);
    await wait(250);
    await shot(`opening-end-${size}`);

    // ---------- The landing's two ways in ----------
    await go(`${ORIGIN}/`, 1200);
    // A label that has left its button: the text's own box against the button's, on everything
    // that carries one. Overflow off the page would not show this
    const spilt = await js(`return [...document.querySelectorAll("a.action, a.close-button, .lp-chapter-state")].filter((a) => a.offsetParent !== null).map((a) => {
        const range = document.createRange();
        range.selectNodeContents(a);
        const t = range.getBoundingClientRect(), b = a.getBoundingClientRect();
        const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
        return { text: a.textContent.trim(), out: t.left < b.left - 0.5 || t.right > b.right + 0.5 || t.top < b.top - 0.5 || t.bottom > b.bottom + 0.5, lines, colour: getComputedStyle(a).color };
      }).filter((l) => l.out || l.lines > 1);`);
    for (const l of spilt) say(size, "landing", `"${l.text}" ${l.out ? "leaves its button" : `wraps to ${l.lines} lines`}`);
    // A chapter's status stays inside its card, and clear of the card's other words
    const pills = await js(`return [...document.querySelectorAll(".lp-chapter-state")].filter((p) => { const b = p.getBoundingClientRect(), c = p.closest(".lp-chapter").getBoundingClientRect(); return b.left < c.left || b.right > c.right - 8 || b.bottom > c.bottom; }).map((p) => p.textContent);`);
    if (pills.length) say(size, "landing", `status pills leave their cards: ${pills.join(", ")}`);
    const landing = await js(`${reachableBox}
      const texts = [...document.querySelectorAll("a.action, a.close-button")].map((a) => [a.textContent.trim(), a.getAttribute("href")]);
      const hero = [...document.querySelectorAll(".lp-hero-play a")];
      return { texts, hero: hero.map((a) => a.textContent.trim()), heroInView: hero.every((a) => { const b = a.getBoundingClientRect(); return b.width > 0 && b.left >= 0 && b.right <= innerWidth + 0.5; }), sideways };`);
    for (const [text, href] of landing.texts) {
      if (href === "/game/" && text !== "Start at month 1") say(size, "landing", `the game's button says "${text}"`);
      if (href === "/ghost/" && text !== "Try it on a finished life") say(size, "landing", `the ghost's button says "${text}"`);
    }
    if (landing.hero.join("|") !== "Start at month 1|Try it on a finished life" || !landing.heroInView) say(size, "landing", `the hero's buttons: ${landing.hero}`);
    if (landing.sideways > 0) say(size, "landing", `scrolls sideways by ${landing.sideways}px`);
    await shot(`landing-${size}`);

    // ---------- The ghost's first line, on the demo life, then a player's own run ----------
    await go(`${ORIGIN}/ghost/`, 800);
    await until(`document.querySelector(".step .dock")`, "The ghost's first step");
    await wait(1400);
    const first = await js(`${reachableBox}
      const h1 = document.querySelector("h1");
      // The step scrolls by design: what has to be on screen is what it says it is, and the figure
      const worth = document.querySelector(".home-net-worth").getBoundingClientRect();
      return { line: h1.textContent, next: inView(document.querySelector(".dock-next")), over: worth.bottom - document.querySelector(".dock").getBoundingClientRect().top, lineTop: h1.getBoundingClientRect().top, sideways };`);
    if (!/^A demo player's two years/.test(first.line)) say(size, "ghost", `first line: "${first.line}"`);
    if (!first.next) say(size, "ghost", "Next is not on screen");
    if (first.over > 0.5) say(size, "ghost", `its net worth ends ${first.over}px under the dock`);
    if (first.lineTop < 0) say(size, "ghost", "its first line starts above the screen");
    if (first.sideways > 0) say(size, "ghost", `scrolls sideways by ${first.sideways}px`);
    await shot(`ghost-first-${size}`);

    // A life that is not the demo's: another seed, so the narrator could not take it
    await go(`${ORIGIN}/web/index.html`, 200);
    await js(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify({ ...demo, seed: demo.seed + 1, closed: 24 }))}); return 1`);
    await go(`${ORIGIN}/ghost/?run=mine#fork/15/D16-B/story`, 800);
    await until(`document.querySelector(".narration-text:not(.is-missing), .narration .is-missing, .ghost-error")`, "A narration of the player's own run");
    const own = await js(`return { missing: !!document.querySelector(".is-missing, .ghost-error"), text: document.querySelector(".narration")?.textContent ?? "", label: document.querySelector(".step-label")?.textContent };`);
    if (own.missing) say(size, "own run", `no narration: ${own.text.slice(0, 120)}`);
    if (!/stand-in/.test(own.text)) say(size, "own run", "its narration does not say it was written without a model");
    if (!/No model wrote this/.test(own.text)) say(size, "own run", "its panel does not say no model wrote it");
    if (/narrator|attempt/i.test(own.text)) say(size, "own run", "its panel credits a narrator or its attempts");
    // Where it ended, on a run that takes every decision's first option and ends negative in lakhs:
    // its two figures are the widest the screen draws, and each must stay on one line
    const broke = play(1, (decision) => Object.keys(decision.options)[0]);
    await go(`${ORIGIN}/web/index.html`, 200);
    await js(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify({ ...demo, seed: 1, choices: broke.choices, closed: 24 }))}); return 1`);
    await go(`${ORIGIN}/ghost/?run=mine#fork/${broke.choices.length - 1}/D30-C/end`, 800);
    await until(`document.querySelector(".compare-figure")`, "Where it ended");
    await wait(1600);
    const figures = await js(`return [...document.querySelectorAll(".compare-figure")].map((el) => { const r = document.createRange(); r.selectNodeContents(el); return [el.textContent, new Set([...r.getClientRects()].map((x) => Math.round(x.top))).size, el.scrollWidth <= el.clientWidth + 1]; });`);
    for (const [text, lines, fits] of figures) if (lines > 1 || !fits) say(size, "own run", `"${text}" does not fit on one line`);
    if (!figures.every(([text]) => text.startsWith("−"))) say(size, "own run", `the check did not see negative figures: ${figures.map((f) => f[0])}`);
    await shot(`own-end-${size}`);
    await go(`${ORIGIN}/ghost/?run=mine`, 800);
    await until(`document.querySelector(".step .dock")`, "The own run's first step");
    await wait(500);
    const ownFirst = await js(`return { title: document.querySelector("h1").textContent, step: document.querySelector(".step-label").textContent };`);
    if (ownFirst.title !== "Two years. You are 24." || !/Your run/.test(ownFirst.step)) say(size, "own run", `says "${ownFirst.title}", "${ownFirst.step}"`);
    await js(`localStorage.clear(); return 1`);

    // ---------- The timeline, part way, then finished ----------
    for (const [state, through, reached, screen] of [["partway", 10, 11, "home"], ["finished", 24, 24, "timeline"]]) {
      await openRoad(through);
      const m = await js(`${reachableBox}
        const stops = [...document.querySelectorAll(".road-stop:not(.road-end)")];
        const here = document.querySelector('.road-stop[aria-current]');
        const ahead = stops.filter((s) => s.classList.contains("is-ahead"));
        const road = document.querySelector(".road");
        if (!road) return { name: document.querySelector(".screen")?.dataset.screen };
        return {
          name: document.querySelector(".screen")?.dataset.screen,
          stops: stops.length,
          figures: document.querySelectorAll(".road-figure").length,
          hereMonth: here && Number(here.dataset.month),
          herePlayed: here?.classList.contains("is-played"),
          hereInView: here ? (() => { const b = here.querySelector(".road-track").getBoundingClientRect(); return b.left < innerWidth && b.right > 0 && b.top < innerHeight && b.bottom > 0; })() : false,
          played: stops.length - ahead.length,
          aheadWords: ahead.map((s) => s.querySelector(".road-ahead-month").textContent).filter((t) => !/^Month \\d+$/.test(t)),
          aheadExtra: ahead.filter((s) => s.querySelector("button.road-idea, .road-row, .road-barrier, .road-thumb")).length,
          lockedAhead: ahead.filter((s) => s.querySelector(".road-idea.is-locked")).length,
          cardAtEnd: road.lastElementChild.classList.contains("road-end") && !!road.lastElementChild.querySelector("canvas"),
          events: [...document.querySelectorAll(".road-stop.has-event")].map((s) => s.dataset.month),
          barriers: document.querySelectorAll(".road-barrier").length,
          ideas: document.querySelectorAll("button.road-idea").length,
          sideways,
          closeInView: inView(document.querySelector(".timeline .icon-button, .home-foot .action")),
          across: ["flex", "grid"].includes(getComputedStyle(road).display),
          oneRowBand: new Set(stops.map((s) => Math.round(s.querySelector(".road-track").getBoundingClientRect().top))).size,
          rail: !!document.querySelector(".rail") && getComputedStyle(document.querySelector(".rail")).display !== "none",
          tooSmallRows: [...document.querySelectorAll(".road-row, button.road-idea")].filter((b) => b.getBoundingClientRect().height < 44).length,
          emptyThumbs: [...document.querySelectorAll(".road-thumb .illo")].filter((i) => !i.querySelector("svg *")).length,
          figureClipped: (() => { const f = document.querySelector(".road-figure")?.getBoundingClientRect(); const t = here?.querySelector(".road-track").getBoundingClientRect(); return !f || !t || f.top < t.top - 0.5 || f.bottom > t.bottom + 0.5; })(),
        };`);
      const where = `timeline ${state}`;
      if (m.name !== screen) { say(size, where, `opened "${m.name}"`); continue; }
      if (m.stops !== 24) say(size, where, `${m.stops} stops`);
      if (m.figures !== 1) say(size, where, `${m.figures} figures`);
      if (m.sideways > 0) say(size, where, `scrolls sideways by ${m.sideways}px`);
      if (!m.closeInView) say(size, where, `${screen === "home" ? "Play the month" : "Close"} is not on screen`);
      if (m.aheadWords.length) say(size, where, `says more than its month ahead: ${m.aheadWords[0]}`);
      if (m.aheadExtra) say(size, where, `${m.aheadExtra} stops ahead carry a picture, an open idea or an event`);
      if (!m.cardAtEnd) say(size, where, "no chapter card at the road's end");
      if (m.tooSmallRows) say(size, where, `${m.tooSmallRows} tap targets under 44px`);
      if (m.emptyThumbs) say(size, where, `${m.emptyThumbs} empty illustrations`);
      if (m.figureClipped) say(size, where, "the figure is clipped by its stop");
      if (!m.hereInView) say(size, where, `the figure's stop is not in view`);
      if ((w >= 900) !== m.across) say(size, where, m.across ? "runs across on a phone" : "runs down on a desktop window");
      if (m.across && m.oneRowBand !== 1) say(size, where, `road is at ${m.oneRowBand} heights`);
      // The rail stands beside Home's road; the report has none to bring
      if (w >= 900 && state === "partway" && !m.rail) say(size, where, "no rail");
      if (reached !== null && m.hereMonth !== reached) say(size, where, `figure at ${m.hereMonth}, not ${reached}`);
      if (state === "partway") {
        if (m.events.length) say(size, where, `the layoff shows before it happened (${m.events})`);
      } else {
        if (m.played !== 24) say(size, where, `${m.played} played`);
        if (m.events.join() !== "22" || m.barriers !== 1) say(size, where, `layoff marks: ${m.events} / ${m.barriers} barriers`);
        if (m.ideas !== 20) say(size, where, `${m.ideas} idea markers`);
      }
      await shot(`timeline-${state}-${size}`);

      // A played stop opens, one at a time, and an idea opens that idea and comes back
      const opened = await js(`
        const stop = document.querySelector(".road-stop.is-played button.road-idea")?.closest(".road-stop") ?? document.querySelector(".road-stop.is-played");
        stop.querySelector(".road-row").click();
        const detail = stop.querySelector(".timeline-detail");
        const second = [...document.querySelectorAll(".road-stop.is-played:not(.road-end)")].find((s) => s !== stop);
        const before = !detail.hidden && detail.children.length > 0;
        second?.querySelector(".road-row").click();
        return { before, oneOpen: document.querySelectorAll(".road-stop.open").length, sideways: document.documentElement.scrollWidth - innerWidth };`);
      if (!opened.before) say(size, where, "tapping a stop did not open its month");
      if (opened.oneOpen !== 1) say(size, where, `${opened.oneOpen} months open`);
      if (opened.sideways > 0) say(size, where, `opened, scrolls sideways by ${opened.sideways}px`);
      await wait(120);
      await shot(`timeline-${state}-open-${size}`);
      const idea = await js(`
        const button = document.querySelector("button.road-idea");
        const month = button.closest(".road-stop").dataset.month;
        const title = button.textContent;
        button.click();
        return { month, title };`);
      await wait(200);
      const inIdeas = await js(`
        const card = document.querySelector('.ideas-list [data-month="${idea.month}"]');
        const box = card?.getBoundingClientRect();
        return { name: document.querySelector(".screen")?.dataset.screen, title: card?.querySelector(".concept-title")?.textContent, inView: box && box.top < innerHeight && box.bottom > 0 };`);
      if (inIdeas.name !== "ideas") say(size, where, `an idea opened "${inIdeas.name}"`);
      if (inIdeas.title !== idea.title) say(size, where, `idea "${idea.title}" opened "${inIdeas.title}"`);
      if (!inIdeas.inView) say(size, where, "the idea it opened is off screen");
      await js(`document.querySelector(".ideas .icon-button").click(); return 1`);
      await wait(200);
      const back = await js(`return { name: document.querySelector(".screen")?.dataset.screen, month: document.querySelector(".road-stop.open")?.dataset.month };`);
      if (back.name !== screen || back.month !== idea.month) say(size, where, `Close from the idea came back to ${back.name}, month ${back.month}`);
    }

    // ---------- The split: a fork early, late, last, and the one with the substitution ----------
    const SUBSTITUTED = ["D16-B", "D16-C"];
    for (const [index, option] of [[0, "D01-A"], [15, "D16-B"], [15, "D16-C"], [22, "D23-A"], [choices.length - 1, "D30-A"]]) {
      await go(`${ORIGIN}/ghost/#fork/${index}/${option}`, 1500);
      await until(`document.querySelector(".road-art")`, "The split's road");
      await wait(2600);
      const m = await js(`${reachableBox}
        const art = document.querySelector(".road-art");
        return {
          art: !!art,
          artInView: inView(art),
          artBleeds: art && Math.abs(art.getBoundingClientRect().width - art.parentElement.clientWidth) < 1,
          artScale: art && art.getBoundingClientRect().width / art.viewBox.baseVal.width,
          legendOneLine: (() => { const items = [...document.querySelectorAll(".road-card .legend-item")].map((i) => Math.round(i.getBoundingClientRect().top)); return new Set(items).size === 1; })(),
          legendFits: (() => { const l = document.querySelector(".road-card .legend"); return l.scrollWidth <= l.clientWidth; })(),
          dockInView: inView(document.querySelector(".dock .dock-next, .dock-next")),
          noticeOver: (() => { const n = [...document.querySelectorAll(".notice")].at(-1); return n ? n.getBoundingClientRect().bottom - document.querySelector(".dock").getBoundingClientRect().top : 0; })(),
          treesOut: (() => { const a = art.getBoundingClientRect(); return [...art.querySelectorAll(".road-art-tree")].filter((t) => { const b = t.getBoundingClientRect(); return b.top < a.top - 0.5 || b.bottom > a.bottom + 0.5 || b.left < a.left - 0.5 || b.right > a.right + 0.5; }).length; })(),
          treesOnLabels: (() => { const labels = [...art.querySelectorAll(".road-art-label")].map((l) => l.getBoundingClientRect()); return [...art.querySelectorAll(".road-art-tree")].filter((t) => { const b = t.getBoundingClientRect(); return labels.some((l) => b.left < l.right && b.right > l.left && b.top < l.bottom && b.bottom > l.top); }).length; })(),
          contentBottom: Math.max(...[...document.querySelectorAll(".road-card, .notices")].map((e) => e.getBoundingClientRect().bottom)),
          dockTop: document.querySelector(".dock")?.getBoundingClientRect().top,
          sideways,
          rings: document.querySelectorAll(".road-art .chart-mark").length,
          ringOpacity: [...document.querySelectorAll(".road-art .chart-mark")].map((r) => getComputedStyle(r).opacity),
          endOpacity: getComputedStyle(document.querySelector(".chart-ghost-end-g") ?? document.body).opacity,
          walkers: [".road-art-you", ".road-art-pale"].map((c) => { const g = art.querySelector(c); const b = g?.getBoundingClientRect(); const a = art.getBoundingClientRect(); return !!b && b.width > 0 && b.left >= a.left - 0.5 && b.right <= a.right + 0.5 && b.top >= a.top - 0.5 && b.bottom <= a.bottom + 0.5; }),
          walkersApart: (() => { const y = art.querySelector(".road-art-you").getBoundingClientRect(); const p = art.querySelector(".road-art-pale").getBoundingClientRect(); return p.left !== y.left || p.top !== y.top; })(),
          revealed: document.querySelector(".chart-reveal")?.getAttribute("stroke-dashoffset"),
          oldChart: document.querySelectorAll(".chart").length,
        };`);
      const where = `split ${option}`;
      if (!m.art) { say(size, where, "no road"); continue; }
      if (m.oldChart) say(size, where, "the chart is still there");
      if (!m.artInView) say(size, where, "the road is not fully on screen");
      if (!m.artBleeds) say(size, where, "the road does not fill its card");
      if (Math.abs(m.artScale - 1) > 0.05) say(size, where, `the road is drawn at ${m.artScale.toFixed(2)} scale, so its labels are not their written size`);
      if (!m.legendOneLine || !m.legendFits) say(size, where, "the legend does not fit on one line");
      if (!m.dockInView) say(size, where, "Next is not on screen");
      if (m.sideways > 0) say(size, where, `scrolls sideways by ${m.sideways}px`);
      if (Number(m.revealed) > 0.5) say(size, where, `the ghost's road did not finish drawing (${m.revealed})`);
      if (m.endOpacity !== "1") say(size, where, "the ghost is not standing at the end of its road");
      if (!m.walkers.every(Boolean)) say(size, where, `a walker is out of the drawing: ${m.walkers}`);
      if (!m.walkersApart) say(size, where, "the two walkers stand in the same place");
      if (SUBSTITUTED.includes(option) && (m.rings !== 1 || m.ringOpacity[0] !== "1")) say(size, where, `substitution rings: ${m.rings} ${m.ringOpacity}`);
      if (!SUBSTITUTED.includes(option) && m.rings !== 0) say(size, where, `${m.rings} rings on a fork with no substitution`);
      if (m.noticeOver > 0.5) say(size, where, `the substitution notice ends ${m.noticeOver}px under the dock`);
      if (m.treesOut) say(size, where, `${m.treesOut} trees clipped`);
      if (m.treesOnLabels) say(size, where, `${m.treesOnLabels} trees on a label`);
      await shot(`split-${option}-${size}`);
    }
    console.log(`${size} done`);
  }
  ws.close();
} finally {
  chrome.kill();
  server?.kill();
}

if (problems.length) {
  console.log(`\n${problems.length} problems:`);
  for (const p of problems) console.log(`- ${p}`);
  process.exit(1);
}
console.log(`\nOK at ${SIZES.map((s) => s.join("x")).join(", ")}`);
