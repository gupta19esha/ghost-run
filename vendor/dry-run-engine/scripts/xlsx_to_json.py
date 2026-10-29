"""Export chapter1_decisions_v34.xlsx for the Phase 0 harness and for the engine.

Phase 0: data/decisions.json, only decisions marked phase0_test = Y, sorted by month, text
fields only. Text is copied exactly as written, except that engine tokens such as
{equity_balance} are filled with the Phase 0 sample figures from SIMULATION-MATHS.md
section 10.1. The same data is embedded in index.html so the harness opens from disk.

Engine: the full sheet, every decision and option, to data/chapter1.json and to
engine/decisions.js, an ES module the engine imports so it runs unchanged in Node and a
browser (ENGINE.md). Text keeps its raw tokens. The hand-written safety and freedom
weights are kept only under "crosscheck" for the section 10 comparison. The engine never
reads them.

Usage: python scripts/xlsx_to_json.py
"""

import json
import re
import sys
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
XLSX_PATH = ROOT / "chapter1_decisions_v34.xlsx"
JSON_PATH = ROOT / "data" / "decisions.json"
FULL_JSON_PATH = ROOT / "data" / "chapter1.json"
ENGINE_MODULE_PATH = ROOT / "engine" / "decisions.js"
CROSSCHECK_COLUMNS = ["safety", "freedom", "def_safety", "def_freedom"]
SKIP_COLUMNS = {"payoff_in_chapter"}  # a spreadsheet formula, not data
HTML_PATH = ROOT / "index.html"
EMBED_PATTERN = re.compile(
    r'(<script id="decision-data" type="application/json">).*?(</script>)', re.DOTALL
)

DECISION_FIELDS = ["decision_id", "month", "age", "situation_text"]
OPTION_FIELDS = [
    "option_id",
    "option_label",
    "immediate_text",
    "deferred_offset_months",
    "deferred_text",
]

# Phase 0 has no engine. These are the figures readers saw before the text was
# tokenised, and they mirror the Phase 0 sample column in section 10.1.
PHASE0_SAMPLES = {
    ("D01-C", "deferred_text"): {"retirement_balance": "41,000"},
    ("D16-A", "immediate_text"): {"equity_change_pct": "down 2%"},
    ("D16-A", "deferred_text"): {"equity_down_months": "four", "equity_balance": "78,000", "equity_contributed": "70,000"},
    ("D20", "situation_text"): {"equity_change_pct": "up 9%"},
    ("D20-A", "immediate_text"): {"equity_change_pct": "up 7%"},
    ("D20-A", "deferred_text"): {"equity_change_pct": "down 22%"},
    ("D20-B", "deferred_text"): {"equity_change_pct": "down 22%"},
    ("D20-D", "deferred_text"): {"equity_change_pct": "down 22%"},
    ("D28", "situation_text"): {"monthly_costs": "34,000"},
    ("D28-B", "immediate_text"): {"stopped_monthly": "5,000"},
}
TOKEN = re.compile(r"\{(\w+)\}")

# Rule 29 (maths doc section 10): the preconditions an option can name in `requires`. An option
# with `modifies_commitment` needs none: it is offered while one of its targets runs.
REQUIRES = {"index", "no_index"}


def requires_of(option):
    value = option.get("requires")
    value = value.strip() if isinstance(value, str) else value
    if not value:
        return None
    if value not in REQUIRES:
        sys.exit(f"{option['option_id']}: requires {value!r} is not one of {sorted(REQUIRES)}")
    return value


def targets_of(option):
    targets = option.get("modifies_commitment")
    return [t.strip() for t in targets.split(",") if t.strip()] if targets else []


def read_sheet(wb, name):
    """Return the sheet's rows as dicts keyed by header name, skipping blank rows."""
    rows = wb[name].iter_rows(values_only=True)
    headers = next(rows)
    records = []
    for row in rows:
        if all(v is None for v in row):
            continue
        records.append(dict(zip(headers, row)))
    return headers, records


def fill_tokens(text, key):
    """Replace tokens with Phase 0 samples, capitalising a token that starts a sentence."""
    if not isinstance(text, str) or not TOKEN.search(text):
        return text
    samples = PHASE0_SAMPLES.get(key, {})

    def replace(match):
        name = match.group(1)
        if name not in samples:
            sys.exit(f"{key[0]} {key[1]}: no Phase 0 sample for {{{name}}}")
        value = samples[name]
        before = text[:match.start()].rstrip()
        if before == "" or before.endswith((".", "?", "!")):
            value = value[0].upper() + value[1:]
        return value

    return TOKEN.sub(replace, text)


def require_columns(sheet, headers, needed):
    missing = [c for c in needed if c not in headers]
    if missing:
        sys.exit(f"{sheet} sheet is missing columns: {', '.join(missing)}")


def main():
    wb = load_workbook(XLSX_PATH, read_only=True, data_only=True)

    dec_headers, decisions = read_sheet(wb, "Decisions")
    opt_headers, options = read_sheet(wb, "Options")
    require_columns("Decisions", dec_headers, DECISION_FIELDS + ["phase0_test"])
    require_columns("Options", opt_headers, OPTION_FIELDS + ["decision_id"])

    selected = [
        d for d in decisions
        if isinstance(d["phase0_test"], str) and d["phase0_test"].strip().upper() == "Y"
    ]
    selected.sort(key=lambda d: (d["month"], d["decision_id"]))

    options_by_decision = {}
    for o in options:
        options_by_decision.setdefault(o["decision_id"], []).append(o)

    output = []
    for d in selected:
        entry = {f: fill_tokens(d[f], (d["decision_id"], f)) for f in DECISION_FIELDS}
        opts = options_by_decision.get(d["decision_id"], [])
        if not opts:
            sys.exit(f"{d['decision_id']} has no options")
        entry["options"] = []
        for o in sorted(opts, key=lambda o: o["option_id"]):
            opt = {f: fill_tokens(o[f], (o["option_id"], f)) for f in OPTION_FIELDS}
            opt["deferred_offset_months"] = int(opt["deferred_offset_months"] or 0)
            # Rule 29: the harness offers an option only when its precondition holds
            opt["requires"] = requires_of(o)
            opt["modifies_commitment"] = targets_of(o)
            entry["options"].append(opt)
        output.append(entry)

    JSON_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(JSON_PATH, "w", encoding="utf-8", newline="\n") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
        f.write("\n")

    n_opts = sum(len(d["options"]) for d in output)
    print(f"Wrote {len(output)} decisions, {n_opts} options to {JSON_PATH.relative_to(ROOT)}")

    embed_in_html(output)
    export_full_sheet(decisions, options)


def export_full_sheet(decisions, options):
    """Every decision and option, keyed by id, for the engine."""
    full = {}
    for d in sorted(decisions, key=lambda d: (d["month"], d["decision_id"])):
        entry = {k: v for k, v in d.items() if k not in SKIP_COLUMNS}
        entry["options"] = {}
        full[d["decision_id"]] = entry
    for o in sorted(options, key=lambda o: o["option_id"]):
        if o["decision_id"] not in full:
            sys.exit(f"{o['option_id']} belongs to unknown decision {o['decision_id']}")
        option = {k: v for k, v in o.items() if k not in SKIP_COLUMNS and k not in CROSSCHECK_COLUMNS}
        option["crosscheck"] = {k: o[k] for k in CROSSCHECK_COLUMNS}
        option["modifies_commitment"] = targets_of(o)
        option["requires"] = requires_of(o)
        full[o["decision_id"]]["options"][o["option_id"]] = option

    payload = json.dumps(full, ensure_ascii=False, indent=2)
    FULL_JSON_PATH.write_text(payload + "\n", encoding="utf-8", newline="\n")
    ENGINE_MODULE_PATH.write_text(
        f"// Generated by scripts/xlsx_to_json.py from {XLSX_PATH.name}. Do not edit by hand.\n\n"
        f"const DECISIONS = {payload};\n\nexport default DECISIONS;\n",
        encoding="utf-8",
        newline="\n",
    )
    n_opts = sum(len(d["options"]) for d in full.values())
    print(f"Wrote {len(full)} decisions, {n_opts} options to {FULL_JSON_PATH.relative_to(ROOT)} and {ENGINE_MODULE_PATH.relative_to(ROOT)}")


def embed_in_html(output):
    """Copy the data into index.html so the page opens from disk without a server."""
    if not HTML_PATH.exists():
        return
    html = HTML_PATH.read_text(encoding="utf-8")
    payload = json.dumps(output, ensure_ascii=False, indent=2).replace("</", "<\\/")
    new_html, count = EMBED_PATTERN.subn(lambda m: m.group(1) + "\n" + payload + "\n" + m.group(2), html)
    if count != 1:
        sys.exit(f"Could not find the decision-data script block in {HTML_PATH.name}")
    HTML_PATH.write_text(new_html, encoding="utf-8", newline="\n")
    print(f"Embedded data in {HTML_PATH.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
