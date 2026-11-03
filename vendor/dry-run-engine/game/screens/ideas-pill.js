// The ideas collected, as a button (ruled 3 November 2026): the count in the product owner's
// words, "3 of 20 ideas", beside a mark of two stacked cards, on a pill with a button's edge. It
// opens the collection. On Home and the chapter report it sits beside the screen's main button,
// where a thumb reaches; at month close it sits by the month's name, and a collected card flies
// into it. Nothing in it is money: no coin, no wallet, no points. What is counted is the ideas.

const SVG = "http://www.w3.org/2000/svg";

function cardsMark() {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("class", "ideas-pill-mark");
  svg.setAttribute("viewBox", "0 0 22 22");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<rect x="6.5" y="2" width="12" height="15" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8" opacity="0.55"/><rect x="2.5" y="5" width="12" height="15" rx="2.5" fill="var(--concept-ground)" stroke="currentColor" stroke-width="1.8"/><path d="M5.5 10h6M5.5 13.5h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>`;
  return svg;
}

// count: the count in words. onOpen: opens the collection. className: the screen's own name for it.
// Returns the button, with setCount(text) to take a new count with a pulse
export function ideasPill(count, onOpen, className = "") {
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = `ideas-pill ${className}`.trim();
  const text = document.createElement("span");
  text.className = "ideas-pill-count";
  text.textContent = count;
  pill.append(cardsMark(), text);
  pill.addEventListener("click", onOpen);
  pill.setCount = (next) => {
    text.textContent = next;
    pill.classList.remove("is-taking");
    // Reading the layout restarts the pulse when two arrive close together
    void pill.offsetWidth;
    pill.classList.add("is-taking");
  };
  return pill;
}
