"""Check that every decision screen fits a phone, height as well as width.

Renders all 30 decisions at 320 by 568, 360 by 640 and 390 by 844 in headless Chrome, on the
paths that take each decision's first option and its last, and fails if any option card ends below the
screen. UI.md rule 6. Written after D02 was found to overflow a 320 by 568 phone that a check
at 320 wide on a taller frame had passed.

The screens are drawn with every stylesheet game/index.html links, so the check measures the look
a player gets. It once drew the original dark look only, and passed D14 while the site's Daylight
option cards, taller, pushed its last option 15 px off a 320 by 568 screen. On the ghost-run site
Daylight is /web/daylight.css, outside this folder, so /web/ is served from the site when this
folder sits inside it. A stylesheet or font that does not load fails the check.

Usage: python scripts/check_decision_fit.py
"""

import functools
import json
import re
import subprocess
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_engine_browser import QuietHandler, find_chrome, ROOT  # noqa: E402

# 390 by 664: an iPhone 14 in Safari with its toolbar showing, the shortest a 390 phone gets
SIZES = [(320, 568), (360, 640), (390, 664), (390, 844)]
OUTER = """<!doctype html><html><body style="margin:0"><pre id="out"></pre><script>
const p = new URLSearchParams(location.search);
const f = document.createElement("iframe"); f.width = p.get("w"); f.height = p.get("h"); f.style.border = "0";
f.src = "/scripts/decision_fit.html"; document.body.append(f);
addEventListener("message", (e) => { document.getElementById("out").textContent = e.data; });
</script></body></html>"""


# The site this engine is vendored into, if it is: vendor/dry-run-engine/ inside it
SITE = ROOT.parent.parent


class Handler(QuietHandler):
    def translate_path(self, path):
        # /web/ is the site's, as the site serves it (game/index.html links /web/daylight.css)
        if path.startswith("/web/") and (SITE / "web").is_dir():
            return str(SITE / "web" / path[len("/web/"):].split("?")[0])
        return super().translate_path(path)

    def do_GET(self):
        if self.path.startswith("/fit-outer"):
            body = OUTER.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def main():
    chrome = find_chrome()
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    failed = False
    try:
        for w, h in SIZES:
            with tempfile.TemporaryDirectory() as profile:
                dom = subprocess.run(
                    [chrome, "--headless=new", "--disable-gpu", "--no-first-run", f"--user-data-dir={profile}",
                     "--virtual-time-budget=60000", "--dump-dom", f"{origin}/fit-outer?w={w}&h={h}"],
                    capture_output=True, text=True, encoding="utf-8", timeout=200).stdout
            m = re.search(r'<pre id="out">RESULT(.*?)END', dom, re.S)
            if not m:
                sys.exit(f"{w} by {h}: the check page did not report")
            report = json.loads(m.group(1).replace("&amp;", "&"))
            if report["missing"]:
                sys.exit(f"{w} by {h}: stylesheets or fonts the game uses did not load: {', '.join(report['missing'])}")
            rows = report["results"]
            over = [r for r in rows if r["over"] > 0]
            compact = sorted({r["id"] for r in rows if r["compact"]})
            print(f"{w} by {h}: {len(rows)} decision screens on two paths, {len(over)} do not fit. Compact: {', '.join(compact) or 'none'}")
            for r in over:
                failed = True
                print(f"  {r['id']} ({r['path']} path): last option ends at {r['lastOptionBottom']} px, {r['over']} px below the screen")
    finally:
        server.shutdown()
    if failed:
        sys.exit(1)
    print("Every decision fits at every size.")


if __name__ == "__main__":
    main()
