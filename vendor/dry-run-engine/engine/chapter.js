// A chapter as a whole, for the chapter report (CHAPTER-REPORT.md). The engine already keeps
// each month's net worth in state.history; this only exposes it by chapter.
//
// A chapter is the months its decisions fall in, from the sheet's chapter column.

import DECISIONS from "./decisions.js";
import { createState } from "./state.js";
import { netWorth } from "./bars.js";
import { conceptForMonth } from "./content.js";

function monthsOfChapter(chapter, decisions) {
  return [...new Set(Object.values(decisions).filter((d) => d.chapter === chapter).map((d) => d.month))].sort((a, b) => a - b);
}

// Each month of the chapter the player has closed, oldest first: its net worth at the month's
// end and how far it moved over the month. The first month moves from the run's starting
// position. The report names the highest and lowest from these; it never attributes a month's
// change to a choice (maths doc section 14).
export function chapterMonths(state, chapter = 1, decisions = DECISIONS) {
  const months = new Set(monthsOfChapter(chapter, decisions));
  let before = netWorth(createState(state.seed));
  const rows = [];
  for (const row of state.history) {
    if (months.has(row.month)) rows.push({ month: row.month, net_worth: row.net_worth, change: row.net_worth - before });
    before = row.net_worth;
  }
  return rows;
}

// Every month of the chapter has been played and closed
export function chapterComplete(state, chapter = 1, decisions = DECISIONS) {
  const months = monthsOfChapter(chapter, decisions);
  return months.length > 0 && state.month > months[months.length - 1];
}

// Where a month sits in its chapter: the chapter, its number of months, and which of them this
// is, counting from 1. For the chapter's progress bar (UI.md rule 10). null for a month no
// decision falls in, such as the one after the chapter's last.
export function chapterPlace(month, decisions = DECISIONS) {
  const carrier = Object.values(decisions).find((d) => d.month === month);
  if (!carrier) return null;
  const months = monthsOfChapter(carrier.chapter, decisions);
  return { chapter: carrier.chapter, index: months.indexOf(month) + 1, length: months.length };
}

// Every concept card the chapter holds, in month order: { month, title, body, decision_id }.
// The months that carry none are left out (CONCEPTS.md), so Chapter 1 has twenty.
export function chapterConcepts(chapter = 1, decisions = DECISIONS) {
  return monthsOfChapter(chapter, decisions)
    .map((month) => ({ month, card: conceptForMonth(month, decisions) }))
    .filter(({ card }) => card)
    .map(({ month, card }) => ({ month, ...card }));
}
