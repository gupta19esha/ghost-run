// Writes web/demo/save.json: a finished Chapter 1 save the UI can load without anyone playing
// 24 sessions. The Balanced player type on seed 7, every choice its own (calibration/harness.js),
// in game/save.js's save format. agent/test/demo.test.js checks the file is still this output.
//
// node scripts/make-demo.mjs

import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { typeSave } from "./player-saves.mjs";

export const DEMO_TYPE = "balanced";
export const DEMO_SEED = 7;

export const demoSave = () => typeSave(DEMO_TYPE, DEMO_SEED);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  writeFileSync(new URL("../web/demo/save.json", import.meta.url), JSON.stringify(demoSave(), null, 2) + "\n");
  console.log("Wrote web/demo/save.json");
}
