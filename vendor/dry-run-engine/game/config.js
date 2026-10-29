// Every setting the UI has, in one place.

// The product name is decided and not trademark-checked (HANDOFF.md section 7). This is the
// only place it lives.
export const PRODUCT_NAME = "Ghost Run";

// UI.md build rule 4: same seed, same choices, same run. Save and resume arrive in step 5;
// until then every run starts from this seed.
export const SEED = 1;

// UI.md: one localStorage key holds the save: the seed, the choices, the months closed and
// the day the last one closed (game/save.js).
export const SAVE_KEY = "finance-sim";

// Testing tools (ruled 30 September 2026): "Start again" on How it works. Off here, so no build
// reaches a real player with them unless someone decides it should. The tester site turns them
// on at build time: bash scripts/build_site.sh --test-tools (HOSTING.md section 6)
export const TEST_TOOLS = false;

// UI.md screens table: a consequence leaves by itself after 2.5 seconds, sooner on a tap.
// One carrying a bar's line, the first time that bar moves, holds 5 seconds (ruled 30
// September 2026)
export const CONSEQUENCE_MS = 2500;
export const CONSEQUENCE_EXPLAINED_MS = 5000;

// UI.md screens table: the month card leaves after 2 seconds, a callback after 3.5, sooner on a tap
export const MONTH_CARD_MS = 2000;
export const CALLBACK_MS = 3500;
