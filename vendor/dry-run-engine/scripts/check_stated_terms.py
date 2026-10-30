"""Flag any config constant that disagrees with a term the copy quotes to the player.

SIMULATION-MATHS.md rule 16: for Category A figures the copy is the source of truth and
section 12 must match it. Constants are read from the section 12 table, since there is
no engine config yet. Exits 1 if anything disagrees.

Usage: python scripts/check_stated_terms.py [xlsx] [maths doc]
"""

import re
import sys
from pathlib import Path

from openpyxl import load_workbook

ROOT = Path(__file__).resolve().parent.parent
XLSX_PATH = ROOT / "chapter1_decisions_v34.xlsx"
DOC_PATH = ROOT / "SIMULATION-MATHS.md"

# Mirrors the Category A table under rule 16 in SIMULATION-MATHS.md section 10.
# (sheet, id, column, pattern capturing the stated figure, what it must equal, scale)
# An "annual_from_monthly" source is a monthly rate multiplied 12 times, as a yearly
# percentage to two decimal places. The engine never computes a fractional power.
# A "real_raise" source is the D13 appraisal after a year of inflation, rounded to a whole
# percent, because the text says "About".
# A "costs_at_month" source is that constant inflated by (1 + INFLATION_MONTHLY_RATE) once
# for each month after month 1, plus the reference rent, rounded to the nearest 1,000.
# The pay a player has before each offer: the earlier options whose salary changes it holds.
# D13-A is the appraisal a player gets without pushing; D26-C is staying at D26. A figure is
# checked for this player; another path's pay differs by that path's own salary changes.
PAY_PATH_D26 = ["D13-A"]
PAY_PATH_D29 = ["D13-A", "D26-C"]

STATED_TERMS = [
    ("Options", "D16-B", "immediate_text", r"about ([\d.]+)% a year", ("constant", "FD_ANNUAL_RATE"), 100),
    ("Options", "D17-C", "deferred_text", r"near ([\d.]+)% a month", ("constant", "CARD_MONTHLY_RATE"), 100),
    ("Options", "D17-C", "immediate_text", r"minimum is only ([\d.]+)%", ("constant", "CARD_MIN_PAYMENT_PCT"), 100),
    # Month 11's concept card quotes the same rate D17-C does, so it is held to the constant too
    ("Decisions", "D17", "concept_body", r"costs about ([\d.]+)% a month", ("constant", "CARD_MONTHLY_RATE"), 100),
    ("Options", "D07-A", "immediate_text", r"Earns about ([\d.]+)%", ("constant", "SAVINGS_ANNUAL_RATE"), 100),
    ("Options", "D05-A", "deferred_text", r"Roughly ([\d.]+)% a year", ("constant", "ENDOWMENT_EFFECTIVE_RETURN"), 100),
    ("Decisions", "D13", "situation_text", r"Inflation this year was about ([\d.]+)%", ("annual_from_monthly", "INFLATION_MONTHLY_RATE"), 100),
    ("Options", "D13-A", "immediate_text", r"About ([\d.]+)% after inflation", ("real_raise", "D13"), 100),
    # The appraisal is a real raise since v31: D13-A's salary change on the starting in-hand,
    # and D13-B's extra over it
    ("Decisions", "D13", "situation_text", r"First appraisal: ([\d.]+)%", ("raise_pct", ("D13-A", None)), 1),
    ("Options", "D13-B", "immediate_text", r"You get another ([\d.]+)%", ("raise_pct", ("D13-B", "D13-A")), 1),
    # EMI purchases: the quoted cash price, payment and term match the sheet, and the cash
    # discount given up matches NO_COST_EMI_MARKUP to a whole percent (section 8)
    ("Decisions", "D11", "situation_text", r"The one you want is ([\d,]*\d), ", ("option_column", ("D11-C", "asset_acquired_value")), 1),
    ("Decisions", "D11", "situation_text", r"The one you want is ([\d,]*\d), or ([\d,]*\d) a month for (twelve months)", ("emi_markup", "NO_COST_EMI_MARKUP"), 100),
    ("Options", "D11-C", "option_label", r"^([\d,]+) a month", ("column", "money_monthly"), -1),
    ("Options", "D11-C", "option_label", r"a month for (twelve months)", ("term", "commitment_months"), 1),
    ("Options", "D11-C", "immediate_text", r"([\d,]+) committed every month", ("column", "money_monthly"), -1),
    ("Decisions", "D22", "situation_text", r"A scooter is ([\d,]*\d), ", ("option_column", ("D22-A", "asset_acquired_value")), 1),
    ("Decisions", "D22", "situation_text", r"A scooter is ([\d,]*\d), or ([\d,]*\d) a month for (a year)", ("emi_markup", "NO_COST_EMI_MARKUP"), 100),
    ("Options", "D22-A", "immediate_text", r"([\d,]+) committed for", ("column", "money_monthly"), -1),
    ("Options", "D22-A", "immediate_text", r"committed for (twelve months)", ("term", "commitment_months"), 1),
    ("Decisions", "D01", "situation_text", r"The bank says ([\d,]+)", ("constant", "SALARY_NET_START"), 1),
    ("Decisions", "D09", "situation_text", r"company covers you for ([\d.]+) lakhs", ("constant", "HEALTH_COVER_START"), 1 / 100000),
    ("Options", "D28-A", "immediate_text", r"Costs down to ([\d,]+)", ("costs_at_month", "MINIMUM_LIVING_START"), 1),
    ("Decisions", "D28", "situation_text", r"(One month) severance", ("term_constant", "LAYOFF_SEVERANCE_MONTHS"), 1),
    ("Decisions", "D17", "situation_text", r"([\d.]+) lakh limit", ("constant", "CARD_LIMIT"), 1 / 100000),
    ("Options", "D07-B", "option_label", r"^(One year) fixed deposit", ("term", "term_months"), 1),
    ("Options", "D07-B", "immediate_text", r"Locked for (twelve months)", ("term", "term_months"), 1),
    # Pay offers, as CTC. Each names the earlier pay choices the player it is checked against has
    # made, because a salary change folds into pay and every later offer is built on it (section 9)
    ("Decisions", "D29", "situation_text", r"One offer at ([\d.]+) LPA", ("lpa_offer", ("D29-A", PAY_PATH_D29)), 1),
    ("Options", "D29-A", "option_label", r"Take the ([\d.]+) LPA offer", ("lpa_offer", ("D29-A", PAY_PATH_D29)), 1),
    ("Options", "D29-B", "deferred_text", r"came through at ([\d.]+) LPA", ("lpa_offer", ("D29-B", PAY_PATH_D29)), 1),
    # D26's three figures, added 29 September 2026 after they were found to match no path
    ("Decisions", "D26", "situation_text", r"A large company at ([\d.]+) LPA", ("lpa_offer", ("D26-A", PAY_PATH_D26)), 1),
    ("Decisions", "D26", "situation_text", r"startup at ([\d.]+) LPA", ("lpa_offer", ("D26-B", PAY_PATH_D26)), 1),
    ("Options", "D26-A", "option_label", r"Large company, ([\d.]+) LPA", ("lpa_offer", ("D26-A", PAY_PATH_D26)), 1),
    ("Options", "D26-B", "option_label", r"Startup, ([\d.]+) LPA", ("lpa_offer", ("D26-B", PAY_PATH_D26)), 1),
    # D02's deposits, stated in each option since v27. The deposit is the option's one-off
    ("Options", "D02-A", "option_label", r"deposit ([\d,]+)", ("column", "money_once"), -1),
    ("Options", "D02-B", "option_label", r"deposit ([\d,]+)", ("column", "money_once"), -1),
    ("Options", "D02-C", "option_label", r"deposit ([\d,]+)", ("column", "money_once"), -1),
    # D20-D's lump, since v32, in its label and its callback
    ("Options", "D20-D", "option_label", r"Start with ([\d,]+) in small caps", ("column", "money_once"), -1),
    ("Options", "D20-D", "deferred_text", r"You started with ([\d,]+)", ("column", "money_once"), -1),
    # The opening cash, stated since v28 before D02 charges a deposit. It lives in the sheet
    # README, not section 12, because export_constants.py reads NET_WORTH_START from there
    ("Decisions", "D02", "situation_text", r"You have ([\d,]+) saved from before", ("readme", "Starting net worth"), 1),
    # Chapter 2's opening, D31 to D39 (sheet v35). Its copy is placeholder text, and each placeholder
    # carries the figures the final copy must quote after "States:". When the copy is written, these
    # patterns move to its wording, as chapter 1's did
    ("Options", "D31-A", "option_label", r"States: ([\d,]+) once", ("column", "money_once"), -1),
    ("Options", "D31-B", "option_label", r"States: ([\d,]+) a month", ("column", "money_monthly"), -1),
    ("Options", "D31-C", "option_label", r"States: ([\d,]+) spent", ("column", "money_once"), -1),
    ("Options", "D31-C", "option_label", r", ([\d,]+) kept", ("column", "money_once_2"), -1),
    ("Decisions", "D32", "situation_text", r"States: ([\d,]+)\]", ("option_column", ("D32-A", "money_once")), -1),
    ("Options", "D32-A", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
    ("Options", "D32-B", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
    ("Decisions", "D33", "situation_text", r"States: ([\d,]+) a month", ("option_column", ("D33-A", "money_monthly")), -1),
    ("Options", "D33-A", "option_label", r"States: ([\d,]+) a month", ("column", "money_monthly"), -1),
    ("Options", "D33-B", "option_label", r"States: ([\d,]+) a month", ("column", "money_monthly"), -1),
    ("Options", "D33-B", "option_label", r"a month for (24 months)", ("term", "commitment_months"), 1),
    ("Options", "D33-B", "option_label", r"a month for (24 months)", ("term", "term_months"), 1),
    ("Options", "D33-C", "option_label", r"States: ([\d,]+) a month", ("column", "money_monthly"), -1),
    ("Decisions", "D34", "situation_text", r"States: ([\d,]+)\]", ("option_column", ("D34-A", "money_once")), -1),
    ("Options", "D34-A", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
    ("Options", "D34-A", "deferred_text", r"States: ([\d,]+) a month more", ("column", "def_money_monthly"), 1),
    ("Options", "D34-B", "deferred_text", r"States: ([\d,]+) a month more", ("column", "def_money_monthly"), 1),
    ("Options", "D34-C", "deferred_text", r"States: ([\d,]+) a month more", ("column", "def_money_monthly"), 1),
    ("Decisions", "D35", "situation_text", r"States: ([\d,]+)\]", ("option_column", ("D35-A", "money_once")), -1),
    ("Options", "D35-A", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
    ("Options", "D35-B", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
    ("Options", "D35-C", "option_label", r"States: ([\d,]+) a month", ("column", "money_monthly"), -1),
    ("Options", "D35-C", "option_label", r"a month for (twelve months)", ("term", "commitment_months"), 1),
    ("Options", "D35-C", "immediate_text", r"States: ([\d,]+) in all", ("monthly_total", "money_monthly"), -1),
    ("Decisions", "D36", "situation_text", r"States: ([\d,]+), ", ("option_column", ("D36-A", "asset_acquired_value")), 1),
    ("Decisions", "D36", "situation_text", r", ([\d,]+) a month", ("option_column", ("D36-A", "money_monthly")), 1),
    ("Options", "D36-A", "option_label", r"States: ([\d,]+), ", ("column", "asset_acquired_value"), 1),
    ("Options", "D36-A", "option_label", r"States: ([\d,]+), ", ("column", "money_once"), -1),
    ("Options", "D36-A", "option_label", r", ([\d,]+) a month", ("column", "money_monthly"), 1),
    ("Options", "D36-A", "option_label", r"a month for (twelve months)", ("term", "commitment_months"), 1),
    ("Options", "D36-B", "option_label", r"States: ([\d,]+), ", ("column", "asset_acquired_value"), 1),
    ("Options", "D36-B", "option_label", r"States: ([\d,]+), ", ("column", "money_once"), -1),
    ("Options", "D36-B", "option_label", r", ([\d,]+) a month", ("column", "money_monthly"), 1),
    ("Options", "D36-B", "option_label", r"a month for (twelve months)", ("term", "commitment_months"), 1),
    ("Options", "D36-C", "option_label", r"States: ([\d,]+) a month rent", ("column", "money_monthly"), -1),
    ("Options", "D36-C", "option_label", r"rent, ([\d,]+) a month in", ("column", "money_monthly_2"), 1),
    ("Options", "D36-C", "option_label", r"for (six months)", ("term", "commitment_months"), 1),
    ("Decisions", "D37", "situation_text", r"States: ([\d,]+)\]", ("column", "income_event"), 1),
    ("Options", "D37-A", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
    ("Options", "D37-B", "option_label", r"States: ([\d,]+) in gold", ("column", "money_once"), -1),
    ("Options", "D37-B", "option_label", r"gold, ([\d,]+) for", ("column", "money_once_2"), -1),
    ("Options", "D37-B", "option_label", r"for (a year)", ("term", "term_months"), 1),
    ("Options", "D37-C", "option_label", r"States: ([\d,]+) on the trip", ("column", "money_once"), -1),
    ("Options", "D37-C", "option_label", r"trip, ([\d,]+) kept", ("column", "money_once_2"), -1),
    ("Decisions", "D38", "situation_text", r"States: ([\d,]+) a month more", ("option_column", ("D38-A", "money_monthly")), 1),
    ("Options", "D38-A", "option_label", r"States: ([\d,]+) a month more", ("column", "money_monthly"), 1),
    ("Options", "D38-B", "option_label", r"States: ([\d,]+) a month more", ("column", "money_monthly"), 1),
    ("Options", "D38-C", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
    ("Decisions", "D39", "situation_text", r"States: ([\d,]+)\]", ("option_column", ("D39-C", "money_once")), -1),
    ("Options", "D39-A", "option_label", r"States: (six months)", ("term", "commitment_months"), 1),
    ("Options", "D39-B", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
    ("Options", "D39-C", "option_label", r"States: ([\d,]+) for", ("column", "money_once"), -1),
    ("Options", "D39-C", "option_label", r"for (a year)", ("term", "term_months"), 1),
    ("Options", "D39-D", "option_label", r"States: ([\d,]+)\]", ("column", "money_once"), -1),
]
# An "lpa_offer" source is a job offer quoted as a yearly CTC in lakhs. The option's monthly
# salary change (money_monthly, or def_money_monthly when the offer arrives by callback) on
# SALARY_NET_START gives the in-hand pay, which converts to CTC at D01's
# ratio of the letter's salary to SALARY_NET_START, to one decimal place.
# A "raise_pct" source is a salary change as a percentage of SALARY_NET_START, to one decimal
# place for a figure with a decimal point and to a whole percent otherwise: (option, None), or
# (option, other) for the part of one option's raise above another's.
# A "readme" source is a labelled row of the sheet README, read the way export_constants.py
# reads it: the number at the start of the value.
# A "monthly_total" source is a monthly column over the option's whole commitment_months: what
# a payment plan costs in all (D35-C).
# A "term" source is a sheet column in months. The copy states a term in words, such as
# "One year" or "twelve months", which term_in_months turns into a number of months.
NUMBER_WORDS = {
    "a": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "eighteen": 18,
    "twenty-four": 24,
}
# D28-A's costs include rent, which depends on the player's path. The copy is checked
# against a player on the D02-B shared flat, section 2.
REFERENCE_RENT_OPTION = "D02-B"
OFFER_LETTER_PATTERN = r"The letter said ([\d,]+)"
APPRAISAL_PATTERN = r"First appraisal: ([\d.]+)%"


def annual_from_monthly(rate):
    growth = 1.0
    for _ in range(12):
        growth *= 1 + rate
    return growth - 1


def term_in_months(phrase):
    """'One year' -> 12, 'twelve months' -> 12, '24 months' -> 24. None if unreadable."""
    match = re.fullmatch(r"([\w-]+) (year|years|month|months)", phrase.strip().lower())
    if not match:
        return None
    count = int(match.group(1)) if match.group(1).isdigit() else NUMBER_WORDS.get(match.group(1))
    if count is None:
        return None
    return count * 12 if match.group(2).startswith("year") else count


def read_constants(doc_path):
    text = doc_path.read_text(encoding="utf-8")
    section = re.search(r"^## 12\..*?(?=^## )", text, re.S | re.M)
    if not section:
        sys.exit("Section 12 not found in " + doc_path.name)
    constants = {}
    for name, value in re.findall(r"^\| `([A-Z_]+)` \| ([-\d.]+) \|", section.group(0), re.M):
        constants[name] = float(value)
    return constants


def read_readme(wb):
    values = {}
    for row in wb["README"].iter_rows(values_only=True):
        if row and row[0] and len(row) > 1:
            number = re.match(r"^\s*([\d,]+)", str(row[1]))
            if number:
                values.setdefault(row[0], float(number.group(1).replace(",", "")))
    return values


def read_rows(wb, sheet):
    ws = wb[sheet]
    headers = [c.value for c in ws[1]]
    return {row[0]: dict(zip(headers, row)) for row in ws.iter_rows(min_row=2, values_only=True) if row[0]}


def main():
    xlsx = Path(sys.argv[1]) if len(sys.argv) > 1 else XLSX_PATH
    doc = Path(sys.argv[2]) if len(sys.argv) > 2 else DOC_PATH
    constants = read_constants(doc)
    wb = load_workbook(xlsx, read_only=True, data_only=True)
    sheets = {name: read_rows(wb, name) for name in ("Decisions", "Options")}
    readme = read_readme(wb)

    problems = []
    for sheet, row_id, column, pattern, (kind, source), scale in STATED_TERMS:
        row = sheets[sheet].get(row_id)
        match = re.search(pattern, (row or {}).get(column) or "")
        if not match:
            problems.append(f"{row_id} {column}: stated term not found, text or pattern has changed")
            continue
        if kind == "emi_markup":
            months = term_in_months(match.group(3))
            if months is None or source not in constants:
                problems.append(f"{row_id} {column}: needs a readable term and {source} in section 12")
                continue
            cash = float(match.group(1).replace(",", ""))
            emi_total = float(match.group(2).replace(",", "")) * months
            stated = round((1 - cash / emi_total) * scale)
            actual = round(constants[source] * scale)
            if stated != actual:
                problems.append(
                    f"{row_id} {column}: {match.group(1)} cash against {emi_total:,.0f} on EMI is a "
                    f"{(1 - cash / emi_total) * 100:.2f}% markup, but {source} is {constants[source] * 100:g}%"
                )
            continue
        if kind in ("term", "term_constant"):
            stated = term_in_months(match.group(1))
            if stated is None:
                problems.append(f"{row_id} {column}: cannot read {match.group(1)!r} as a number of months")
                continue
        else:
            stated = float(match.group(1).replace(",", ""))
        if kind == "constant":
            if source not in constants:
                problems.append(f"{row_id} states {match.group(1)}, but {source} is missing from section 12")
                continue
            actual = constants[source] * scale
        elif kind == "annual_from_monthly":
            if source not in constants:
                problems.append(f"{row_id} states {match.group(1)}, but {source} is missing from section 12")
                continue
            actual = round(annual_from_monthly(constants[source]) * scale, 2)
            source = f"{source} over 12 months"
        elif kind == "real_raise":
            appraisal = re.search(APPRAISAL_PATTERN, sheets["Decisions"].get(source, {}).get("situation_text") or "")
            if not appraisal or "INFLATION_MONTHLY_RATE" not in constants:
                problems.append(f"{row_id}: needs the {source} appraisal and INFLATION_MONTHLY_RATE to check against")
                continue
            raise_pct = float(appraisal.group(1)) / 100
            inflation = annual_from_monthly(constants["INFLATION_MONTHLY_RATE"])
            actual = round(((1 + raise_pct) / (1 + inflation) - 1) * scale)
        elif kind == "costs_at_month":
            if source not in constants or "INFLATION_MONTHLY_RATE" not in constants:
                problems.append(f"{row_id}: needs {source} and INFLATION_MONTHLY_RATE in section 12")
                continue
            decision_id = row_id if sheet == "Decisions" else row["decision_id"]
            month = sheets["Decisions"][decision_id]["month"]
            rent = -sheets["Options"][REFERENCE_RENT_OPTION]["money_monthly"]
            # Same repeated multiplication as the engine, section 2
            index = 1.0
            for _ in range(month - 1):
                index *= 1 + constants["INFLATION_MONTHLY_RATE"]
            inflated = constants[source] * index
            actual = round(inflated + rent, -3)
            source = f"{source} at month {month} plus {rent:,} rent"
        elif kind == "lpa_offer":
            letter = re.search(OFFER_LETTER_PATTERN, sheets["Decisions"]["D01"]["situation_text"] or "")
            if not letter or "SALARY_NET_START" not in constants:
                problems.append(f"{row_id}: needs D01's letter salary and SALARY_NET_START to check against")
                continue
            gross = float(letter.group(1).replace(",", ""))
            option_id, earlier = source
            offer = sheets["Options"][option_id]
            # Salary so far: the starting in-hand plus each earlier option's salary change
            base = constants["SALARY_NET_START"] + sum(
                (sheets["Options"][e]["money_monthly"] or 0) for e in earlier
                if sheets["Options"][e].get("is_salary_change") == "Y"
            )
            in_hand = base + (offer["money_monthly"] or 0) + (offer["def_money_monthly"] or 0)
            ctc_monthly = in_hand * gross / constants["SALARY_NET_START"]
            actual = round(ctc_monthly * 12 / 100000, 1)
            source = f"{option_id}'s in-hand {in_hand:,.0f} as CTC, after {', '.join(earlier)}"
        elif kind == "raise_pct":
            option_id, over = source
            amount = sheets["Options"][option_id]["money_monthly"] or 0
            if over:
                amount -= sheets["Options"][over]["money_monthly"] or 0
            places = 1 if "." in match.group(1) else 0
            actual = round(amount / constants["SALARY_NET_START"] * 100, places)
            source = f"{option_id}'s {amount:,} a month" + (f" over {over}'s" if over else "") + " on SALARY_NET_START"
        elif kind == "term_constant":
            actual = constants.get(source)
        elif kind == "readme":
            value = readme.get(source)
            actual = None if value is None else value * scale
            source = f"the README's {source!r} row"
        elif kind == "monthly_total":
            value, months = row.get(source), row.get("commitment_months")
            actual = None if value is None or not months else value * months * scale
            source = f"{source} over {months} months"
        elif kind == "option_column":
            option_id, option_column = source
            value = sheets["Options"].get(option_id, {}).get(option_column)
            actual = None if value is None else value * scale
            source = f"{option_id} {option_column}"
        else:
            value = row.get(source)
            actual = None if value is None else value * scale
        if actual is None or abs(stated - float(actual)) > 1e-9:
            shown = "missing" if actual is None else f"{float(actual):g}"
            problems.append(f"{row_id} {column} states {match.group(1)}, but {source} is {shown}")

    if problems:
        print("Stated terms disagree with config:")
        for p in problems:
            print("  " + p)
        sys.exit(1)
    print(f"All {len(STATED_TERMS)} stated terms match.")


if __name__ == "__main__":
    main()
