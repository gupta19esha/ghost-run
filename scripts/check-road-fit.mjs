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

  // A run loads from a save, as a player coming back does: the demo life, whole or up to a month
  const demo = JSON.parse(readFileSync("web/demo/save.json", "utf8"));
  const choices = demo.choices;
  const openRoad = async (through) => {
    const run = { ...demo, closed: through, choices: choices.filter((c) => getDecision(c.split("-")[0]).month <= through) };
    await go(`${ORIGIN}/web/index.html`, 200);
    await js(`localStorage.setItem(${JSON.stringify(SAVE_KEY)}, ${JSON.stringify(JSON.stringify(run))}); return 1`);
    await go(`${ORIGIN}/game/`, 1200);
    await js(`(document.querySelector(".home-where") ?? [...document.querySelectorAll(".report button")].at(-1)).click(); return 1`);
    await wait(900);
  };
  const reachableBox = `const inView = (el) => { if (!el) return false; const b = el.getBoundingClientRect(); return b.width > 0 && b.top >= 0 && b.bottom <= innerHeight + 0.5 && b.left >= 0 && b.right <= innerWidth + 0.5; };
    const sideways = document.documentElement.scrollWidth - innerWidth;`;

  for (const [w, h] of SIZES) {
    const size = `${w}x${h}`;
    await page("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 });

    // ---------- The timeline, part way, then finished ----------
    for (const [state, through, reached] of [["partway", 10, 11], ["finished", 24, 24]]) {
      await openRoad(through);
      const m = await js(`${reachableBox}
        const stops = [...document.querySelectorAll(".road-stop")];
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
          aheadWords: ahead.map((s) => s.querySelector(".road-body").textContent).filter((t) => !/^Month \\d+$/.test(t)),
          aheadExtra: ahead.filter((s) => s.querySelector(".road-idea, .road-row, .road-barrier, .road-thumb")).length,
          events: [...document.querySelectorAll(".road-stop.has-event")].map((s) => s.dataset.month),
          barriers: document.querySelectorAll(".road-barrier").length,
          ideas: document.querySelectorAll(".road-idea").length,
          sideways,
          closeInView: inView(document.querySelector(".timeline .icon-button")),
          across: getComputedStyle(road).display === "flex",
          oneRowBand: new Set(stops.map((s) => Math.round(s.querySelector(".road-track").getBoundingClientRect().top))).size,
          rail: !!document.querySelector(".rail") && getComputedStyle(document.querySelector(".rail")).display !== "none",
          tooSmallRows: [...document.querySelectorAll(".road-row, .road-idea")].filter((b) => b.getBoundingClientRect().height < 44).length,
          emptyThumbs: [...document.querySelectorAll(".road-thumb .illo")].filter((i) => !i.querySelector("svg *")).length,
          figureClipped: (() => { const f = document.querySelector(".road-figure")?.getBoundingClientRect(); const t = here?.querySelector(".road-track").getBoundingClientRect(); return !f || !t || f.top < t.top - 0.5 || f.bottom > t.bottom + 0.5; })(),
        };`);
      const where = `timeline ${state}`;
      if (m.name !== "timeline") { say(size, where, `opened "${m.name}"`); continue; }
      if (m.stops !== 24) say(size, where, `${m.stops} stops`);
      if (m.figures !== 1) say(size, where, `${m.figures} figures`);
      if (m.sideways > 0) say(size, where, `scrolls sideways by ${m.sideways}px`);
      if (!m.closeInView) say(size, where, "Close is not on screen");
      if (m.aheadWords.length) say(size, where, `says more than its month ahead: ${m.aheadWords[0]}`);
      if (m.aheadExtra) say(size, where, `${m.aheadExtra} stops ahead carry a picture, an idea or an event`);
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
        const stop = document.querySelector(".road-stop.is-played .road-idea")?.closest(".road-stop") ?? document.querySelector(".road-stop.is-played");
        stop.querySelector(".road-row").click();
        const detail = stop.querySelector(".timeline-detail");
        const second = [...document.querySelectorAll(".road-stop.is-played")].find((s) => s !== stop);
        const before = !detail.hidden && detail.children.length > 0;
        second?.querySelector(".road-row").click();
        return { before, oneOpen: document.querySelectorAll(".road-stop.open").length, sideways: document.documentElement.scrollWidth - innerWidth };`);
      if (!opened.before) say(size, where, "tapping a stop did not open its month");
      if (opened.oneOpen !== 1) say(size, where, `${opened.oneOpen} months open`);
      if (opened.sideways > 0) say(size, where, `opened, scrolls sideways by ${opened.sideways}px`);
      await wait(120);
      await shot(`timeline-${state}-open-${size}`);
      const idea = await js(`
        const button = document.querySelector(".road-idea");
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
      if (back.name !== "timeline" || back.month !== idea.month) say(size, where, `Close from the idea came back to ${back.name}, month ${back.month}`);
    }

    // ---------- The split: a fork early, late, last, and the one with the substitution ----------
    for (const [index, option] of [[0, "D01-A"], [15, "D16-B"], [22, "D23-A"], [choices.length - 1, "D30-A"]]) {
      await go(`${ORIGIN}/ghost/#fork/${index}/${option}`, 1500);
      await wait(1600);
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
          contentBottom: Math.max(...[...document.querySelectorAll(".road-card, .notices")].map((e) => e.getBoundingClientRect().bottom)),
          dockTop: document.querySelector(".dock")?.getBoundingClientRect().top,
          sideways,
          rings: document.querySelectorAll(".road-art .chart-mark").length,
          ringOpacity: [...document.querySelectorAll(".road-art .chart-mark")].map((r) => getComputedStyle(r).opacity),
          endOpacity: getComputedStyle(document.querySelector(".chart-ghost-end-g") ?? document.body).opacity,
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
      if (option === "D16-B" && (m.rings !== 1 || m.ringOpacity[0] !== "1")) say(size, where, `substitution rings: ${m.rings} ${m.ringOpacity}`);
      if (option !== "D16-B" && m.rings !== 0) say(size, where, `${m.rings} rings on a fork with no substitution`);
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
