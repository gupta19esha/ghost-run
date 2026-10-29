// How a bar or a figure moved, drawn the same way everywhere (UI.md rule 4): colour means
// change, not level. Rising is teal, falling vermilion, still slate.

export function direction(change) {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

// The small triangle in a change chip, pointing the way the figure moved
export function arrow(dir) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "9");
  svg.setAttribute("height", "9");
  svg.setAttribute("viewBox", "0 0 9 9");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = dir === "up"
    ? `<path d="M4.5 1 8 6.5H1L4.5 1Z" fill="currentColor"/>`
    : `<path d="M4.5 8 8 2.5H1L4.5 8Z" fill="currentColor"/>`;
  return svg;
}
