// The chapter card's figures, with no DOM, so game/test/certificate.test.js checks them in
// Node. Every figure is the engine's and every piece of money is text/'s; the drawing
// (game/screens/certificate.js) only places them.
//
// What it holds, once the chapter's last month has closed: net worth and how it moved over the
// chapter, the three bars with the line beside each and how each moved, the shape of the
// chapter as net worth at the end of every month from where the run began, and one line of the
// run's own figures: how many choices, the best month and the hardest.

import {
  createState, getBars, compareBars, chapterMonths, decisionsForMonth, getDecision, safetyInDanger,
} from "../engine/index.js";
import { formatMoney, formatCount } from "../text/render.js";
import { barLabels } from "./labels.js";

export const CARD_BARS = [
  ["safety", "Safety"],
  ["freedom", "Freedom"],
  ["life", "Life"],
];

const way = (change) => (change > 0 ? "up" : change < 0 ? "down" : "flat");
const moved = (change) => (change === 0 ? "flat" : `${way(change)} ${formatMoney(Math.abs(change))}`);

// state: the engine's at the chapter's end. save: the run's, for its seed and its choices.
// chapter: which chapter closed.
export function chapterCard(state, save, chapter = 1) {
  const start = createState(save.seed);
  const months = chapterMonths(state, chapter);
  if (months.length === 0) throw new Error(`Chapter ${chapter} has no closed months`);
  // The chapter's title is the sheet's, on its first month's decisions
  const [first] = decisionsForMonth({ ...state, month: months[0].month, decisions_taken: {} });
  const bars = getBars(state);
  const compared = compareBars(getBars(start), bars);
  const labels = barLabels(state);
  const best = months.reduce((a, b) => (b.change > a.change ? b : a));
  const worst = months.reduce((a, b) => (b.change < a.change ? b : a));
  const choices = save.choices.filter((id) => getDecision(id.split("-")[0]).chapter === chapter).length;
  return {
    chapter: { number: formatCount(chapter), title: first.chapter_title },
    ages: { from: start.age, to: state.age },
    years: formatCount(months.length / 12),
    netWorth: { value: bars.netWorth, text: formatMoney(bars.netWorth) },
    change: { value: compared.netWorth.change, way: way(compared.netWorth.change), text: formatMoney(Math.abs(compared.netWorth.change)) },
    bars: CARD_BARS.map(([key, name]) => ({
      key,
      name,
      value: bars[key],
      label: labels[key],
      way: way(compared[key].change),
      // UI.md rule 4: Safety in danger is vermilion whatever it did
      danger: key === "safety" && safetyInDanger(state),
    })),
    shape: [{ month: 0, net_worth: getBars(start).netWorth }, ...months.map(({ month, net_worth }) => ({ month, net_worth }))],
    line: `${choices} choices, ${months.length} months. Best month ${best.month}, ${moved(best.change)}. Hardest month ${worst.month}, ${moved(worst.change)}.`,
  };
}
