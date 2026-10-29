# Demo save

`save.json` is a finished Chapter 1: 30 choices over 24 months, in the format `game/save.js`
stores (`version`, `seed`, `choices`, `closed`, ...). The UI can load it and replay it at once,
without anyone playing 24 sessions.

- **Player type:** Balanced (`calibration/harness.js`, maths doc section 13). Every choice is the
  type's own, with no hand edits.
- **Seed:** 7.
- **Month 24:** net worth 2,52,283, Safety 34, Freedom 25, Life 37. Balanced on seeds 1 to 10
  ends between 1,64,166 and 2,82,372, with Safety 30 to 40 and Life 34 to 40. Freedom is 24 or
  25 on six of the ten seeds, this one included. At the month 22 layoff the payment cascade
  stops at step 3, the step it reaches on 9 of those 10 seeds; it never goes to the card or to
  family.

## The fork that triggers a substitution

Choice 16 (`monthIndex` 15) is D16 in month 10, and the player took **D16-A**, "5,000 a month
into a broad equity index". In month 14 they took **D20-B**, "Keep the index, add small extra
there".

Fork D16 to **D16-B** (a recurring deposit) or **D16-C** (wait until you earn more), and the ghost
has no index fund to keep, so D20-B is not offered to it (rule 29). The ruled fallback,
`keep-real-or-first`, takes **D20-C**, "Ignore it". In both cases `fork()` returns:

```js
substitutions: [{ monthIndex: 19, decisionId: "D20", withdrawn: "D20-B", chosen: "D20-C" }]
```

These are the only two forks of this save with a substitution.

## Regenerating

`node scripts/make-demo.mjs` writes the file again. `agent/test/demo.test.js` fails if the file
and the script's output ever differ, or if the substitution above stops happening.
