"""Screenshot the game at the three widths UI.md requires: 320, 360 and 390.

Serves the project over a local web server (browsers refuse ES modules from file://) and
captures the game in headless Chrome. Headless Chrome will not make a window narrower than
about 500px, so a 320px window screenshot shows a 500px layout cropped. Instead each width
is an iframe of exactly that size, side by side on one wide page, one image per state.

Each state is a query string the game reads: play= lists choices to make in order, and
stop= names the screen to capture once they are made (home, month, decision, consequence,
callback, close, hook). Everything in between is tapped through. Fails if the game did not
render a screen, so a broken page does not produce a blank screenshot silently.

Usage: python scripts/screenshot_ui.py OUT_DIR [state ...]
  python scripts/screenshot_ui.py shots stop=home "play=D01-A&stop=consequence"
An empty state is the screen as it first opens.
"""

import functools
import html
import re
import subprocess
import sys
import tempfile
import threading
from http.server import ThreadingHTTPServer
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from check_engine_browser import QuietHandler, find_chrome, ROOT  # noqa: E402

# Phone widths from UI.md rule 3, with a typical height for each
SIZES = [(320, 640), (360, 760), (390, 844)]
GAP = 24
# Virtual time, so a long run of timed screens settles without real waiting
SETTLE_MS = 60000
SHEET_PATH = "/__screenshot_sheet.html"


def sheet(state):
    query = f"?{html.escape(state)}" if state else ""
    frames = "".join(
        f'<figure><iframe src="/game/index.html{query}" width="{w}" height="{h}"></iframe>'
        f"<figcaption>{w}px</figcaption></figure>"
        for w, h in SIZES
    )
    return (
        "<!doctype html><meta charset='utf-8'><style>"
        f"body{{margin:0;padding:{GAP}px;background:#2a2b30;display:flex;gap:{GAP}px;align-items:flex-start;"
        "font:14px system-ui;color:#bbb}figure{margin:0}iframe{border:0;display:block}"
        "figcaption{margin-top:6px}</style>" + frames
    )


class Handler(QuietHandler):
    state = ""

    def do_GET(self):
        if self.path.startswith(SHEET_PATH):
            body = sheet(self.path.split("?", 1)[1] if "?" in self.path else "").encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        super().do_GET()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    out = Path(sys.argv[1])
    out.mkdir(parents=True, exist_ok=True)
    states = sys.argv[2:] or [""]
    chrome = find_chrome()
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    origin = f"http://127.0.0.1:{server.server_address[1]}"
    width = GAP + sum(w + GAP for w, _ in SIZES)
    height = max(h for _, h in SIZES) + 2 * GAP + 30
    try:
        for state in states:
            label = re.sub(r"[^A-Za-z0-9-]+", "_", state) or "open"
            game_url = f"{origin}/game/index.html" + (f"?{state}" if state else "")
            with tempfile.TemporaryDirectory() as profile:
                common = [chrome, "--headless=new", "--disable-gpu", "--no-first-run", "--hide-scrollbars",
                          f"--user-data-dir={profile}", f"--virtual-time-budget={SETTLE_MS}"]
                dom = subprocess.run(common + ["--dump-dom", game_url],
                                     capture_output=True, text=True, encoding="utf-8", timeout=120).stdout
                if 'class="screen' not in dom:
                    sys.exit(f"{game_url} did not render a screen")
                path = out / f"{label}.png"
                sheet_url = f"{origin}{SHEET_PATH}" + (f"?{state}" if state else "")
                subprocess.run(common + [f"--window-size={width},{height}", f"--screenshot={path}", sheet_url],
                               capture_output=True, timeout=120, check=True)
                print(path)
    finally:
        server.shutdown()


if __name__ == "__main__":
    main()
