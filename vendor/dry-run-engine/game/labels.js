// The line beside Safety and Freedom on Home, the report and the chapter card: the engine's
// runway and committed share, worded by text/, which also names the last salary while there
// is none. Life has none (maths doc section 14).

import { explainBars } from "../engine/index.js";
import { formatMonths, formatCommitted } from "../text/render.js";

// The words around the figure beside Safety, from design/Home.html
const OF_RUNWAY = "of runway";

export function barLabels(state) {
  const workings = explainBars(state);
  const runway = formatMonths(workings.safety.runway_months);
  const committed = formatCommitted(workings.freedom.committed_ratio, workings.freedom.against_last_salary);
  return {
    safety: runway && `${runway} ${OF_RUNWAY}`,
    freedom: committed,
    life: null,
  };
}
