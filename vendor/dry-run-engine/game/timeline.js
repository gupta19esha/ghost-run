// The life so far, for the progress timeline (UI.md step 6): each month the player has
// played, what they chose in it, the result line each choice showed, and how net worth moved
// over the month. Read by replaying the save, so it is the same run the player played.
//
// Every figure is the engine's, and every line is the sheet's, filled by text/.
//
// roadStops turns that into the road the timeline draws: a stop for every month of the chapter.

import { tokenValues, monthSummary, chapterPlace } from "../engine/index.js";
import { renderText } from "../text/render.js";
import { replay } from "./save.js";

// Oldest first. A month partly played has its choices so far and no change yet.
export function lifeSoFar(save) {
  const months = new Map();
  const monthOf = (state) => {
    if (!months.has(state.month)) {
      months.set(state.month, { month: state.month, age: state.age, chapter: null, chapterTitle: null, decisionId: null, shock: null, choices: [], change: null });
    }
    return months.get(state.month);
  };
  const where = replay(save, {
    onChoice: (state, decision, optionId) => {
      const record = monthOf(state);
      record.chapter ??= decision.chapter;
      record.chapterTitle ??= decision.chapter_title ?? null;
      record.decisionId ??= decision.decision_id;
      record.shock ??= decision.shock ?? null;
      const option = decision.options[optionId];
      // Section 10.1: a result line with nothing left was never shown, so it is not here
      const line = renderText(option.immediate_text, tokenValues(state, { decisionId: decision.decision_id, optionId, field: "immediate_text" }));
      record.choices.push({ label: option.option_label, line });
    },
    onClose: (month, compared) => {
      const record = months.get(month);
      if (record) record.change = compared.netWorth.change;
    },
  });
  if (!where) return null;
  return [...months.values()];
}

// Every month of the chapter, oldest first. months: lifeSoFar. cards: game/ideas.js's cards.
// reached: the month the player is at, which may be past the chapter's last, or not yet begun. A
// month is played once it has a choice in it. What lies ahead carries only its month and that, so
// the road tells nothing of what will happen: not the layoff. An idea still locked shows as a
// locked marker, its title and not its body: that is the chapter's promise (UI.md rule 11)
export function roadStops(months, { chapter, cards, reached }) {
  const inChapter = [];
  for (let month = 1; chapterPlace(month); month++) if (chapterPlace(month).chapter === chapter) inChapter.push(month);
  const last = inChapter.at(-1);
  const here = Math.min(reached, last);
  return inChapter.map((month) => {
    const record = months.find((m) => m.month === month) ?? null;
    const card = cards.find((c) => c.month === month) ?? null;
    const lockedIdea = card && !card.collected ? card : null;
    if (!record) return { month, played: false, here: month === here, event: false, idea: null, lockedIdea };
    return {
      month,
      played: true,
      here: month === here,
      age: record.age,
      decisionId: record.decisionId,
      summary: monthSummary(month),
      change: record.change,
      choices: record.choices,
      event: record.shock !== null,
      idea: card?.collected ? card : null,
      lockedIdea,
    };
  });
}
