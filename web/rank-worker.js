// Ranks every fork of a save off the main thread: forking a whole save is dozens of full runs,
// a few seconds on a phone. Posts progress, then each fork's summary without its runs, which the
// page does not need for the lists: it forks again, in full, only the one the player picks.

import { forksOf } from "../agent/rank.js";

self.onmessage = ({ data: save }) => {
  const forks = forksOf(save, {
    onFork: (entry, done, total) => self.postMessage({ type: "progress", done, total }),
  });
  self.postMessage({ type: "done", forks: forks.map(({ fork, ...summary }) => summary) });
};
