"""Run the engine in headless Chrome and check it matches Node.

ENGINE.md: the engine must run in Node and in a browser, unchanged. Serves the project over
a local web server (browsers refuse ES modules from file://), loads
engine/browser-check.html in headless Chrome, and compares its 24-month history with the
same run in Node. Exits 1 if any value differs at all, even in the last bit.

ENGINE.md rule 3: the same run, always. Matching within a tolerance is not enough. Until v12
a fractional power in the inflation formula rounded differently in Chrome and Node.

Usage: python scripts/check_engine_browser.py
Set CHROME_PATH if Chrome is not in a standard place.
"""

import functools
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT / "engine"
CHROME_CANDIDATES = [
    os.environ.get("CHROME_PATH"),
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chrome"),
]

NODE_RUN = """
import { createState, advanceMonth, applyDecision, getHistory } from './index.js';
let state = createState(1);
for (let i = 0; i < 24; i++) {
  if (state.month === 6) state = applyDecision(state, 'D11', 'D11-C').state;
  if (state.month === 10) state = applyDecision(state, 'D16', 'D16-A').state;
  state = advanceMonth(state).state;
}
console.log(JSON.stringify(getHistory(state)));
"""


class QuietHandler(SimpleHTTPRequestHandler):
    extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript"}

    def log_message(self, *args):
        pass


def find_chrome():
    for path in CHROME_CANDIDATES:
        if path and Path(path).exists():
            return path
    sys.exit("Chrome not found. Set CHROME_PATH.")


def browser_history(chrome):
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    url = f"http://127.0.0.1:{server.server_address[1]}/engine/browser-check.html"
    try:
        with tempfile.TemporaryDirectory() as profile:
            dom = subprocess.run(
                [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
                 f"--user-data-dir={profile}", "--virtual-time-budget=10000", "--dump-dom", url],
                capture_output=True, text=True, encoding="utf-8", timeout=120,
            ).stdout
    finally:
        server.shutdown()
    match = re.search(r'<pre id="result">(.*?)</pre>', dom, re.S)
    if not match:
        sys.exit("The browser page did not render a result.")
    result = json.loads(html.unescape(match.group(1)))
    if not result.get("ok"):
        sys.exit("The engine failed in the browser:\n" + result.get("error", "no error text"))
    return result


def node_history():
    done = subprocess.run(["node", "--input-type=module", "-e", NODE_RUN], cwd=ENGINE,
                          capture_output=True, text=True, timeout=60)
    if done.returncode != 0:
        sys.exit("The engine failed in Node:\n" + done.stderr)
    return json.loads(done.stdout)


def main():
    result = browser_history(find_chrome())
    browser, node = result["history"], node_history()
    differences = [
        f"month {b['month']} {key}: browser {b.get(key)!r}, node {n[key]!r}"
        for b, n in zip(browser, node) for key in n if b.get(key) != n[key]
    ]
    if len(browser) != len(node):
        differences.append(f"browser ran {len(browser)} months, node ran {len(node)}")
    browser_name = re.search(r"(HeadlessChrome|Chrome|Edg)/[\d.]+", result["userAgent"])
    print(f"Browser: {browser_name.group(0) if browser_name else result['userAgent']}")
    if differences:
        print("Engine output differs between browser and Node:")
        for d in differences[:20]:
            print("  " + d)
        sys.exit(1)
    fields = sum(len(row) for row in browser)
    print(f"Engine ran in the browser unchanged. {len(browser)} months, all {fields} values bit-identical to Node. "
          f"Month 24 net worth {browser[-1]['net_worth']:.2f}.")


if __name__ == "__main__":
    main()
