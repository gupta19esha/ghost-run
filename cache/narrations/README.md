# Narration cache

Every model response `agent/narrate.js` gets, one file per attempt:
`<provider>/<fork key>/attempt-<n>.json`. The fork key is the save's seed, a digest of its choices,
the choice index and the option (`forkKey` in `api/narrate.js`).

Each file holds the narration, the model that wrote it, its token usage, and a digest of the
exact request it answered. A cached response is used only while that request is unchanged: edit
the prompt, or get different feedback on an earlier attempt, and the next run asks again and
overwrites it. No file holds a key.

The files are committed, so the demo can be narrated from here with no network: on Vercel the
route serves this cache unless `NARRATE_LIVE=1`. The stub provider is free and is never cached.
