// Where the written chapter 2 ends, for now: the month after the last one the sheet has decisions
// in (month 31 since sheet v35). Home cannot stand here, because its button would start a month
// with nothing in it. Its words are placeholders until the product owner writes them.

const LINE = "[PLACEHOLDER opening end. Brief: the opening of chapter two is played; the rest of the chapter is being written. States: none]";
const LIFE_SO_FAR = "See your life so far";

// chapter: { number } in words. month, age: the engine's. onTimeline: the life so far
export function openingEndScreen({ chapter, month, age, onTimeline }) {
  const screen = document.createElement("section");
  screen.className = "screen report";
  screen.dataset.screen = "opening-end";

  const head = document.createElement("div");
  head.className = "report-head";
  const label = document.createElement("div");
  label.className = "month-label";
  label.textContent = `Chapter ${chapter.number} · Month ${month}. You are ${age}.`;
  const line = document.createElement("p");
  line.className = "report-next-line";
  line.textContent = LINE;
  head.append(label, line);

  const grow = document.createElement("div");
  grow.className = "grow";
  const foot = document.createElement("div");
  foot.className = "report-foot";
  const button = document.createElement("button");
  button.type = "button";
  button.className = "action";
  button.textContent = LIFE_SO_FAR;
  button.addEventListener("click", onTimeline);
  foot.append(button);

  screen.append(head, grow, foot);
  return screen;
}
