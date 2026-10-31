// The ideas: a chapter's concept cards as a collection (UI.md rule 10, ruled 31 October 2026).
// Every card is the engine's (chapterConcepts), in the order CONCEPTS.md set them. A card is
// collected once its month has closed, whatever was chosen in it, as month close already shows
// it; until then it is locked, and says only which month it waits for.
//
// No DOM, so game/test/ideas.test.js checks it in Node. The count is the product owner's words:
// "12 of 20 ideas".

import { chapterConcepts } from "../engine/index.js";

export const ideasCount = (collected, total) => `${collected} of ${total} ideas`;

// closed: the last month closed, 0 for none. Returns every card with whether it is collected,
// how many are, and the count in words
export function ideasSoFar(closed, chapter = 1) {
  const cards = chapterConcepts(chapter).map((card) => ({ ...card, collected: card.month <= closed }));
  const collected = cards.filter((card) => card.collected).length;
  return { cards, collected, total: cards.length, count: ideasCount(collected, cards.length) };
}
