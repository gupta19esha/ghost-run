// The decision screen, built to design/Decision.html: the illustration on its colour block,
// the month, the situation, "why does this matter?", then the option cards at the bottom,
// in thumb reach (UI.md rule 5). No bars here (UI.md rule 1). Every card looks the same:
// colour never appears on an unchosen option (UI.md rule 7).
//
// Net worth sits at the right of the month line, in marigold (ruled 28 September 2026, the
// named exception to UI.md rule 1): the player sees the balance before choosing. It is the
// engine's figure before this choice, formatted by text/, and it does not move here.
//
// A screen that would not fit takes the compact layout four-option decisions always use
// (ruled 28 September 2026): measured once it is on the page, so a long situation or long
// option labels on a small phone never push the last card off the screen.
//
// The copy is the sheet's, passed in already filled by text/. The artboard's wording differs
// in places, such as "Submit the declaration now"; the sheet wins, because the UI writes no
// copy (UI.md build rule 3).

import { illustration } from "./illustrations.js";

const MONTH_LABEL = "Month";
const WHY = "why does this matter?";

// decision: from the engine. situation: the situation text, filled. onChoose(optionId).
// netWorth: the engine's net worth before this choice, already formatted by text/, or null
export function decisionScreen({ decision, month, situation, netWorth = null, onChoose }) {
  const screen = document.createElement("section");
  // Four options need more of the screen: the illustration and situation give up room so
  // the last card stays in thumb reach (UI.md rule 5)
  const many = Object.keys(decision.options).length >= 4;
  screen.className = many ? "screen decision compact" : "screen decision";
  screen.dataset.screen = "decision";

  const body = document.createElement("div");
  body.className = "decision-body";

  const label = document.createElement("div");
  label.className = "decision-month";
  const monthName = document.createElement("span");
  monthName.className = "month-label";
  monthName.textContent = `${MONTH_LABEL} ${month}`;
  label.append(monthName);
  if (netWorth !== null) {
    const worth = document.createElement("span");
    worth.className = "decision-worth money";
    worth.textContent = netWorth;
    label.append(worth);
  }

  const text = document.createElement("p");
  text.className = "situation";
  text.textContent = situation;
  body.append(label, text);

  if (decision.why_it_matters) {
    const why = document.createElement("button");
    why.type = "button";
    why.className = "why";
    why.textContent = WHY;
    why.setAttribute("aria-expanded", "false");
    const answer = document.createElement("p");
    answer.className = "why-answer";
    answer.id = `why-${decision.decision_id}`;
    answer.textContent = decision.why_it_matters;
    answer.hidden = true;
    why.setAttribute("aria-controls", answer.id);
    why.addEventListener("click", () => {
      answer.hidden = !answer.hidden;
      why.setAttribute("aria-expanded", String(!answer.hidden));
    });
    body.append(why, answer);
  }

  const grow = document.createElement("div");
  grow.className = "grow";

  const options = document.createElement("div");
  options.className = "options";
  for (const option of Object.values(decision.options)) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "option";
    card.dataset.optionId = option.option_id;
    card.textContent = option.option_label;
    card.addEventListener("click", () => {
      for (const other of options.querySelectorAll(".option")) other.disabled = true;
      onChoose(option.option_id);
    });
    options.append(card);
  }

  screen.append(illustration(decision.decision_id, "full"), body, grow, options);

  // Once on the page: if the last card ends below the screen, take the compact layout
  screen.start = () => {
    if (screen.classList.contains("compact")) return;
    const last = options.lastElementChild;
    if (last && last.getBoundingClientRect().bottom > window.innerHeight) screen.classList.add("compact");
  };
  return screen;
}
