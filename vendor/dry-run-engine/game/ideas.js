// The ideas: a chapter's concept cards as a collection (UI.md rule 10, ruled 31 October 2026).
// Every card is the engine's (chapterConcepts), in the order CONCEPTS.md set them. A card comes
// at its month's close, whatever was chosen in it, and is collected once the player ticks it
// there (ruled 3 November 2026). Until its month closes it is locked, and says only which month it
// waits for; once its month has closed and until it is ticked, it is waiting, and the collection
// can tick it too.
//
// Each collected card opens its long version (game/concepts-long.js), written by hand. Its one
// figure of the player's own, {runway}, is their runway on the morning of that card's month.
//
// No DOM, so game/test/ideas.test.js checks it in Node. The count is the product owner's words:
// "12 of 20 ideas".

import { chapterConcepts, explainBars } from "../engine/index.js";
import { formatMonths } from "../text/render.js";
import { replay } from "./save.js";
import LONG from "./concepts-long.js";

export const ideasCount = (collected, total) => `${collected} of ${total} ideas`;

// closed: the last month closed, 0 for none. ticked: the months whose idea the player has ticked,
// or null to count every closed month's, as before ideas were ticked. Returns every card with
// whether it is collected or waiting, how many are collected, and the count in words
export function ideasSoFar(closed, chapter = 1, ticked = null) {
  const cards = chapterConcepts(chapter).map((card) => {
    const reached = card.month <= closed;
    const collected = reached && (ticked === null || ticked.includes(card.month));
    return { ...card, collected, waiting: reached && !collected };
  });
  const collected = cards.filter((card) => card.collected).length;
  return { cards, collected, total: cards.length, count: ideasCount(collected, cards.length) };
}

// The long version of a month's card, its figures filled for this player: { title, paragraphs },
// or null for a month that has none. save: the player's, for their own figures
export function longIdea(month, save) {
  const entry = LONG[String(month)];
  if (!entry) return null;
  const values = { runway: null };
  if (entry.paragraphs.some((p) => p.includes("{runway}"))) values.runway = morningRunway(save, month);
  const fill = (text) => text.replace(/\{(\w+)\}/g, (whole, key) => values[key] ?? whole);
  return { title: entry.title, paragraphs: entry.paragraphs.map(fill) };
}

// The runway the player had as the month began, worded as Home words it beside Safety
function morningRunway(save, month) {
  let runway = null;
  replay(save, {
    onMonthStart: (state) => {
      if (state.month === month) runway = formatMonths(explainBars(state).safety.runway_months);
    },
  });
  return runway;
}
