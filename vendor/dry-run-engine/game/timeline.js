// The life so far, for the progress timeline (UI.md step 6): each month the player has
// played, what they chose in it, the result line each choice showed, and how net worth moved
// over the month. Read by replaying the save, so it is the same run the player played.
//
// Every figure is the engine's, and every line is the sheet's, filled by text/.

import { tokenValues } from "../engine/index.js";
import { renderText } from "../text/render.js";
import { replay } from "./save.js";

// Oldest first. A month partly played has its choices so far and no change yet.
export function lifeSoFar(save) {
  const months = new Map();
  const monthOf = (state) => {
    if (!months.has(state.month)) {
      months.set(state.month, { month: state.month, age: state.age, chapter: null, chapterTitle: null, choices: [], change: null });
    }
    return months.get(state.month);
  };
  const where = replay(save, {
    onChoice: (state, decision, optionId) => {
      const record = monthOf(state);
      record.chapter ??= decision.chapter;
      record.chapterTitle ??= decision.chapter_title ?? null;
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
