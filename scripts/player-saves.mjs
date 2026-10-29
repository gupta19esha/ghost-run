// Saves for the tests and the measurement: each of the four calibration player types
// (vendor/dry-run-engine/calibration/harness.js, maths doc section 13) played through Chapter 1,
// as game/save.js would hold the run.

import { typePlaythrough, PLAYER_TYPES } from "../vendor/dry-run-engine/calibration/harness.js";
import DECISIONS from "../vendor/dry-run-engine/engine/decisions.js";

export { PLAYER_TYPES };

// Chapter 1's decisions in the order a run meets them: by month, then by id within a month, as
// decisionsForMonth sorts them
export const DECISION_ORDER = Object.values(DECISIONS)
  .filter((d) => d.chapter === 1)
  .sort((a, b) => a.month - b.month || a.decision_id.localeCompare(b.decision_id))
  .map((d) => d.decision_id);

export function typeSave(type, seed = 1) {
  const { chosen } = typePlaythrough(type, seed);
  const choices = DECISION_ORDER.map((id) => chosen[id]);
  if (choices.some((c) => !c)) throw new Error(`${type} on seed ${seed} skipped a decision`);
  return { version: 1, seed, choices, closed: 24, closedOn: null, streak: 0, explained: [] };
}
