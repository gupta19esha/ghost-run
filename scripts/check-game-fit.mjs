// The game's fit check at any window size, desktop sizes by default: plays chapter one in
// headless Chrome, through the real game as a player meets it (Daylight, the rail, every timed
// screen), and measures every screen it reaches on the way. Two paths, one taking each decision's
// first option and one its last, as vendor/dry-run-engine/scripts/check_decision_fit.py does.
//
// On every screen: nothing scrolls sideways, and the thing the screen is for is on screen without
// scrolling (the last option, the result's timer, Close, Home's button). The report, the timeline
// and How it works scroll by design, so only their width is checked. On a desktop window the rail
// must hold everything it carries without scrolling.
//
// Chrome runs on virtual time, so the timed screens take no real time. Once Home waits for
// tomorrow, after the first three months, the check takes "Play the next month now", as a player
// who plays on would.
//
// The chapter's progress (UI.md rule 10) must show on every screen of a month and Home, as the
// strip on a phone or in the rail on a desktop window, and on no other screen. The ideas open
// once from Home and once from the report; they scroll by design, so only their width is checked.
// The road opening the chapter (UI.md rule 11) must come between the landing and month 1, exactly
// once, with its button in reach while it scrolls. The chapter's name on the ideas opens the road.
// The chapter's progress opens the road from a decision, and Close comes back to that decision. The
// report's one primary action is the ghost run, on screen without scrolling.
//
// node --experimental-websocket scripts/check-game-fit.mjs [--phone] [--sizes=1440x900,900x600]
// (Node 22 and later need no flag.) Chrome: CHROME, or the usual install path.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const DESKTOP = [[900, 600], [1024, 768], [1280, 720], [1366, 768], [1440, 900], [1920, 1080]];
// 390 by 664 and 390 by 745: an iPhone 14 in Safari, its toolbar showing and tucked away
const PHONE = [[320, 568], [360, 640], [390, 664], [390, 745], [390, 844]];
const sizesArg = process.argv.find((a) => a.startsWith("--sizes="))?.split("=")[1];
const SIZES = sizesArg
  ? sizesArg.split(",").map((s) => s.split("x").map(Number))
  : process.argv.includes("--phone") ? PHONE : DESKTOP;
const PORT = 3091;
const DEBUG_PORT = 9391;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function chromePath() {
  const candidates = [
    process.env.CHROME,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome found: set CHROME to its path");
  return found;
}

async function reachable(url, tries = 60) {
  for (let i = 0; i < tries; i++) {
    try {
      return await (await fetch(url)).json().catch(() => true);
    } catch {
      await wait(200);
    }
  }
  throw new Error(`${url} did not answer`);
}

// The site as Vercel serves it, and a browser to drive over the DevTools protocol
const server = spawn(process.execPath, ["scripts/dev.mjs", `--port=${PORT}`], { stdio: "ignore" });
const chrome = spawn(chromePath(), ["--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
  `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${mkdtempSync(join(tmpdir(), "fit-"))}`, "about:blank"], { stdio: "ignore" });
const stop = () => { server.kill(); chrome.kill(); };

let failed = false;
try {
  await reachable(`${ORIGIN}/game/`);
  const targets = await reachable(`http://127.0.0.1:${DEBUG_PORT}/json`);
  const ws = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r));
  let id = 0;
  const pending = new Map();
  const listeners = new Map();
  const errors = [];
  ws.addEventListener("message", (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
    if (m.method === "Runtime.exceptionThrown") errors.push(m.params.exceptionDetails.exception?.description ?? m.params.exceptionDetails.text);
    listeners.get(m.method)?.(m.params);
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const run = async (expr) => {
    const r = await send("Runtime.evaluate", { expression: `(() => { ${expr} })()`, returnByValue: true });
    if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description ?? "evaluate failed");
    return r.result.result.value;
  };
  // Lets the page's clock run on by ms of virtual time, then holds it
  const advance = (ms) => new Promise((resolve) => {
    listeners.set("Emulation.virtualTimeBudgetExpired", resolve);
    send("Emulation.setVirtualTimePolicy", { policy: "pauseIfNetworkFetchesPending", budget: ms });
  });
  await send("Runtime.enable");

  // Measures the screen on the page now
  const measure = () => run(`
    const s = document.querySelector("#app > section");
    if (!s) return null;
    const name = s.dataset.screen;
    const bottom = (sel) => { const el = s.querySelector(sel); return el ? Math.ceil(el.getBoundingClientRect().bottom) : null; };
    // The thing each screen is for, which must be on screen without scrolling
    const key = {
      landing: ".action", month: ".month-line", decision: ".option:last-of-type", consequence: ".timer-foot",
      callback: ".timer-foot", close: ".close-button", home: ".home-foot > :last-child", turn: ".timer-foot",
      card: ".certificate-foot", start: ".start-foot",
    }[name];
    const rail = document.querySelector(".rail");
    const railShown = rail && !rail.hidden && getComputedStyle(rail).display !== "none";
    const illo = s.querySelector(".illo svg, .landing-band");
    const art = illo ? illo.getBoundingClientRect() : null;
    return {
      name,
      sideways: document.documentElement.scrollWidth - innerWidth,
      keyOver: key ? (bottom(key) ?? 0) - innerHeight : null,
      tall: document.documentElement.scrollHeight - innerHeight,
      railOver: railShown ? rail.scrollHeight - rail.clientHeight : null,
      rail: railShown,
      art: art ? Math.round(art.width) + "x" + Math.round(art.height) : null,
      id: s.querySelector(".option")?.dataset.optionId?.split("-")[0] ?? null,
      compact: s.classList.contains("compact"),
      progress: [...document.querySelectorAll(".chapter-progress")].find((p) => !p.hidden && p.getBoundingClientRect().width > 0)?.textContent ?? null,
    };`);

  for (const [w, h] of SIZES) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 900 });
    for (const path of ["first", "last"]) {
      await send("Page.navigate", { url: `${ORIGIN}/game/` });
      await advance(2000);
      await run(`localStorage.clear(); return 1`);
      await send("Page.reload");
      await advance(2500);
      const problems = [];
      const seen = new Map();
      let sideTrips = false;
      let roadTrip = false;
      let walkTapped = false;
      let starts = 0;
      let month = 0;
      for (let step = 0; step < 600; step++) {
        const m = await measure();
        if (!m) { problems.push(`no screen at step ${step}`); break; }
        const label = m.name === "decision" ? `decision ${m.id}` : m.name === "close" ? `close month ${month + 1}` : m.name;
        const fixed = !["report", "timeline", "how"].includes(m.name);
        if (m.sideways > 0) problems.push(`${label}: scrolls sideways by ${m.sideways}px`);
        if (fixed && m.keyOver > 0) problems.push(`${label}: its ${m.name === "decision" ? "last option" : "button or timer"} ends ${m.keyOver}px below the window`);
        if (m.railOver > 0) problems.push(`${label}: the rail overflows by ${m.railOver}px`);
        if (w >= 900 && ["month", "decision", "consequence", "callback", "close", "home", "timeline", "how"].includes(m.name) && !m.rail) problems.push(`${label}: no rail`);
        const inMonth = ["month", "decision", "consequence", "callback", "close", "home"].includes(m.name);
        if (inMonth && !m.progress) problems.push(`${label}: no chapter progress`);
        if (!inMonth && m.progress && !["timeline", "how", "walk"].includes(m.name)) problems.push(`${label}: shows the chapter progress`);
        if (m.name === "month" && month === 0 && !seen.has("start")) problems.push("month 1: no chapter start before it");
        if (!seen.has(m.name)) seen.set(m.name, m);
        const act = (expr) => run(expr);
        if (m.name === "landing") await act(`document.querySelector(".action").click(); return 1`);
        else if (m.name === "start") {
          starts += 1;
          if (starts > 1 || month > 0) problems.push("start: shown a second time, or after month 1");
          await act(`document.querySelector(".start-foot .action").click(); return 1`);
          await advance(300);
        }
        else if (m.name === "month") await advance(2100);
        else if (m.name === "decision") {
          // Once, early: the road from the chapter's progress, and back to this same decision
          if (!roadTrip && month >= 1) {
            roadTrip = true;
            const opened = await act(`const b = [...document.querySelectorAll(".chapter-progress-open")].find((e) => e.offsetParent !== null); if (!b) return false; b.click(); return true`);
            if (!opened) problems.push("decision: the chapter's progress does not open the road");
            else {
              await advance(300);
              const road = await measure();
              if (road.name !== "timeline") problems.push(`decision: the chapter's progress opened ${road.name}`);
              if (road.sideways > 0) problems.push(`road from a decision: scrolls sideways by ${road.sideways}px`);
              await act(`document.querySelector(".timeline .icon-button").click(); return 1`);
              await advance(300);
              const back = await measure();
              if (back.name !== "decision" || back.id !== m.id) problems.push(`road from a decision: Close came back to ${back.name} ${back.id ?? ""}`);
            }
          }
          await act(`const o = [...document.querySelectorAll(".option")]; o[${path === "first" ? 0 : "o.length - 1"}].click(); return 1`);
          await advance(1200);
        } else if (m.name === "consequence" || m.name === "turn") await advance(5200);
        else if (m.name === "callback") await advance(3600);
        else if (m.name === "walk") {
          // The character's walk to the next stop. It leaves by itself; the first is tapped, which
          // must finish it at once
          if (!walkTapped) {
            walkTapped = true;
            await act(`document.querySelector(".walking").click(); return 1`);
            await advance(50);
            if ((await measure()).name === "walk") problems.push("walk: a tap does not finish it");
          } else {
            const fig = await act(`const f = document.querySelector(".walking .road-figure"); return !!f && document.querySelectorAll(".walking .road-figure").length === 1`);
            if (!fig) problems.push("walk: no character on the road");
            await advance(1500);
            if ((await measure()).name === "walk") problems.push("walk: it does not leave by itself");
          }
        }
        else if (m.name === "close") {
          month += 1;
          await act(`document.querySelector(".close-button").click(); return 1`);
          await advance(300);
        } else if (m.name === "home") {
          // Once, early: the life so far and How it works, beside Home
          if (!sideTrips && month >= 2) {
            sideTrips = true;
            await act(`document.querySelector(".home-where").click(); return 1`);
            await advance(300);
            const t = await measure();
            if (t.sideways > 0) problems.push(`timeline: scrolls sideways by ${t.sideways}px`);
            if (w >= 900 && !t.rail) problems.push("timeline: no rail");
            seen.set("timeline", t);
            await act(`document.querySelector(".timeline .icon-button, .timeline button").click(); return 1`);
            await advance(300);
            await act(`document.querySelector(".home-how").click(); return 1`);
            await advance(300);
            const how = await measure();
            if (how.sideways > 0) problems.push(`how: scrolls sideways by ${how.sideways}px`);
            seen.set("how", how);
            await act(`document.querySelector(".how .icon-button, .how-close").click(); return 1`);
            await advance(300);
            await act(`document.querySelector(".home-ideas").click(); return 1`);
            await advance(300);
            const ideas = await measure();
            if (ideas.name !== "ideas") problems.push("home: its ideas link does not open the ideas");
            if (ideas.sideways > 0) problems.push(`ideas: scrolls sideways by ${ideas.sideways}px`);
            if (w < 900 && ideas.progress) problems.push("ideas: shows the chapter's progress strip");
            seen.set("ideas", ideas);
            await act(`document.querySelector(".ideas-chapter").click(); return 1`);
            await advance(300);
            const again = await measure();
            if (again.name !== "timeline") problems.push("ideas: the chapter's name does not open the road");
            if (again.sideways > 0) problems.push(`road from the ideas: scrolls sideways by ${again.sideways}px`);
            await act(`document.querySelector(".timeline .icon-button").click(); return 1`);
            await advance(300);
            if ((await measure()).name !== "ideas") problems.push("road from the ideas: Close does not go back to the ideas");
            await act(`document.querySelector(".ideas .icon-button").click(); return 1`);
            await advance(300);
          }
          const locked = await act(`return document.querySelector(".action").disabled`);
          if (locked && month < 3) problems.push(`home after month ${month}: waits for tomorrow inside the first sitting`);
          if (!locked && month >= 3) problems.push(`home after month ${month}: does not wait for tomorrow`);
          await act(`document.querySelector(${locked ? '".home-now"' : '".action"'}).click(); return 1`);
          await advance(300);
        } else if (m.name === "card") {
          await act(`document.querySelector(".certificate-foot .close-button").click(); return 1`);
          await advance(300);
        } else if (m.name === "report") {
          if (!(await act(`const a = document.querySelector(".report .action"); const b = a?.getBoundingClientRect(); return !!a && a.getAttribute("href") === "/ghost/?run=mine" && document.querySelectorAll(".report .action").length === 1 && b.top >= 0 && b.bottom <= innerHeight + 0.5`))) problems.push("report: the ghost run is not its one primary action, in reach");
          await act(`document.querySelector(".report-ideas").click(); return 1`);
          await advance(300);
          const ideas = await measure();
          if (ideas.name !== "ideas") problems.push("report: its ideas link does not open the ideas");
          if (ideas.sideways > 0) problems.push(`ideas from the report: scrolls sideways by ${ideas.sideways}px`);
          await act(`document.querySelector(".ideas .icon-button").click(); return 1`);
          await advance(300);
          if ((await measure()).name !== "report") problems.push("ideas: Close does not go back to the report");
          break;
        }
        else { problems.push(`${label}: no way on`); break; }
      }
      const kinds = [...seen.keys()];
      const decision = seen.get("decision");
      console.log(`${w} by ${h}, ${path} options: ${month} months closed; screens ${kinds.join(", ")}${decision?.art ? `; illustration ${decision.art}` : ""}`);
      for (const p of [...new Set(problems)]) {
        failed = true;
        console.log(`  ${p}`);
      }
    }
  }
  if (errors.length) {
    failed = true;
    console.log("Page errors:", [...new Set(errors)].join(" | "));
  }
  ws.close();
} finally {
  stop();
}
if (failed) process.exit(1);
console.log("Every screen fits at every size.");
process.exit(0);
