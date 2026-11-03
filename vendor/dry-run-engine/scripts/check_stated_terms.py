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
# A "term" source is a sheet column in months. The copy states a term in words, such as
# "One year" or "twelve months", which term_in_months turns into a number of months.
NUMBER_WORDS = {
    "a": 1, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "eighteen": 18,
    "twenty-four": 24, "forty": 40, "half": 0.5,
}

# The long versions of the concept cards (game/concepts-long.js), held to the same standard:
# every figure they state is the engine's, or the sheet's own copy restated. Each row is
# (month, pattern capturing the figure, source). Sources:
#   ("constant", NAME, scale)          a section 12 constant, times scale
#   ("complement", NAME, scale)        1 minus a constant, times scale
#   ("annual_from_monthly", NAME)      as in STATED_TERMS
#   ("real_raise", "D13")              as in STATED_TERMS
#   ("lpa_offer", (option, path))      as in STATED_TERMS
#   ("sheet", sheet, id, column, pattern)  the figure the sheet's copy states there, the same
#   ("column", option, column, scale)  an option's column, times scale
#   ("term", option, column)           an option's column in months, the long text in words
#   ("word", NAME)                     a number word, equal to a constant
#   ("emi_total", option) / ("emi_gap", option)  the EMI's payments added up, less the cash price
#   ("card_keeps",)                    the share of a card balance left after a minimum payment
#   ("over_a_year", sheet, id, column, pattern)  a monthly rate from the sheet, multiplied 12 times,
#                                      as a whole percent the text says it is "over"
#   ("health_full_at_start",)          the company cover fills Safety's health share at the
#                                      starting salary, stated as that cover in lakhs
# Any figure in the long text that no row captures is a problem too, so a new one cannot go
# unchecked. "month 22" and "section 80C" are names, not figures.
LONG_PATH = ROOT / "game" / "concepts-long.js"
LONG_TERMS = [
    (1, r"the letter said ([\d,]+)", ("sheet", "Decisions", "D01", "situation_text", r"The letter said ([\d,]+)")),
    (1, r"the bank said ([\d,]+)", ("constant", "SALARY_NET_START", 1)),
    (2, r"each month, ([\d.]+)% of that month", ("constant", "CASH_LEAK_RATE", 100)),
    (2, r"a transfer of ([\d,]+) or", ("column", "D04-A", "money_monthly", -1)),
    (2, r"or ([\d,]+) is saved in full", ("column", "D04-B", "money_monthly", -1)),
    (3, r"was ([\d,]+) a month, paying out", ("column", "D05-A", "money_monthly", -1)),
    (3, r"paying out after (\d+) years", ("sheet", "Decisions", "D05", "situation_text", r"pays out after (\d+) years")),
    (3, r"returns about ([\d.]+)% a year, where", ("constant", "ENDOWMENT_EFFECTIVE_RETURN", 100)),
    (3, r"recurring deposit returns about ([\d.]+)%", ("constant", "FD_ANNUAL_RATE", 100)),
    (3, r"its ([\d,]+) counts against Freedom", ("column", "D05-A", "money_monthly", -1)),
    (4, r"the same ([\d,]+) could go", ("sheet", "Decisions", "D07", "situation_text", r"You have ([\d,]+) set aside")),
    (4, r"savings account pays about ([\d.]+)%", ("constant", "SAVINGS_ANNUAL_RATE", 100)),
    (4, r"deposit pays about ([\d.]+)%", ("constant", "FD_ANNUAL_RATE", 100)),
    (4, r"breaking it early costs ([\d.]+)%", ("constant", "FD_BREAK_PENALTY", 100)),
    (4, r"liquid fund pays about ([\d.]+)%", ("constant", "LIQUID_FUND_ANNUAL_RATE", 100)),
    (4, r"after the ([\d.]+)% it would cost", ("constant", "FD_BREAK_PENALTY", 100)),
    (5, r"covered you for ([\d.]+) lakhs", ("constant", "HEALTH_COVER_START", 1 / 100000)),
    (5, r"offered ([\d.]+) lakhs more", ("sheet", "Decisions", "D09", "situation_text", r"offers ([\d.]+) lakhs more")),
    (5, r"more for ([\d,]+) a month", ("column", "D09-A", "money_monthly", -1)),
    (5, r"reaches (half) a year's pay", ("word", "SAFETY_HEALTH_COVER_MULTIPLE")),
    (5, r"the company's ([\d.]+) lakhs is already there", ("health_full_at_start",)),
    (5, r"a bill larger than ([\d.]+) lakhs", ("constant", "HEALTH_COVER_START", 1 / 100000)),
    (6, r"the phone was ([\d,]+), or", ("column", "D11-C", "asset_acquired_value", 1)),
    (6, r"or ([\d,]+) a month for twelve", ("column", "D11-C", "money_monthly", -1)),
    (6, r"a month for (twelve months)", ("term", "D11-C", "commitment_months")),
    (6, r"(Twelve) payments of", ("term", "D11-C", "commitment_months")),
    (6, r"payments of ([\d,]+) come to", ("column", "D11-C", "money_monthly", -1)),
    (6, r"come to ([\d,]+)\.", ("emi_total", "D11-C")),
    (6, r"The ([\d,]+) between them", ("emi_gap", "D11-C")),
    (6, r"It is about ([\d.]+)% of what", ("constant", "NO_COST_EMI_MARKUP", 100)),
    (6, r"The ([\d,]+) then leaves", ("column", "D11-C", "money_monthly", -1)),
    (6, r"every month for (a year)", ("term", "D11-C", "commitment_months")),
    (6, r"([\d.]+)% of its price a year", ("constant", "PHONE_DEPRECIATION_ANNUAL", 100)),
    (8, r"the appraisal was ([\d.]+)%", ("sheet", "Decisions", "D13", "situation_text", r"First appraisal: ([\d.]+)%")),
    (8, r"Prices that year rose about ([\d.]+)%", ("annual_from_monthly", "INFLATION_MONTHLY_RATE")),
    (8, r"the raise was about ([\d.]+)%, not", ("real_raise", "D13")),
    (8, r", not ([\d.]+)%\.", ("sheet", "Decisions", "D13", "situation_text", r"First appraisal: ([\d.]+)%")),
    (8, r"every month, about ([\d.]+)% a year", ("annual_from_monthly", "INFLATION_MONTHLY_RATE")),
    (9, r"the bonus was ([\d.]+) lakhs", ("sheet", "Decisions", "D14", "situation_text", r"Your bonus lands\. ([\d.]+) lakhs")),
    (9, r"loses ([\d.]+)% in that same month", ("constant", "CASH_LEAK_RATE", 100)),
    (10, r"choice was ([\d,]+) a month into a broad", ("column", "D16-A", "money_monthly", -1)),
    (10, r"index, ([\d,]+) a month into a recurring", ("column", "D16-B", "money_monthly", -1)),
    (10, r"recurring deposit at about ([\d.]+)%", ("constant", "FD_ANNUAL_RATE", 100)),
    (11, r"charges ([\d.]+)% a month", ("constant", "CARD_MONTHLY_RATE", 100)),
    (11, r"minimum is ([\d.]+)% of the balance", ("constant", "CARD_MIN_PAYMENT_PCT", 100)),
    (11, r"keeps ([\d.]+)% of its balance", ("card_keeps",)),
    (11, r"The ([\d.]+) lakh limit", ("constant", "CARD_LIMIT", 1 / 100000)),
    (12, r"payroll said ([\d,]+) would go", ("sheet", "Decisions", "D18", "situation_text", r"lose ([\d,]+) to tax")),
    (12, r"with (three weeks) left", ("sheet", "Decisions", "D18", "situation_text", r"You have (three weeks)")),
    (14, r"colleague's ([\d.]+)% year", ("sheet", "Decisions", "D20", "situation_text", r"made ([\d.]+)% last year")),
    (14, r"set at ([\d.]+)%, the index", ("constant", "SMALL_CAP_ANNUAL_SIGMA", 100)),
    (14, r"the index's at ([\d.]+)%", ("constant", "EQUITY_ANNUAL_SIGMA", 100)),
    (15, r"offer was ([\d.]+) crore of cover", ("column", "D21-A", "term_cover_delta", 1 / 10000000)),
    (15, r"cover for about ([\d,]+) a month", ("column", "D21-A", "money_monthly", -1)),
    (15, r"premium was ([\d,]+) a month", ("column", "D21-C", "money_monthly", -1)),
    (15, r"for the same ([\d.]+) crore", ("column", "D21-C", "term_cover_delta", 1 / 10000000)),
    (15, r"at about ([\d.]+)% a year in this game", ("constant", "ENDOWMENT_EFFECTIVE_RETURN", 100)),
    (15, r"cover of (ten) years' pay", ("word", "SAFETY_TERM_COVER_MULTIPLE")),
    (16, r"loses ([\d.]+)% of its price each year", ("constant", "TWO_WHEELER_DEPRECIATION_ANNUAL", 100)),
    (16, r"worth ([\d.]+)% of what was paid", ("constant", "TWO_WHEELER_VALUE_FLOOR", 100)),
    (16, r"it cost ([\d,]+), or", ("column", "D22-A", "asset_acquired_value", 1)),
    (16, r"or ([\d,]+) a month for a year", ("column", "D22-A", "money_monthly", -1)),
    (16, r"a month for (a year)", ("term", "D22-A", "commitment_months")),
    (17, r"empty when ([\d.]+)% of your pay", ("constant", "FREEDOM_CEILING_RATIO", 100)),
    (17, r"good mark sits at ([\d.]+)%", ("constant", "FREEDOM_GOOD_COMMITTED", 100)),
    (17, r"loan had ([\d,]+) a month", ("column", "D23-A", "money_monthly", -1)),
    (17, r"run for (two years)", ("term", "D23-A", "commitment_months")),
    (18, r"wanted ([\d,]+) more", ("column", "D24-A", "money_monthly", -1)),
    (18, r"place (\d+) minutes further out saved", ("sheet", "Decisions", "D24", "situation_text", r"similar place (\d+) minutes")),
    (18, r"saved ([\d,]+), and", ("column", "D24-B", "money_monthly", 1)),
    (18, r"moving cost about ([\d,]+)", ("column", "D24-B", "money_once", -1)),
    (18, r"(Forty) minutes further out is", ("sheet", "Decisions", "D24", "situation_text", r"similar place (\d+) minutes")),
    (18, r"is (forty) minutes each way", ("sheet", "Decisions", "D24", "situation_text", r"similar place (\d+) minutes")),
    (20, r"large company at ([\d.]+) LPA", ("lpa_offer", ("D26-A", PAY_PATH_D26))),
    (20, r"startup at ([\d.]+) LPA", ("lpa_offer", ("D26-B", PAY_PATH_D26))),
    (20, r"a (six) person startup", ("sheet", "Decisions", "D26", "situation_text", r"A (six) person startup")),
    (21, r"reaches ([\d.]+)% of the starting salary", ("constant", "DISCRETIONARY_TARGET", 100)),
    (22, r"a deposit counts at ([\d.]+)%", ("complement", "FD_BREAK_PENALTY", 100)),
    (22, r"shares at ([\d.]+)%, what", ("constant", "EQUITY_CRISIS_HAIRCUT", 100)),
    (22, r"less than (one), the first", ("word", "SAFETY_DANGER_MONTHS")),
    (24, r"promised ([\d.]+)% a month", ("sheet", "Decisions", "D30", "situation_text", r"paying ([\d.]+)% a month")),
    (24, r"that is over ([\d.]+)%", ("over_a_year", "Decisions", "D30", "situation_text", r"paying ([\d.]+)% a month")),
    (24, r"pays about ([\d.]+)% a year", ("constant", "FD_ANNUAL_RATE", 100)),
    (24, r"on time for (eight) months", ("sheet", "Decisions", "D30", "situation_text", r"on time for (eight) months")),
]
# A figure in the long text: digits not part of a name such as "80C", and not a month's number
LONG_FIGURE = re.compile(r"(?<![\w.,])(?<!month )(?<!Month )\d+(?:,\d+)*(?:\.\d+)?(?![\w])")


def read_long(path):
    """The long versions, by month: their paragraphs joined, as the game shows them."""
    import json
    text = path.read_text(encoding="utf-8")
    body = json.loads(text[text.index("{", text.index("export default")):text.rindex("}") + 1])
    return {int(month): "\n\n".join(entry["paragraphs"]) for month, entry in body.items()}


def figure(phrase):
    """A stated figure as a number: digits, or a number word."""
    phrase = phrase.strip()
    if re.fullmatch(r"[\d,]+(?:\.\d+)?", phrase):
        return float(phrase.replace(",", ""))
    months = term_in_months(phrase)
    if months is not None:
        return months
    # A span the copy states in words, such as "three weeks", is held to the same words
    return NUMBER_WORDS.get(phrase.lower(), phrase.lower())


def check_long(long_texts, constants, sheets):
    problems = []
    covered = {month: [] for month in long_texts}
    for month, pattern, source in LONG_TERMS:
        text = long_texts.get(month, "")
        match = re.search(pattern, text)
        where = f"long version of month {month}"
        if not match:
            problems.append(f"{where}: stated term not found, text or pattern has changed: {pattern}")
            continue
        covered[month].append(match.span(1))
        stated = figure(match.group(1))
        kind = source[0]
        actual = None
        exact = True
        if kind == "constant":
            actual = constants.get(source[1])
            actual = None if actual is None else actual * source[2]
        elif kind == "complement":
            actual = None if source[1] not in constants else (1 - constants[source[1]]) * source[2]
        elif kind == "word":
            actual = constants.get(source[1])
        elif kind == "annual_from_monthly":
            actual = round(annual_from_monthly(constants[source[1]]) * 100, 2)
        elif kind == "real_raise":
            appraisal = re.search(APPRAISAL_PATTERN, sheets["Decisions"][source[1]]["situation_text"] or "")
            inflation = annual_from_monthly(constants["INFLATION_MONTHLY_RATE"])
            actual = round(((1 + float(appraisal.group(1)) / 100) / (1 + inflation) - 1) * 100)
        elif kind == "lpa_offer":
            letter = re.search(OFFER_LETTER_PATTERN, sheets["Decisions"]["D01"]["situation_text"] or "")
            gross = float(letter.group(1).replace(",", ""))
            option_id, earlier = source[1]
            offer = sheets["Options"][option_id]
            base = constants["SALARY_NET_START"] + sum(
                (sheets["Options"][e]["money_monthly"] or 0) for e in earlier
                if sheets["Options"][e].get("is_salary_change") == "Y"
            )
            in_hand = base + (offer["money_monthly"] or 0) + (offer["def_money_monthly"] or 0)
            actual = round(in_hand * gross / constants["SALARY_NET_START"] * 12 / 100000, 1)
        elif kind in ("sheet", "over_a_year"):
            _, sheet, row_id, column, sheet_pattern = source
            said = re.search(sheet_pattern, sheets[sheet][row_id][column] or "")
            actual = None if not said else figure(said.group(1))
            if kind == "over_a_year" and actual is not None:
                yearly = annual_from_monthly(actual / 100) * 100
                exact = False
                if not (stated < yearly < stated + 1):
                    problems.append(f"{where}: says over {match.group(1)}%, but {actual:g}% a month is {yearly:.2f}% a year")
                continue
        elif kind == "column":
            value = sheets["Options"][source[1]].get(source[2])
            actual = None if value is None else value * source[3]
        elif kind == "term":
            actual = sheets["Options"][source[1]].get(source[2])
        elif kind in ("emi_total", "emi_gap"):
            option = sheets["Options"][source[1]]
            total = -option["money_monthly"] * option["commitment_months"]
            actual = total if kind == "emi_total" else total - option["asset_acquired_value"]
        elif kind == "card_keeps":
            actual = round((1 - constants["CARD_MIN_PAYMENT_PCT"] + constants["CARD_MONTHLY_RATE"]) * 100, 2)
        elif kind == "health_full_at_start":
            cover = constants["HEALTH_COVER_START"]
            needed = 12 * constants["SALARY_NET_START"] * constants["SAFETY_HEALTH_COVER_MULTIPLE"]
            if cover < needed:
                problems.append(f"{where}: says the company cover fills the health share at the start, but it is {cover:,.0f} against {needed:,.0f}")
            actual = cover / 100000
        if exact and isinstance(stated, str):
            if stated != actual:
                problems.append(f"{where} states {match.group(1)!r}, but its source {source} says {actual!r}")
        elif exact and (stated is None or actual is None or abs(stated - float(actual)) > 1e-9):
            shown = "missing" if actual is None else f"{float(actual):g}"
            problems.append(f"{where} states {match.group(1)}, but its source {source} is {shown}")
    for month, text in long_texts.items():
        for found in LONG_FIGURE.finditer(text):
            if not any(start <= found.start() and found.end() <= end for start, end in covered[month]):
                problems.append(f"long version of month {month}: {found.group(0)} is not checked against anything")
    return problems
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

    problems += check_long(read_long(LONG_PATH), constants, sheets)

    if problems:
        print("Stated terms disagree with config:")
        for p in problems:
            print("  " + p)
        sys.exit(1)
    print(f"All {len(STATED_TERMS)} stated terms match, and all {len(LONG_TERMS)} in the long concept versions.")


if __name__ == "__main__":
    main()
