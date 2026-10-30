// The site locally, as Vercel serves it: the files, vercel.json's redirect and rewrites, and
// /api/narrate run in this process. Keys and settings come from .env.local, which git ignores;
// nothing from it is printed.
//
// npm run dev  [-- --port=3000]
//
// .env.local, for example:
//   NARRATE_PROVIDER=meta
//   NARRATE_LIVE=1
//   MODEL_API_KEY=...

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const port = Number(process.argv.find((a) => a.startsWith("--port="))?.split("=")[1] ?? 3000);

// KEY=VALUE lines; # comments; values may be quoted. Variables already set win
try {
  for (const line of (await readFile(join(ROOT, ".env.local"), "utf8")).split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !line.trim().startsWith("#") && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
} catch {}

const vercel = JSON.parse(await readFile(join(ROOT, "vercel.json"), "utf8"));
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".woff": "font/woff", ".woff2": "font/woff2", ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".md": "text/plain; charset=utf-8",
};

// vercel.json's "/x/:path*" patterns, as regular expressions
const pattern = (source) => new RegExp(`^${source.replace(/:path\*/, "(?<path>.*)").replace(/\//g, "\\/")}$`);
const route = (rules, path) => {
  for (const rule of rules) {
    const match = path.match(pattern(rule.source));
    if (match) return rule.destination.replace(":path*", match.groups?.path ?? "");
  }
  return null;
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/api/narrate") {
    const { default: handler } = await import("../api/narrate.js");
    return handler(req, res);
  }
  const redirect = route(vercel.redirects ?? [], url.pathname);
  if (redirect) {
    res.writeHead(307, { Location: redirect + url.search });
    return res.end();
  }
  const path = normalize(decodeURIComponent(route(vercel.rewrites ?? [], url.pathname) ?? url.pathname));
  const file = join(ROOT, path);
  if (!file.startsWith(ROOT) || path.split(/[\\/]/).some((part) => part.startsWith(".") && part.length > 1)) {
    res.writeHead(404);
    return res.end();
  }
  try {
    const info = await stat(file);
    const target = info.isDirectory() ? join(file, "index.html") : file;
    const data = await readFile(target);
    res.writeHead(200, { "Content-Type": TYPES[extname(target)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`Ghost Run on http://127.0.0.1:${port}/  narration: ${process.env.NARRATE_PROVIDER || "stub"}${process.env.NARRATE_LIVE === "1" ? ", live calls on" : ", cache only"}`);
});
