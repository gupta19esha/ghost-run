# Concept cards, Chapter 1

The card at month close that turns a game moment into named knowledge. Your handoff calls
it the proof that the player learned something rather than just played something.

**These are a draft for you to rewrite.** The words are mine, not yours.

---

## The rule: not every month unlocks one

Twenty of the twenty-four months carry a concept. Four do not, and that is deliberate.

Months 7, 13, 19 and 23 are about family, obligation and pressure. They are real decisions
and they move the bars, but naming a concept for them would mean inventing one. "Boundaries with your sister" is not a thing the player learned, it is a
thing that happened to them.

Forcing a card on those months would make the whole mechanic feel like homework, because
the player would learn to skip a card that sometimes says nothing. A card that only shows
when there is something to name keeps it worth reading.

---

## Which decision carries it

Two new columns on the Decisions sheet, `concept_title` and `concept_body`, filled on the
one decision per month that teaches it. Where a month has two decisions, the concept
belongs to the one that earned it, not automatically the first.

The card unlocks because the month happened, not because of which option was chosen. A
player who refuses to start an SIP still learns what one is, because they had to decide.
That is the premise: you learn what an SIP is because in month 10 you had money spare and
had to choose.

| Month | Decision | Title | Body |
|---|---|---|---|
| 1 | D01 | EPF | A slice of every salary goes into a retirement fund before you see it. Your employer adds the same amount again. You cannot touch it easily, which is the point. |
| 2 | D04 | Pay yourself first | Money moved out on the day you are paid gets saved. Money left to save at the end of the month does not. Same salary, different result. |
| 3 | D05 | Insurance is not investment | A product that promises both usually does neither well. Cover protects the people who depend on you. Investment grows money. Products that mix them tend to charge for the mixing. |
| 4 | D07 | Emergency fund | Money whose only job is to be there. It is not for returns, so where you keep it is decided by how fast you can reach it, not by what it earns. |
| 5 | D09 | Health cover | A hospital bill arrives without warning and does not care what you have saved. Cover is cheap when you do not need it, and unavailable the moment you do. |
| 6 | D11 | No-cost EMI | There is no such thing. The cost is the cash discount you gave up. The same phone is cheaper if you pay for it outright, and the difference is the interest nobody called interest. |
| 8 | D13 | Real versus nominal | A raise below inflation is a pay cut. The number on the letter went up. What it buys went down. Only one of those is the raise. |
| 9 | D14 | A windfall is not income | A bonus feels like extra, so it gets treated like extra. It is the only money you will ever receive that you have not already planned around, which is exactly why it disappears. |
| 10 | D16 | SIP and compounding | A fixed amount invested every month, whatever the market is doing. Starting early matters more than starting big: the years do more work than the rupees. |
| 11 | D17 | Credit score | A record of whether you pay on time. Paying the full bill builds it. Paying the minimum quietly costs about 3.5% a month on everything left over. |
| 12 | D18 | Tax deductions | Some investments reduce the tax you pay, under section 80C. The old regime rewards them. The new one has lower rates and no deductions. Choosing in March, in a panic, is how people end up in products they did not want. |
| 14 | D20 | Survivorship bias | You hear about the year someone made 40%. You do not hear about the year they lost it, or about everyone who did the same thing and quietly stopped mentioning it. |
| 15 | D21 | Term insurance | Pure cover, no returns, and the cheapest kind. The price is locked at the age you buy it. Waiting until you need it is the expensive way round. |
| 16 | D22 | Depreciation | Some things you buy lose value the moment you own them. A vehicle is worth less every month you keep it. That is not a mistake, but it is not saving either. |
| 17 | D23 | Committed income | Money that is already spoken for before it arrives. A large salary with large commitments buys fewer choices than a small one with none. This is what the Freedom bar counts. |
| 18 | D24 | Time as money | A cheaper rent forty minutes further out costs you eighty minutes a day. Whether that is a saving depends on what the time was worth, and nobody puts that on the lease. |
| 20 | D26 | Opportunity cost | Every choice is also the choices you did not make. The safe offer costs you the risky one's upside. The risky one costs you the safe one's certainty. |
| 21 | D27 | Lifestyle creep | Spending rises to meet income without anyone deciding it should. It is not one purchase. It is the absence of a decision when the raise arrives. |
| 22 | D28 | Runway | How many months you survive with no income. Not a number most people know about themselves, and the only number that matters on the day the job goes. |
| 24 | D30 | Guaranteed returns | A return that is both high and guaranteed does not exist. Someone is paying it out of something. Usually the next person's money, and usually not for long. |

---

## Collected by a tick, and the long versions

Ruled 3 November 2026. A card is collected when the player ticks it at month close, not when
its month closes: the tick is what records it (`ticked` in the save, `game/save.js`). A month
with more than one card shows them one at a time, each ticked before the next comes in. Close
does not wait for the tick; a card left unticked waits in the collection with its tick there.
A save from before this keeps every card its closed months gave it.

At month close the card keeps its short text and its tick, with Read more at its head, which
opens the long version over the close; its Close comes back to the close where it was. Ticked,
the card flies up into the ideas count beside the month's name, which takes the new figure with
a pulse and the site's sounds. On the first three collections only, a line under the count says
each idea is in there, in full (`ideaHints` in the save); never under reduced motion. The count is
a button on month close, Home and the chapter report, beside the main button on the last two.

Each collected card opens a long version, three or four short paragraphs, in
`game/concepts-long.js`. They are written by hand, not by a model: the concepts are fixed and
the same for every player. They follow the rules below except the length, explain the board and
never the moves, and read the same whatever was chosen. Every figure in them is held to the
engine or to the sheet copy it restates by `scripts/check_stated_terms.py` (rule 16), which also
fails on any figure in them it does not check. The one figure of the player's own is Runway's
`{runway}`, their runway on the morning of month 22.

---

## The rules I wrote them to

1. **Name it, then say what it means.** The title is the thing the player can now say out
   loud. The body is why it matters.
2. **No advice.** "Cover protects the people who depend on you" is what it is. "You
   should buy cover" is advice, and it is also the SEBI line.
3. **No real products.** No fund, bank, insurer or scheme is named, per the compliance
   checklist.
4. **Stated figures only.** Month 11's 3.5% is the figure D17-C quotes to the player, so
   it is a Category A stated term under rule 16 and the check should cover it.
5. **Under 45 words.** This appears on a screen the player is about to close.

---

## Three you should look at hardest

**Month 12, tax deductions.** The longest by some way, and the only one that names a
section of law. It may be too much for a card. The alternative is to say less and accept
that tax stays vague.

**Month 18, time as money.** The only card that asks a question rather than stating a
fact. It is either the best one or the one that does not belong.

**Month 22, runway.** This lands the month the player is laid off, which may be too late
to be useful and too on the nose to be welcome. Consider whether it belongs at month 4
with the emergency fund instead, leaving month 22 to speak for itself.

---

## What this does not fix

The chapter report is still unbuilt, and so is the product name. Twenty-nine decisions
still have no illustration.
