// The hook, from design/MonthClose.html: the "Next month" label, then next month's line.
// The label is design; the line is content, the sheet's hook_line (v23), the product owner's
// copy. Shown at month close and on the locked Home.

const NEXT_MONTH = "Next month";

export function hookBlock(line, extraClass = "") {
  const block = document.createElement("div");
  block.className = `hook ${extraClass}`.trim();
  const label = document.createElement("div");
  label.className = "month-label";
  label.textContent = NEXT_MONTH;
  const text = document.createElement("p");
  text.className = "hook-line";
  text.textContent = line;
  block.append(label, text);
  return block;
}
