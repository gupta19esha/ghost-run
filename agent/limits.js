// The limits on live narration of a player's own run, kept server-side so a page cannot reset them:
//   LIVE_PER_RUN       forks of one run narrated live. The run is its seed and its choices
//   LIVE_CALL_CEILING  model calls ever made for own runs, across every player. Each attempt is one
//                      call, counted before it is made, so the count never passes the ceiling.
//                      Past it, live narration stops for everyone and every own run gets the template
// The demo life is not counted: it is served from the committed cache and never calls out.
//
// The counts live in Redis, over Upstash's REST API: the KV_REST_API_* variables Vercel's Upstash
// integration sets, or UPSTASH_REDIS_REST_*. With neither there is nowhere to keep a count, so
// nothing is narrated live.

export const LIVE_PER_RUN = 5;
export const LIVE_CALL_CEILING = 500;

// A narration made live is kept, so asking for the same fork again costs nothing
export const KEEP_SECONDS = 90 * 24 * 60 * 60;

export const KEYS = {
  calls: "ghost-run:live-calls",
  run: (runId) => `ghost-run:run:${runId}:live`,
  narration: (runId, monthIndex, option) => `ghost-run:run:${runId}:fork:${monthIndex}:${option}`,
};

// { incr(key) -> number, get(key) -> string | null, set(key, value, seconds) } or null
export function redisStore(env, fetchFn = globalThis.fetch) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL;
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const command = async (...args) => {
    const response = await fetchFn(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) throw new Error(`Redis ${response.status}${data.error ? `: ${data.error}` : ""}`);
    return data.result;
  };
  return {
    incr: async (key) => Number(await command("INCR", key)),
    get: (key) => command("GET", key),
    set: (key, value, seconds) => command("SET", key, value, "EX", String(seconds)),
  };
}

// The same, held in memory: for tests and local runs
export function memoryStore() {
  const values = new Map();
  return {
    values,
    incr: async (key) => {
      const next = Number(values.get(key) ?? 0) + 1;
      values.set(key, String(next));
      return next;
    },
    get: async (key) => values.get(key) ?? null,
    set: async (key, value) => {
      values.set(key, value);
    },
  };
}
