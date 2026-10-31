# Handoff: Finance Life Simulation Game

Last updated 27 September 2026. This replaces the original context handoff, which is
kept unchanged in `ORIGINAL-HANDOFF.md`.

Sections 1 to 4 and 6 are carried forward word for word from the original. Sections 5, 7
and 8 describe the project as it stands now.

---

## Read this first

I am building a mobile game. This document contains everything decided so far: the
concept, the market research, the legal constraints, and the product spec. Nothing here
needs to be re-researched. Assume all of it is settled unless I say otherwise.

I am a non-technical product manager based in Bangalore. I want plain, simple English,
no em-dashes, lean answers with no over-explanation. Use tables over long paragraphs.
Tag features as MVP, Phase 1 or Phase 2. Flag anything uncertain honestly rather than
stating it confidently.

---

### Standing rule: commit and push at the end of every task

Set by the product owner on 27 September 2026. It applies to every session, on any Claude
account and any machine.

| Rule | Detail |
|---|---|
| Never leave work uncommitted | At the end of every task, commit and push, even if the work is partial and even if the owner did not ask |
| A failed push is reported at once | If a push fails, stop and tell the owner immediately. Do not carry on with other work |
| Why | The owner switches between Claude accounts and machines. An uncommitted change is a change that is lost |

### Status at a glance

| Area | State |
|---|---|
| Concept, research, legal, spec | Settled. Sections 1 to 4 |
| Chapter 1 decisions | 30 decisions, 94 options, in `chapter1_decisions_v34.xlsx` |
| Simulation maths | Written, in `SIMULATION-MATHS.md`. Read end to end by the owner. Some rulings still open, section 7 |
| Phase 0 harness | Built, in `index.html`. Tested only by script in a headless browser. Not yet tested on a real phone or with real people |
| Phase 0.5 user research | No record in this repo. Status unknown |
| Engine | All 7 steps built: state and ledger, the four bars, applying a decision, returns and debt, shocks, text tokens, the calibration harness. The step 7 baseline is recorded in maths doc section 14. Under random play it misses the month 21 targets, fails validation 2, and marks validation 1 not passable in Chapter 1. Rulings of 27 September 2026: the section 13 targets are judged against the four player types, which meet them on net worth except strong play at month 21; the D16-A market fix is applied (81%). The same day's second rulings applied L3-30, where deliberate saving lowers the Life baseline, and F1, where Freedom with no salary is measured against the last salary. They also set the weak Safety targets to 30 and stated D02's deposit (v27). Opening cash is 20,000 since v28, told to the player in D02's situation. The four types now bracket the median on net worth at both checkpoints and on Safety at month 24. The month 21 median Safety target was re-derived as 65, three months of runway; Balanced's 67.8 is in range of it, though not bracketed, since Cautious is also above. Brief in `ENGINE.md` |
| Playable Chapter 1 | Built, in `game/`, to `UI.md` version 2 and `design/`. Plays from the landing screen to the chapter report, with save, streak, one month a day, concept cards, hook lines and all 30 illustrations. Tested by script and in a browser only. Not hosted, not tested on a real phone or with people |
| Product name | **Dry Run**, decided. Not trademark-checked, section 7 |
| Hosting | Cloudflare, as a Worker with static assets (Cloudflare offers new accounts no Pages flow). Private behind Cloudflare Access, deploying from the `live` branch. Set up in the repo; the product owner deploys from the dashboard. `HOSTING.md` |
| UI stack, storage | Not decided. Section 7 |
| Code | GitHub, `https://github.com/gupta19esha/game-finance` |

---

## 1. The concept

A mobile game where you live roughly 20 simulated years of adult financial life in India.

You start at age 22 with your first salary. Each real day you play one session of about
4 minutes, which moves you forward one month in the game. You make 3 to 5 money
decisions. Each decision plays forward and changes your future. Over about 240 sessions
you reach age 42 and get a final Life Report.

You never read a lesson. You learn what an SIP is because in month 14 you had 8,000
rupees spare and had to decide what to do with it.

One sentence pitch: a game where you live your twenties and thirties twice, so the
second time is in real life.

The inspiration is Duolingo, specifically its retention design: daily bite-sized
sessions, streaks, leagues, visible progress, free tier plus paid subscription. The
difference is that Duolingo teaches through lessons. This teaches through consequences.

---

## 2. Market research findings

### The exact product does not exist

Researched in September 2026. No product anywhere combines a long-running life
simulation, daily money decisions scored by net worth, and Duolingo-style daily
retention. Each piece exists separately.

| The piece | Who does it | What they are missing |
|---|---|---|
| Deep life simulation over years | GoVenture Life and Money, PersonalFinanceLab | School tools, not consumer apps. No daily habit loop. Not Indian. |
| Daily habit loop for finance | Zogo | Teaches through lessons and quizzes. No life being lived. |
| Money as the score | Invstr, stock simulators | Investing only. No salary, rent, loans, insurance, family. |
| Indian financial reality | Zerodha Varsity, Finshots | Pure reading content. No simulation. |
| Emotional pressure decisions | Almost nobody | The biggest gap in the whole category. |

### Global competitors

| Name | What it does | Model | Status |
|---|---|---|---|
| GoVenture Life and Money | Closest thing globally. Life simulation up to 20 years, build net worth. School curriculum tool. | Paid school licence | Active |
| PersonalFinanceLab Budget Game | 12 virtual months of budgeting. Teachers inject life events. | Paid school licence | Active |
| Zogo | Bite-sized lessons plus quizzes and daily trivia. Points redeemable for gift cards. Over 1 million users. | Free to users, banks pay to white-label | Active |
| Invstr | Fantasy stock picking with leagues and leaderboards. Close to 1 million downloads. | Free plus premium | Active |
| Greenlight | Debit card for kids and teens with finance education. 6.5 million parents and children. | Paid family subscription | Active |
| Long Game | Prize-linked savings with games. Raised about 6.85 million dollars. | Acquired | Standalone consumer version gone, folded into Truist |

### Indian competitors

| Name | What it does | Why it is not a real competitor |
|---|---|---|
| Zerodha Varsity | Very large free finance education library. Modules, quizzes, certification, Hindi content. | Reading material, not a game. But it is the quality benchmark and it trained Indians to expect free finance education. |
| Fello | Play games to win rewards while saving or investing in gold, FD, mutual funds. | Real money savings product with games attached. Not teaching. Has moved towards SIP. |
| Jar | Rounds off spare change into digital gold via UPI. | Savings habit product. No education, no simulation. |
| Fi Money, INDmoney, Groww | Money apps with light game mechanics. | These are what a graduate of my game would go use. Partners, not rivals. |
| Journey Towards Financial Literacy | 19 gamified levels on budgeting, investing, insurance. | Small level-based quiz game. No simulation. |

Adjacent but different: Finshots is news, Ditto is insurance advisory, 1Finance is
membership advisory. FamPay, Junio, YPay, Pencilton are teen card apps.

Name confusion to avoid: Fello is the Indian gamified savings app. Fingo is a youth bank
in Kenya. Finny was a US finance literacy startup. Three different companies.

### What the competitor set teaches

- Free is the default in India. Zerodha Varsity gives away world class material for
  nothing. You cannot charge for basic education. You can charge for depth, progress and
  personalisation.
- Every Indian competitor monetises by selling financial products. That is exactly what
  creates their compliance exposure. A subscription-only education product is unusual in
  India and that is an advantage.
- The quiz format has hit its ceiling. Zogo has a million users and still teaches
  through quizzes. Nobody has tried making the learning invisible inside a simulation.
- Games attached to real money get acquired or pivot away. Long Game, Fello. Staying
  fictional is the durable choice as well as the legal one.

---

## 3. Legal constraints

Not legal advice. A lawyer review is planned before launch. But these shape the product
design, so treat them as hard requirements.

### SEBI: education versus investment advice

This is the main one. The line is between education, which needs no licence, and
investment advice, which requires a SEBI Registered Investment Adviser licence under the
SEBI Investment Advisers Regulations 2013.

- Generic education that does not recommend specific securities is not investment
  advice. This is the carve-out the product lives inside.
- In August 2024 SEBI notified amendments aimed at finfluencers. On 29 January 2025 it
  issued a circular and FAQs drawing a clear line between education and advice.
- That circular bars educators from using live or recent stock prices. Only market price
  data with a three month lag may be used. SEBI proposed reducing this to 30 days in
  January 2026, but a final rule was not confirmed, so assume three months.
- No performance claims. No guaranteed or implied returns.
- SEBI regulated firms such as brokers and RIAs cannot associate with unregistered
  finfluencers through money, referrals or data sharing. This matters for any future
  Groww or Zerodha partnership.

A fully fictional simulation is the safest possible ground. If the app never tells a
real user to buy a real fund, stock or policy, it is education, not advice, and no
licence is required.

### The four things that would break that protection

| Never do this | Do this instead |
|---|---|
| Name real funds, stocks, insurers or banks in the game | Generic categories only. "A large cap index fund". "A term insurance plan". Fictional brand names if needed. |
| Use live or recent market data, or let simulated returns track today's real market | Historical patterns with the required lag, or fully synthetic market behaviour |
| Take referral fees or commissions for sending users to real financial products | Subscription only |
| Show or imply guaranteed returns, or map a real user's actual money to an in-game recommendation | Keep outcomes probabilistic and clearly fictional |

### Data privacy: DPDP Act 2023

- Applies to any app collecting personal data in India. Rules notified in 2025 with
  phased compliance.
- Needs clear notice, specific consent, stated purpose, and the ability to withdraw
  consent and delete data.
- Verifiable parental consent is required for users under 18, and behavioural tracking
  and targeted ads aimed at children are barred. Decision taken: launch 18 plus only, to
  remove this burden from the MVP.
- The app does not need bank details, PAN or income, because the simulation is
  fictional. Do not collect real financial data.

### Online Gaming Act 2025

- Came into force 1 May 2026. Bans online money games where a user pays a fee or stake
  expecting winnings, whether skill based or chance based.
- This product is not a money game. No stake, no cash prize, and the net worth score is
  fictional and cannot be withdrawn. The Act actively encourages free to play
  educational games.
- Hard rule: in-game net worth must never convert to real money, gift cards, or anything
  of value. Note Zogo does give gift cards, but Zogo charges users nothing. A paid
  subscription plus money-value rewards would be dangerous.

### Other

- Google Play and Apple have extra requirements for financial apps. Describe the product
  as education and simulation in the store listing, not as investing or finance, to
  reduce review friction.
- ASCI rules apply to marketing. No "learn to get rich" or guaranteed return claims.
  Claims about learning outcomes only.
- GST applies to subscription revenue.
- Disclaimer on relevant screens: informational and educational only, not investment
  advice. This is the pattern Zerodha Varsity uses.

### MVP compliance checklist

- No real product names anywhere
- No live or recent market data
- No referral fees or commissions
- No guaranteed return claims
- No real money in or out of the score
- Disclaimer in app and in store listing
- 18 plus only at launch
- DPDP-compliant privacy policy and consent flow
- Lawyer review before public launch

---

## 4. Product spec

### Core loop

```
   OPEN APP
      |
   [ THE MONTH CARD ]  ..... 5 sec
   "Month 14. Salary credited. 52,000 in."
      |
   [ DECISION 1 ]  ........ 30 sec
      |
   [ CONSEQUENCE FLASH ]  .. 5 sec
   Immediate effect shown, long effect hidden
      |
   [ DECISION 2, 3, 4 ]  ... 90 sec
      |
   [ EVENT ]  .............. 30 sec
   Something happens to you, not chosen
      |
   [ MONTH CLOSE ]  ........ 30 sec
   Net worth moves. Bars move. One concept unlocked.
      |
   [ THE HOOK ]  ........... 10 sec
   "Next month: your father asks for 2 lakhs."
      |
   STREAK +1 . LEAGUE POINTS . CLOSE
```

Total 3 to 4 minutes. Non-negotiable. If a session runs past 6 minutes, cut content.

The hook at the end is the most important 10 seconds. You close the app already knowing
what tomorrow is about.

### What the game tracks

Four bars, always visible.

| Bar | Meaning | How you lose it | Why it exists |
|---|---|---|---|
| Net Worth | Assets minus debts. Headline score. | Bad debt, no investing, lifestyle creep | The thing people think they want |
| Safety | How long you survive with zero income | No emergency fund, no insurance | Teaches the thing people skip |
| Freedom | How much income is already committed | EMIs, dependents, obligations | A big salary is not the same as options |
| Life | Relationships, health, enjoyment | Over-saving, over-working, saying no to everything | Stops the game becoming "spend nothing, win" |

Design rule: it must be possible to have the highest net worth in your league and still
lose because your Life bar is empty. That tension is the whole point.

A fifth hidden number, Knowledge, counts concepts unlocked. Shown in profile, not as a
bar.

### Structure

| Chapter | Ages | Days | Theme | Concepts |
|---|---|---|---|---|
| 1. First Salary | 22 to 24 | 24 | Where does it all go | Budgeting, salary slip, TDS, EPF |
| 2. Building | 24 to 27 | 36 | First real decisions | Emergency fund, SIP, compounding, term insurance |
| 3. Pressure | 27 to 31 | 48 | Everyone wants something | Family obligations, health cover, credit score, EMI trap |
| 4. The Big Ones | 31 to 35 | 48 | Home, marriage, career risk | Home loan vs rent, career switch, equity vs debt |
| 5. Weight | 35 to 39 | 48 | Responsibility both directions | Child costs, ageing parents, rebalancing |
| 6. The Count | 39 to 42 | 36 | Did it work | Retirement maths, net worth review |

About 240 sessions total, roughly 8 months of daily play.

Ending: at 42 the game ends with a Life Report showing final numbers, three best
decisions, three worst, and comparison against league and country. Then New Game Plus
with a harder start such as lower salary, existing family loan, or tier 2 city.

### Decision types

| Type | Feel | Example | Teaches |
|---|---|---|---|
| Allocation | Calm, mathematical | "12,000 spare. FD, index fund, gold, or keep liquid?" | Compounding, risk, liquidity |
| Temptation | Fun, guilty | "iPhone on 12 month no-cost EMI, or wait 8 months and pay cash?" | Real cost of EMI, lifestyle creep |
| Obligation | Heavy, no good answer | "Father needs 2 lakhs for your sister's admission. You have 2.4 lakhs." | Emergency fund, family finance |
| Shock | Not a choice | "Hospital bill 3.8 lakhs. You have no health cover." | Why insurance exists |
| Fork | Rare, chapter-defining | "Stable job at 18 LPA, or startup at 11 LPA with equity." | Risk, opportunity cost |

### Writing rules

- No obviously correct answer at the moment of choosing
- Understandable with zero prior finance knowledge
- Consequences split into immediate (shown now) and deferred (surfaces 3 to 24 months
  later with a callback: "Remember the bike?")
- Never a real fund, stock, bank or insurer name

### Features by phase

MVP:

| Feature | Who | Why needed | Problem solved |
|---|---|---|---|
| Daily session, one month per day | Everyone | The product is a habit, not a course | Finance apps get opened once and abandoned |
| Four stat bars | Everyone | Makes consequences visible immediately | People cannot feel a financial decision |
| Streak | Everyone | Strongest retention mechanic in consumer apps | Day 3 drop-off |
| Deferred consequence callbacks | Everyone | Connects past choice to present result | Nobody links today's spending to next year's stress |
| Concept unlock card | Everyone | Turns a game moment into named knowledge | Learning without a lesson feels like nothing was learned |
| End of chapter report | Everyone | Closure plus reason to continue | Long games lose people in the middle |

Phase 1: leagues (weekly, 30 strangers), streak freeze and repair, "India chose" social
proof reveal on every decision, share card, Life Report, push notification tied to the
hook.

Phase 2: New Game Plus, scenario packs (freelancer, government job, family business,
tier 2 city), private leagues with friends, comparison with real India data, decision
replay.

Deliberately not building:

- Real money anywhere. No prizes, no gift cards, no cashback. Online Gaming Act line.
- Real product recommendations or referral links. SEBI line.
- Lives and energy limits. Duolingo's hearts are disliked and this product cannot punish
  the behaviour it wants. Use streaks, not gates.
- Leaderboard on net worth alone. Teaches the wrong lesson. Rank on combined score
  across all four bars.

### UI direction

Not a fintech app. Not a textbook. Reference points are Reigns and Hades for decision
presentation, Duolingo only for the shell around the session.

1. One thing on screen at a time. A decision fills the screen. No dashboard during a
   session.
2. Numbers are characters, not data. Net worth animates when it moves. A falling number
   should feel bad.
3. Illustration, not stock photos. Flat, warm, Indian.
4. Dark by default. Most sessions happen at night in bed.
5. Text is short. A decision is 35 words maximum.

Screens:

- **Home:** age, month, chapter at top. Four bars. One large PLAY MONTH button. Streak
  in the corner. Nothing else.
- **Decision:** illustration top half, situation text middle (35 words max), 2 to 4
  full-width option cards at bottom. Small "why does this matter?" link that expands one
  line.
- **Consequence flash:** chosen card expands, affected bar animates, one line of result
  text, auto-advances after 2.5 seconds. Never make the player tap Continue.
- **Month close:** net worth counts up or down with animation, bar changes summarised,
  concept unlock card if earned, then the hook, then one tap to close.
- **Progress:** vertical scrollable timeline of your life. Each month a dot. Tap any dot
  to see what you chose and what it cost. This is the screenshot screen.
- **Profile:** concepts collection, streak, league position, stat history, Life Report.

Interaction rules: one-handed thumb operation, no text input in the core loop, maximum 4
options per decision, 6 to 12 taps per session.

### Content engine

- A full playthrough needs roughly 900 decisions. MVP needs only Chapter 1, about 100.
- Build decisions as structured data from day one: situation, options, immediate effect
  per bar, deferred effect with trigger month, concept tag, chapter, difficulty. Never
  hard-code them.
- Build a simple authoring tool in week 2. A spreadsheet is fine. Code is not.
- AI can draft decisions but every one needs a human pass for Indian accuracy. Getting
  EPF rules wrong destroys trust permanently.

### Free versus paid

Free must be genuinely complete. People pay to protect a habit, not to start one.

| | Free | Paid |
|---|---|---|
| Chapters | All 6 | All 6 |
| Daily sessions | 1 per day | Unlimited, play ahead |
| Streak | Can break | Freeze and repair |
| Ads | Between sessions | None |
| Life Report | Basic numbers | Full breakdown, best and worst decisions, what-if replays |
| Scenario packs | Default salaried path | Freelancer, government, family business, tier 2 |
| Private leagues | No | Yes |
| Decision replay | No | Yes |

Price to test: 149 to 249 rupees per month, or 999 to 1,499 per year. Show annual as
default because monthly churn in Indian consumer subscriptions is brutal. App store
billing takes a cut and UPI autopay has real drop-off. Test payment flow early.

---

## 5. Roadmap and status

### The plan, with status

The phases, their scope and the pass criteria are the original plan. Only the status is
new.

| Phase | Original plan | Status now |
|---|---|---|
| Phase 0: prove the core is fun (weeks 1 to 3) | Write 30 Chapter 1 decisions. Put them in front of 20 people aged 22 to 30. Watch them, do not ask if they like it. Pass if at least 12 of 20 ask "what happens next?" without being prompted | Decisions written. Harness built. Not yet run with people |
| Phase 0.5: user research (week 2, parallel) | 15 interviews. "What is a money decision you got wrong in your twenties?" and "What happened, and when did you realise?" Answers to the second become deferred consequences | No record in this repo. Unknown |
| MVP (weeks 4 to 12) | Mobile web, no app store, no login until session 5. Chapter 1 only, 24 sessions, about 100 decisions, four bars, streak, concept unlocks, chapter report, share card | Engine: all 7 steps built; calibration misses its targets, rulings open. Playable Chapter 1 built in `game/`, landing to chapter report. Not hosted, no analytics, so retention cannot be measured yet. Not tested with people |
| Phase 1 (months 4 to 7) | Only if MVP retention passes. Chapters 2 and 3, leagues, streak freeze, India-chose reveal, accounts and sync, ads, Android build | Not started |
| Phase 2 (months 8 to 14) | Chapters 4 to 6, Life Report and endgame, paid tier, scenario packs, private leagues, iOS build | Not started |
| Phase 3 (months 15+) | New Game Plus, Hindi and Tamil, possible B2B licensing to colleges and employers | Not started |

MVP retention targets, unchanged from the original plan. The MVP answers one question: do
people come back?

| Metric | Fail | OK | Good |
|---|---|---|---|
| Day 1 return | under 25% | 35% | 45%+ |
| Day 7 return | under 12% | 18% | 25%+ |
| Day 30 return | under 5% | 8% | 12%+ |
| Session completion | under 70% | 80% | 90%+ |
| Median session length | over 7 min | 4 to 6 min | 3 to 5 min |

If Day 7 is under 12%, stop and fix the loop. Do not build Chapter 2.

### Built so far: decision content

| Item | Detail |
|---|---|
| File | `chapter1_decisions_v34.xlsx`, with tabs README, Decisions and Options |
| Chapter 1 | 30 decisions, 94 options, months 1 to 24, ages 22 to 23 |
| Type mix | 9 Allocation, 9 Temptation, 7 Obligation, 3 Shock, 2 Fork |
| Phase 0 test set | 12 decisions marked `phase0_test = Y`: D01, D02, D05, D08, D11, D12, D16, D20, D26, D28, D29, D30 |
| Copy | The owner's text, kept as written. The one exception: a figure the engine computes is now a placeholder token, such as `{equity_balance}` |
| Compliance | No real product names, no market data, no guaranteed returns, no real money. One brand name, Instagram in D10-C, was found and removed in v3 |

Every sheet version is kept in the repo on purpose. Together they are the record of each
ruling. Each file's README tab has the full changelog.

| Version | What changed |
|---|---|
| v2 | Owner's revision: type mix rebalanced, obvious right answers removed, callbacks made neutral, D09-C added, `phase0_test` column added |
| v3 | Owner's fixes: D11-A and D11-B callbacks corrected, D10-C brand name removed |
| v4 | First engine columns: where money goes, cover added, how long a monthly amount runs |
| v5 | Where monthly money goes, health and term cover split, deferred durations, one-off income. D28-A sign fixed. D07's 20,000 transfer recorded |
| v6 | Second money slots for options that split money, equity and gold as separate classes, which bucket deferred money hits, assets bought. D14-B text fixed |
| v7 | Deferred investment growth removed, since the market already grows those balances. D14-B text names no figure |
| v8 | Computed figures in 10 options replaced with tokens |
| v9 | Small caps as a class, options that redirect or cancel an earlier commitment. D13-A back to a quoted figure |
| v10 | D20 situation tokenised. Redirect and cancel take a list. Cash at home as a class |
| v11 | Commitment kind (cost, saving or income) set by hand for all 94 options |
| v12 | D28 and D03-B costs tokenised. A second commitment kind for split monthly money |
| v13 | Asset type, fixed deposit term and same-month rent columns. Locked long-term money split into retirement, endowment and tax product |
| v14 | D07-B's FD term set to 24 months. Wrong: it contradicted the copy, see v15 |
| v15 | D07-B back to 12 months, as its copy states. Its callback rewritten: the money sat locked for twelve months, with no penalty |
| v16 | EMI purchase column. D11-C and D22-A open a debt for the asset's price instead of a monthly cost, so buying on EMI no longer raises net worth |
| v17 | D11's phone is 73,000 in cash or 6,600 a month for twelve months. The 6,200 hidden cost of a no-cost EMI now matches `NO_COST_EMI_MARKUP` |
| v18 | Layoff columns. D28 is the layoff shock. D29's options restart salary after 1 or 4 months. Salary changes such as raises are marked, so they stop with the job. D17-A and D17-C give a credit card. No existing cell changed |
| v19 | D29-A's offer is 5.8 LPA (-2,900 a month, was 7 LPA and -10,000), so a shared-flat player survives it. D17-C opens an 18,000 card balance at month 11 and D28-C puts each unemployed month's gap on the card, replacing their old deferred cash. D28-C gives a card and its deferred text is rewritten |
| v20 | D29-B's callback says 10 LPA, not 12, to match its +25,000 at D01's ratio. The amount is unchanged |
| v21 | `chapter_title` column on Decisions, the chapter's name as Home shows it. First salary for chapter 1; chapters 2 to 6 are filled when their decisions exist. No existing cell changed |
| v22 | `hook_line` column on Decisions: the product owner's hook lines from `HOOKS.md`, on the first decision of months 2 to 24. No existing cell changed |
| v23 | "Next month: " removed from all 23 hook lines, first letter capitalised. The screen's "Next month" label carries it: the label is design, the line is content |
| v24 | `concept_title` and `concept_body` on Decisions: the product owner's 20 concept cards from `CONCEPTS.md`, one per month except 7, 13, 19 and 23. No existing cell changed |
| v25 | `month_summary` on Decisions: the product owner's line for each of the 24 months, on its first decision (`REPORT-COPY.md`). No existing cell changed |
| v26 | D30's `month_summary` is "Three percent a month, guaranteed.", not "A guaranteed three percent.": without "a month" a 42%-a-year scam read as a poor savings rate |
| v27 | D02's three option labels state the deposit each charges, "deposit 20,000", "deposit 12,000" and "deposit 8,000", which no copy mentioned (rule 16). The deposits are unchanged, and the stated terms check now covers them. **The wording was drafted by an assistant and approved as written by the product owner, 27 September 2026.** D02 is a Phase 0 test decision, so the Phase 0 export changed on purpose |
| v28 | Starting net worth in the README is 20,000, the opening cash, where it was 0. D02's situation adds "You have 20,000 saved from before.", the product owner's copy, so the player is told before a deposit is charged (rule 16). The stated terms check holds it to the README row. D02 is a Phase 0 test decision, so the Phase 0 export changed on purpose |
| v29 | D03 loses its fixed outcome figures, which nothing checked and the engine could contradict. The situation is "It is the 24th and the money is gone. Payday is seven days away.", its first sentence month 2's hook line. D03-C is "Take it from what you had saved", where 15,000 contradicted D02's 20,000. D03-B's result ends "You make it to payday. Just.", where it said 180 rupees. The product owner's copy. D03 is not a Phase 0 test decision, so the Phase 0 export is unchanged |
| v30 | D03 rewritten to be true on every housing path: "It is the 24th. Rent went out on the 1st, and what is left has to last until payday, seven days away." D03-C is "Dip into your savings for the week". Month 2's hook is "The last week before payday." and its summary "Rent set the month's pace." D03-B's result ends "You make it to payday." The product owner's copy |
| v31 | D03-C costs 5,000, spent. D13's 8% is real: D13-A and D13-C +3,304 a month, D13-B +3,904, from month 9. D26 quotes 9.5 and 7.3 LPA and no staying figure. D29 keeps its amounts and quotes 6.3 and 10.5 LPA. The stated terms check holds all of it (37 terms). D26 and D29 are Phase 0 test decisions, so the Phase 0 export changed on purpose |
| v32 | Rule 29, options that cannot apply are not offered: a `requires` column (`index`, `no_index`) and preconditions derived from `modifies_commitment`. D20-D added for a player with no index: "Start with 30,000 in small caps, like him", 30,000 once into small caps, down 22% at its month 22 callback on every seed. D28-B also stops D27-B's and D27-C's investments. The product owner's copy. D20 is a Phase 0 test decision, so the Phase 0 export changed on purpose, and the harness applies rule 29 from the tester's choices |
| v33 | D20-C's callback is "He has stopped mentioning it. So has everyone else at lunch.", true for a player who owns nothing. The product owner's copy. D20 is a Phase 0 test decision, so the Phase 0 export changed on purpose |
| v34 | D28-B's result is "{stopped_monthly} a month back. The habit breaks in week one.": the monthly saving it actually paused, 5,000 for D16's investment, 12,000 for D27-B's, or their sum. The product owner's copy. D28 is a Phase 0 test decision; its Phase 0 sample is 5,000, so the harness text is unchanged |

### Built so far: simulation maths

`SIMULATION-MATHS.md` decides how a choice moves the bars. If the sheet and the doc
disagree, the sheet is wrong.

| Section | Covers |
|---|---|
| 0 and 1 | Why hand-written bar weights were replaced by a ledger. Four principles |
| 2 | The ledger, the monthly order of operations, the cash leak |
| 3 to 6 | Net Worth, Safety, Freedom, Life |
| 7 | Synthetic market, small caps, lesson windows |
| 8 and 9 | Debt and the shock cascade |
| 10 and 10.1 | Every sheet column, rules 1 to 18, engine tokens |
| 11 | League score |
| 12 | Tuning constants |
| 13 | Calibration targets and validation tests |
| 14 | What is uncertain, and a "Deliberate. Do not fix." table |
| 15 | Build phases for the engine |

### Built so far: engine

`ENGINE.md` is the build brief: seven steps, each finished only when its tests pass. The
engine is plain JavaScript with no dependencies and no framework, so it runs unchanged in
Node for tests and in a browser for the game.

| Step | What it does | Status |
|---|---|---|
| 1. State and ledger | The opening position and the eleven-step month: salary, retirement credit, living costs, returns on fixed-rate balances, the cash leak, history | Done |
| 2. The four bars | Net Worth, Safety, Freedom and Life, with the workings behind each | Done |
| 3. Applying a decision | Every sheet column: money, deposits, assets, cover, commitments, redirects and pauses, Life, deferred callbacks | Done |
| 4. Returns and debt | The scripted market, seeded noise that is bit-identical in every browser, gold moving partly with equity, debt amortisation, EMI purchases as debts | Done |
| 5. Shocks | The month 22 layoff (salary stops, one month's severance, a D29 choice restarts it) and the five-step payment cascade on any month that ends with cash below zero. Family money is a 0% debt, with one Life penalty per episode | Done |
| 6. Text tokens | `engine/tokens.js` gives each token's raw value. `text/render.js`, outside the engine, formats it, capitalises, and drops a sentence whose value is unavailable. A callback with no text left does not happen at all (maths doc rule 28) | Done |
| 7. Calibration harness | `calibration/`: four deterministic player types, judged against the section 13 targets at months 21 and 24, then 1,000 random playthroughs as a secondary measure, plus the four validation tests. Reports only. A proposed constant can be tried from the command line without editing section 12 | Built. Some results await rulings, maths doc section 14 |

| Check | State at v34, 30 September 2026 |
|---|---|
| Engine tests | 70 pass, plus 17 text tests and 10 calibration tests, including all four lesson windows over 200 seeds in the engine's own market |
| Chrome against Node | Bit-identical: 24 months, 528 values, including a run with an EMI purchase and market returns |
| Do-nothing baseline | Month 24 net worth 3,22,113, up from 3,00,877 at v28 because the player now starts with 20,000, plus 1,236 of interest on it. Before that it fell from 3,84,670 because the layoff reaches everyone. An unexplained rise means something is wrong |

The small cap script is written only to month 40, so a player holding small caps cannot be
advanced past it. The engine refuses rather than guessing. A player who never makes a D29
choice never gets a salary back. The open questions from step 5 are in maths doc section 14.

### Built so far: playable Chapter 1

`UI.md` version 2 is the build brief: seven steps, plain HTML, CSS and ES modules, no
dependencies. The game lives in `game/` and is separate from the Phase 0 harness. Version 1
of the brief, and the build made to it, were thrown away: it called for no illustration, no
onboarding and no bars until late, which produced a screen of text on black.

**The design lives in `design/`.** Eight screens as plain HTML, plus the logo and a README:
Landing, Home, HomeLocked, Decision, Consequence, MonthClose, ChapterReport, and B-Decision, which is an unapproved
paper alternative kept for comparison. They are the source of truth for look, and they win
wherever `UI.md` disagrees with them. The canvas those screens came from is not reachable
from this machine, and `UI.md` points at a canvas link in this document that never existed,
so `design/` is the design source of record. Open any file at 390px wide.

| Step | What it does | Status |
|---|---|---|
| 1. Landing | The landing screen, colour tokens and both faces loaded; its mark is the Dry Run logo, drawn in code in `game/screens/landing.js` from the same geometry as `design/dry-run-mark.svg`, the button starts a run | Done |
| 2. Decision and consequence | With illustration and a moving bar. Done when D01-C plays and the Freedom bar visibly moves | Done |
| 3. Session loop | Month card through hook. Done when month 1 plays end to end | Done. The concept card and the hook were added with step 7 |
| 4. Home | Four live bars and net worth. Done when the bars match the engine | Done. The streak was added with step 7 |
| 5. Save and resume | One session per day. Done when closing and reopening continues where you were | Done |
| 6. Progress timeline | Tap any month, see what you chose | Done. Its own artboard is still open (`UI.md`) |
| 7. Streak, concepts, chapter report | Done when Chapter 1 is playable start to finish | Done. Chapter 1 plays from landing to the chapter report, and the report ends in the timeline |

| Item | Detail |
|---|---|
| Typefaces | Self-hosted in `game/fonts/`, so the game needs no network, both under the SIL Open Font License. **Display: Noto Serif Devanagari** (the Noto Project), one variable file with the width fixed at normal and every weight from 500 to 800, 165KB, chosen for the printed quality of a book serif. Checked with fontTools before use: all 128 Devanagari characters, the rupee sign, and digits that share one width at 500, 700 and 800, so a counting money figure does not jitter; it has no `tnum` feature and needs none. **Body: Mukta** (Ek Type), two weights, 191KB each, 127 Devanagari characters, the rupee sign and tabular figures. `design/` loads the same two faces from Google Fonts. **Ruled out:** Martel and Tiro Devanagari Hindi, because their digits are proportional and neither has `tnum`, so a counting money figure would jitter; Martel also lacks six Devanagari characters and a 500 weight. Anek Devanagari, the first display face, passed every check and was replaced for look |
| Colour | `game/tokens.css` holds every colour and both faces, nothing else. The eight names in `UI.md` plus seven values `design/` uses that `UI.md` does not list, such as the text colour on marigold and the two dimmer bone shades |
| Landing | Built to `design/Landing.html`, copy word for word. The lede and second bullet are the product owner's rewrites and the name field is cut (30 September 2026, `ONBOARDING.md` section 5). The title keeps the artboard's three lines at every width: its size follows the content width, measured against its widest line, "Four minutes a day.", in Noto Serif Devanagari 800, and stops at 40px. The artboard's title is 31px, the size the build uses at 390 |
| Decision and consequence | Built to `design/Decision.html` and `design/Consequence.html`. Copy is the sheet's, which differs from the artboards in places ("Submit the tax declaration now"). Every option card has the same slate left edge (`UI.md` rule 7): the artboard first coloured them marigold, teal, vermilion, which told the player teal was right and vermilion wrong. `design/Decision.html` is corrected; `design/B-Decision.html` was already neutral. The consequence leaves after 2.5 seconds, sooner on a tap. Illustrations are in `game/screens/illustrations.js`, one for each of the 30 decisions (row "Illustrations" below) |
| The moving bar | The consequence shows the bar the engine's `bars` effect says moved most, and shows no bar when none moved. For D01 that means D01-C moves Freedom from 100 to 91, and D01-A and D01-B move no bar at all. Most effects land when the month runs, which is step 3, and there is deliberately no engine preview of month-end bars. The runway labels under the artboard's Safety bar ("1.2 months") stay out until `text/` has a months format and the design has them. The falling bar's hatch colour is not in `design/`; it is matched to the rising one |
| Engine additions | `decisionsForMonth(state)` and `getDecision(id)` in `engine/content.js`, so the UI reads the sheet through the engine's interface and gets copies it cannot change. `salaryThisMonth(state)` in `engine/ledger.js`, so a month card can say what this month will pay before the month runs, with the layoff, a restart and raises applied as the month will apply them. `compareBars(before, after)` in `engine/bars.js`, so the month close shows each bar's change without working it out |
| Session loop | Month card, each of the month's decisions with its consequence, the month run by `advanceMonth`, any callbacks that land, the month close. Close goes Home, and Home's button plays the next month. The first month starts straight from the landing screen. Screens in `game/screens/`: `month-card.js`, `callback.js`, `month-close.js`, and `timed.js` for the three that leave by themselves |
| Month card | No artboard. "Month 1. You are 22." is `UI.md`'s and the harness's. The salary line, "Salary credited. ₹41,300 in.", is the core loop's wording in section 4, with `salaryThisMonth`. Shown only when there is salary. Leaves after 2 seconds |
| Callback | No artboard. The deferred text alone on the ground, in the consequence's result type. Read with `tokenValues` straight after the month runs, as `engine/tokens.js` says. Leaves after 3.5 seconds, sooner on a tap |
| Month close | Built to `design/MonthClose.html`: net worth counting from the month's start, the change, three bars moving. Figures from `compareBars` in `engine/bars.js`, money from `formatMoney` in `text/render.js`. The count always ends on the engine's figure, on a timer, even when a hidden tab or headless browser holds frames back. Under the bars, the month's concept card (v24), and above Close, next month's hook line (v22). Both rows below |
| Home | Built to `design/Home.html`: the chapter, net worth and last month's change, the Safety, Freedom and Life bars, month and age, "Play the month". Values are `getBars` as they stand, colours are the month just closed (`compareBars`) with Safety's danger. Checked in a browser: the values Home draws equal `getBars` from the engine on three paths. Beside Safety, runway ("0.1 months of runway", `formatMonths`); beside Freedom, the committed share ("64% committed", or "64% of your last salary committed" while there is no salary, `formatCommitted`); both read `explainBars` and are tested in `text/`. Life has no figure behind it, so its space is empty (maths doc section 14). The chapter number is the sheet's `chapter` in words and the title its `chapter_title` (v21). The streak shows top right (row "Streak" below) |
| Save and resume | `game/save.js`. One `localStorage` key holds what the player did, not the engine's state: seed, every choice in order, months closed, the day the last one closed, the streak, and which bars have had their line shown (once per player, all of them once month 1 has closed). Reopening replays the choices through the engine (`UI.md` build rule 4) and always lands on Home (since 28 September 2026). Partway through a month, Home lists the choices made so far with their result lines and its button replays the month card, then continues to the next decision, or to the month's callbacks and close when every decision is made. The button reads "Carry on with the month" and the list's heading "This month so far", the product owner's copy (`design/HomeContinue.html`). A save that no longer replays, because the sheet changed under it, is dropped and the landing screen shows. Checked across real browser restarts on one profile: mid-month, a month run but not closed, closed today, closed yesterday, three months in; the replayed figures equal the ones played |
| Progress timeline | `game/screens/timeline.js`, data from `game/timeline.js`, which replays the save through `replay`'s two hooks. Section 4's Progress screen: the life so far, oldest at the top, one dot a month coloured by how net worth moved (`UI.md` rule 4), the change beside it. Tap a month to see each option chosen and the result line it showed, both the sheet's; one month open at a time. It opens from Home's "Month N · you are A · your life so far" line, the last part in marigold so it reads as a link (`design/Home.html`, `design/HomeLocked.html`), and closes back to Home. Cost is shown by month, not by choice: the engine keeps no attribution of a month's change to a choice (maths doc section 14). No artboard exists: it reuses Home's heading and month line, the consequence's chosen card and month close's chip, and adds no words, its close button labelled with month close's "Close". Checked with real taps in a browser after a resume: the months, their changes and their choices match the engine |
| Streak | Days in a row on which the player closed a month, kept in the save. Closing the day after the last close adds one; a gap starts again at one. Home shows it top right with the flame from `design/Home.html`, in slate because marigold is money only (both Home artboards corrected), hidden while it is 0 so a new or broken streak shows no zero. Checked in a browser across simulated days: 6 through yesterday becomes 7, a three-day gap hides it and the next close makes it 1 |
| Chapter 1 end to end | All 24 months play through the real screens without an error, on two paths (every first option, every last option). After month 24 closes, the chapter report stands in place of Home, and the save's replay stops at the chapter's end rather than running an empty month 25 (row "Chapter report" below) |
| Hook lines | `hook_line` on Decisions (v22, prefix removed in v23), on the first decision of each month, months 2 to 24: 23 lines. **They are the product owner's copy, drafted by an assistant and reviewed (`HOOKS.md`), not the sheet's original content.** The close of month N shows month N+1's line above Close, and the locked Home shows the same line above its month line, the screen a returning player sees most. Above the line, the artboard's "Next month" label: the label is design, the line is content, so the lines do not begin "Next month:" (v23). Month 1 has none. Month 24's close shows none, and the chapter report follows it |
| Concept cards | `concept_title` and `concept_body` on Decisions (v24), on the one decision per month that teaches the concept, not always the month's first (`CONCEPTS.md`). 20 cards; months 7, 13, 19 and 23 carry none, deliberately: naming a concept there would mean inventing one. **They are the product owner's copy, drafted by an assistant and reviewed, not the sheet's original content.** The card unlocks because the month happened, whatever option was chosen: `conceptForMonth(month)` in `engine/content.js`, tested. Month close shows it under the bars, built to `design/MonthClose.html`, except that the lock and "You learned something" are slate, not the artboard's marigold, because marigold is money only. Month 11's card quotes 3.5% a month, the rate D17-C states, so the stated terms check holds it to `CARD_MONTHLY_RATE` (27 terms). Month close closes up below 800px tall so Close stays on screen with a card and a hook |
| Chapter report | `game/screens/report.js`, to `design/ChapterReport.html` and `CHAPTER-REPORT.md`. It stands where Home would once month 24 closes, and when the game is reopened after that (`chapterComplete(state)`; the save's replay stops at the chapter's end rather than running an empty month 25). The one screen that scrolls. A report, not a verdict: it names months, not decisions. It shows the chapter heading with its length and the player's age, net worth and its change over the chapter, the three bars with their figures, the months that moved most (the highest and lowest of `chapterMonths(state)` in `engine/chapter.js`, tested against what month close showed), the timeline from the button at the end and back, the concepts unlocked (the first eight titles in month order, as written, then the rest counted in words), and the Chapter two block. Checked in a browser after a reopen: the months it names equal the engine's |
| Illustrations | `game/screens/illustrations.js`: D01 from the artboards, D02 to D07 from `ILLUSTRATIONS-1.md`, D08 to D13 from `ILLUSTRATIONS-2.md`, D14 to D19 from `ILLUSTRATIONS-3.md`, D20 to D25 from `ILLUSTRATIONS-4.md`, D26 to D30 from `ILLUSTRATIONS-5.md`: all thirty Chapter 1 decisions have one. Colours are tokens, not hex. D02 to D30's muted form, for the consequence screen, is derived rather than drawn: the same drawing with each colour swapped for its muted one through the table in the file. Two colours the swap table did not list, the paper in shade (#E0D9CB) and the dimmer paper (#E4DED2), are muted at the table's own ratio for paper, about 0.575 of each channel; batch 2's paper in deep shade (#CFC7B6) came with its muted value, #77746D. D13 is an envelope: its first drawing, a chart, had inflation finishing above the raise, contradicting D13's 8% against 6%, and any chart would have shown the answer. On a screen shorter than the drawing's shape, the whole drawing fits inside the block instead of being cropped. Colour never picks a side before the player has read the options: D16's seedling is bone, D04's coin marigold, D24's two knobs alike and D29's doorway bone, each changed after review (`UI.md` rule 7). A decision with four options (D07, D14, D17) gives its illustration and situation less room, so the fourth card stays on screen |
| Chapter report copy | **The product owner's copy, drafted by an assistant and reviewed (`REPORT-COPY.md`), not the sheet's original content.** Three pieces. The line under each month the report names: `month_summary` on the first decision of each month, all 24 (v25), read through `monthSummary(month)` in `engine/content.js`, tested. The line under "Chapter two": "Building is being written. You are 24, and the money gets more complicated.", in `game/screens/report.js` until Chapter 2 has decisions and a real hook. The button at the end: "See your life so far", opening the timeline, whose Close returns to the report; the "see every month" link above it is gone. `design/ChapterReport.html` matches. The product name is now decided (section 7) |
| One session per day | Relaxed 31 October 2026 (UI.md rule 9): the first three months play in one sitting, and Home, once it waits for tomorrow, also offers "Play the next month now", at no cost to the streak. The chapter report states the months and the calendar days they took. Before that: one month closed per local calendar day. A month started and left unfinished does not use the day up. Once a month is closed today, Home's button reads "Come back tomorrow", disabled, with "One month a day. Month {n} is waiting." under it, the month number the engine's. Both lines are the product owner's copy, not the sheet's, drawn in `design/HomeLocked.html`. The hook line shows on this screen too (row "Hook lines" above). The screenshot script plays past the limit, except with `stop=home`, where it shows the locked Home |
| Bar colour | Means change, not level, everywhere (`UI.md` rule 4): teal rose, vermilion fell, slate did not move, and how full the bar is shows the level. One exception: Safety below `SAFETY_DANGER_MONTHS` (1) of runway is vermilion whatever it did, as a warning. The constant is in maths doc section 12 and the engine answers it with `safetyInDanger(state)`. `design/Home.html` coloured Safety by level and `design/MonthClose.html` coloured Life marigold; both are corrected. The chosen card on the consequence stays slate, and `design/Consequence.html` matches |
| Settings | `game/config.js`: the product name (Dry Run), the seed, and the three screen timings |
| Money on screen | `formatMoney` in `text/render.js`: the rupee sign, to the rupee, Indian grouping, the minus before the sign. Built on `formatExactRupees`. The copy's own figures still use `formatRupees`, which rounds |
| Screenshots | `python scripts/screenshot_ui.py OUT_DIR ""` shows a screen at 320, 360 and 390px side by side, and a query string picks the state: `stop=home` (after a month, such as `play=D01-B,D02-C&stop=home`), `stop=timeline` with `month=N` to open one, `stop=month`, `stop=decision`, `play=D01-C&stop=consequence`, `play=D01-C,D02-A&stop=close`, or `begin=1`. `play` takes option ids separated by commas; the loop taps through everything else, including Close. D01-A's callback shows with `play=D01-A,D02-A,D03-A,D04-A,D05-A,D06-A&stop=callback`. Headless Chrome will not make a window narrower than about 500px, so each width is an iframe of exactly that size |
| Logo at small sizes | Checked at 128, 48 and 32px. 128 and 48 read well: 24 ticks, 9 marigold, the bone centre. At 32 the ticks blur into a dashed ring and the count is lost. What survives is a marigold arc over a slate ring and the bone dot, so it reads as a progress dial. Design unchanged, reported only. The slate ticks are dim against the deep ground, the weakest part at 32 |
| Narrow and short screens | The artboards are drawn at 390px. Two media queries carry them down: under 380px wide, and under 700px tall, where the landing tightens so the button stays above the fold on a 320 by 568 phone |

### Built so far: Phase 0 harness

| Item | Detail |
|---|---|
| File | `index.html`. One file of plain HTML, CSS and JavaScript, no dependencies, opens from disk. Deliberately throwaway |
| Brief | `TASK.md` |
| Flow | Start screen, month card (2 seconds), situation and options, immediate result (2.5 seconds, tap to skip), callback cards (3.5 seconds, tap to skip), then "Do you want to know what happens next?" and a free text question |
| Numbers | No bars, scores or net worth. Only figures that are in the copy |
| Quit | On every screen, two taps to confirm |
| Logging | Each choice with its time on screen, quits, and both end answers. Kept in memory and copied to browser storage after every event. CSV download on the end screens, or by holding the title |
| Data | `scripts/xlsx_to_json.py` exports the 12 test decisions to `data/decisions.json` and embeds them in `index.html` |
| Tested | Script runs in headless Chrome only. All 12 decision screens fit without scrolling at 320×568, 360×640 and 390×844, rechecked at v28 on 27 September 2026 by playing the harness through: every one at full size, no shrinking, including D02 with its longer situation and labels. At 320×568 D02's last card now reaches the bottom padding, so D02 has no room for more words. Logging, quit, CSV and storage failure were checked. Not checked on a real phone. Not run with people |

Know these before running Phase 0:

| Issue | Detail |
|---|---|
| Pass criterion | Decided: the gate stays on unprompted asking. Pass if at least 12 of 20 ask "what happens next?" before anyone asks them. The harness asks the question outright at the end, so its Yes or No answer is supplementary data, not the measure. A facilitator must be present for every session and note who asks before being asked |
| Test size | 12 decisions, not the plan's 30. Cut in v2 because people tire before the D26 to D29 chain |
| Callbacks that never show | D28, D29 and D30 callbacks land after month 24, so testers never see them |
| Stacked callbacks | Up to 3 callback cards can appear in a row, before D16 and before D28 |
| Figures in Phase 0 text | With no engine, token figures show the fixed Phase 0 samples, for example "up 9%" in D20, whatever the tester chose at D16 |
| Several testers on one phone | Every session is stored together and downloads in one CSV, split by `session_id`. Reload the page between testers. Nothing clears stored data |
| Closing the tab | Not logged. A session with no quit event and no end event means the tab was closed |
| Opening on a phone | Untested. Some phone browsers do not run a local file well, so a simple host may be needed |

### Where the build has moved from the original spec

| Original spec | Now | Why |
|---|---|---|
| 3 to 5 decisions per session (section 1) | 30 decisions over 24 months, about 1.25 a month | Not resolved. The MVP plan also calls for about 100 Chapter 1 decisions |
| Each decision carries an immediate effect per bar (section 4, content engine) | Bars are computed from a ledger. The hand-written `safety` and `freedom` columns are still in the sheet at v34 as a cross-check. The engine does not read them. Deleting them is not yet done | Hand-written weights counted the same event twice. Maths doc section 0 |
| Market: lagged history or fully synthetic (section 3) | Fully synthetic and seeded, with scripted regimes | Section 3 allowed either. Synthetic also guarantees every player gets the same crash |
| Authoring tool undecided (original section 7) | Spreadsheet plus Python scripts, in practice | Decided by use, not formally |
| Deferred consequences surface 3 to 24 months later (section 4, writing rules) | Callbacks are checked against the engine's timing. D07-B's callback described breaking an FD that had already matured, and was rewritten in v15 | Copy and timing can contradict each other in ways that only show when the months are run |

---

## 6. Known risks

| Risk | How real | Response |
|---|---|---|
| The decisions are not actually fun | Very real. Main risk. | Phase 0 finds this out in 3 weeks for almost no money |
| 900 decisions is too much writing | Real | MVP needs 100. Build the authoring tool early |
| Users learn nothing and it is just a game | Moderate | Concept unlocks and Life Report are the proof. Test whether people can explain an SIP after Chapter 2 |
| Someone funded ships it first | Low but rising | Watch Groww, Zerodha, Jar. Speed over polish |
| SEBI widens what counts as advice | Low | Stay fictional. Keep legal review budget available |
| Indian users will not pay for education | Real. Zerodha Varsity trained the market to expect free. | Free tier must be complete. Charge for depth, never for access |

---

## 7. What is not yet decided

| Question | State | What it affects |
|---|---|---|
| UI tech stack | Not chosen. `ENGINE.md` says to decide it after the engine is calibrated, at step 7. The Phase 0 harness is throwaway plain HTML and does not decide it. The playable Chapter 1 in `game/` is plain HTML, CSS and ES modules with no dependencies, as `UI.md` version 2 asks; that was a build brief, not a stack decision | The MVP is mobile web with no app store. Android comes in Phase 1 and iOS in Phase 2, so the stack has to serve web first and apps later |
| Storage | Not chosen. Phase 0 uses browser storage and a manual CSV download only. The playable Chapter 1 keeps its save in browser storage (`game/save.js`) | No login until session 5 means sessions 1 to 4 must live on the device. Accounts and sync come in Phase 1. Any stored personal data needs DPDP notice, consent and deletion |

Decided since the original was written:

| Question | Decision |
|---|---|
| Product name | **Dry Run.** Decided, **not trademark-checked**. Still to do: App Store check, Play Store check and a domain check. It goes to the lawyer with the SEBI review before launch. It carries no currency or country, so it works in any market |
| Logo | A ring of 24 tick marks round a circle, on the deep blue ground: 9 in marigold and 15 in slate, one for each month of Chapter 1. No currency symbol anywhere, because the product must work in any country. `design/dry-run-mark.svg`, copied to `game/favicon.svg`. Small-size finding in section 5 |
| The simulation maths | Written. `SIMULATION-MATHS.md` |
| Authoring tool | Spreadsheet plus scripts, in practice |
| Chapter end months | Months 24, 60, 108, 156, 204 and 240, from the days-per-chapter table in section 4. League score benchmarks for every chapter are now in maths doc section 13 |
| Phase 0 gate | Stays on unprompted asking of "what happens next?", noted by a facilitator present at every session. The harness question is supplementary data, not the measure |
| Hosting | Cloudflare, ruled 27 September 2026, as a Worker with static assets, since Cloudflare offers new accounts no Pages flow. Free `game-finance.<account subdomain>.workers.dev` address until the Dry Run domain is cleared. Private behind Cloudflare Access until the 18+ gate and the DPDP notice exist. Deploys only from the `live` branch. Publishes only the game, engine and text modules, built by `scripts/build_site.sh`. `HOSTING.md` has the comparison and the setup steps |
| Engine language | Plain JavaScript ES modules, no dependencies, no build step. Runs in Node and in a browser. The engine runs in memory and knows nothing about storage. `ENGINE.md` |

Open items inside the maths and the sheet:

| Item | Where it is recorded |
|---|---|
| D28-A's "Costs down to 22,000" is still checked as a stated term, but depends on the player's path the way D28's figure did before it became a token | Maths doc section 14 |
| Retirement fund rate, contribution rules and the tax model are not verified against primary sources. Three constants are UNVERIFIED placeholders: `RETIREMENT_CONTRIBUTION_MONTHLY`, `RETIREMENT_ANNUAL_RATE` and `TAX_PRODUCT_ANNUAL_RATE`. The export lists them and a test fails if the retirement marks are removed | Maths doc sections 12 and 14 |
| The small cap market after month 40 is not written | Maths doc section 7 |
| Unconfirmed sheet values, shown as yellow cells: D14-B and D14-D investment class, D27-C split, D21-C and D05-A premiums, D02 deposits, D29-C, D30, D17-C, D18-A and D28-C durations | Maths doc section 10, open items |
| D16-A's early text lost its two-month build-up. D06-C's total saved counts all saving. D28-B does not stop the D27 increases | Maths doc section 10, open items |
| D06-C says "the tiffin guy", which assumes the player is a man | Not recorded in the doc |
| Some numbers are still not named constants: the league score weights (section 11) | Not recorded in the doc |
| Nothing in Chapter 1 shows how long a card on minimum payments takes to clear: 291 months for 40,000 | Maths doc section 14, content gap |

---

## 8. How to pick up the project

### Files

| File | What it is |
|---|---|
| `HANDOFF.md` | This document |
| `ORIGINAL-HANDOFF.md` | The original handoff, unchanged |
| `SIMULATION-MATHS.md` | Engine rules. The source of truth |
| `ENGINE.md` | The engine build brief: seven steps, interfaces and rules |
| `chapter1_decisions_v2.xlsx` to `v34.xlsx` | Every version of the decision sheet. v34 is current |
| `UI.md` | The build brief for the playable Chapter 1, version 2 |
| `HOOKS.md`, `CONCEPTS.md`, `REPORT-COPY.md` | The product owner's hook lines, concept cards and chapter report copy, drafted by an assistant and reviewed. Now in the sheet (v22 to v26) |
| `CHAPTER-REPORT.md` | The chapter report's spec |
| `ILLUSTRATIONS-1.md` to `ILLUSTRATIONS-5.md` | The illustration batches for D02 to D30 |
| `TASK.md` | The Phase 0 harness brief |
| `index.html` | The Phase 0 harness |
| `data/decisions.json` | The 12 test decisions, exported from the sheet |
| `data/chapter1.json` | The full sheet, every decision and option, exported for the engine |
| `engine/` | The engine. `index.js` is the public interface. `constants.js` and `decisions.js` are generated, never edited by hand. Tests in `engine/test/` |
| `design/` | The approved screens as plain HTML, and the README that says which is which. The source of truth for look |
| `game/` | The playable Chapter 1, `UI.md` version 2. `main.js`, `screens/`, `style.css`, `tokens.css`, `config.js`, and both faces in `fonts/` |
| `scripts/check_decision_fit.py` | Renders all 30 decisions at 320 by 568, 360 by 640 and 390 by 844 and fails if any option card ends below the screen. Uses `scripts/decision_fit.html` |
| `scripts/screenshot_ui.py` | Screenshots the game at 320, 360 and 390px |
| `ONBOARDING.md` | Why a new player leaves in seconds, and options for the fix: where to learn the four bars, what to play toward, where "nothing is explained" is right and wrong, and what to cut from the first ninety seconds. Sections 5 to 8 hold the 30 September rulings, the build, the fit measurements, How it works and the testing tools |
| `LANDING-MOTION.md` | Five directions for motion on the landing screen, with a sketch of a figure in the illustrations' style (`LANDING-MOTION-figure.svg`). Proposals only |
| `game/testing.js` | Testing tools, tester builds only: the corner control, its panel (Start again, jump to a month) and the `?restart` address. `ONBOARDING.md` section 9 |
| `scripts/export_balanced_path.mjs` | Writes `game/balanced-path.js`, the Balanced player's choice for every decision on the game's seed, which the testers' jump replays. Re-run when the sheet or section 12 changes; `--check` fails if it is stale, and the tester build runs it |
| `FIRST-SESSION.md` | The first session: why the deployed site resumed past the landing screen, re-entry as built, motion in the first ninety seconds measured, what a new player knows screen by screen, and the proposals on D03's figures and on showing net worth during the month |
| `HOSTING.md` | Hosting: what the game needs served, four hosts compared, where hosting touches the legal work, the decision, and the Cloudflare setup step by step |
| `wrangler.jsonc` | Cloudflare's configuration: an assets-only Worker named `game-finance` serving `site/`. The name must match the Cloudflare project. The deploying branch is set in the dashboard, not here |
| `hosting/` | The files Cloudflare serves at the site root: `_redirects` (root to `/game/`), `_headers` (no caching without a check, no indexing), `robots.txt` |
| `scripts/build_site.sh` | Cloudflare's build command. Copies the game, the engine and text modules and `hosting/` into `site/`, and fails if anything else would be published |
| `calibration/` | The step 7 harness. `run.js` prints the report, `harness.js` does the measuring. Reads its targets from maths doc section 13. Leads with the four player types, which the targets are judged against; random play follows. `trial.mjs` tries proposed constants and market changes, `trial-formulas.mjs` tries formula changes on a patched copy of the engine. `REPORT-2026-09-21.md` is the calibration review, `REPORT-2026-09-27.md` the report after the first rulings on it, and `REPORT-2026-09-27b.md` after the second. `trial-formulas.mjs` no longer runs its variants, since they are applied; it is kept as the record. Tests in `calibration/test/` |
| `text/` | Fills the engine's token values into the copy: Indian rupee grouping, "down 22%", counts in words, capitals, dropped sentences. Kept outside `engine/` because the engine never formats (ENGINE.md rule 2). Tests in `text/test/` |
| `engine/browser-check.html` | Runs the engine in a browser, used by `scripts/check_engine_browser.py` |
| `scripts/xlsx_to_json.py` | Exports the test decisions for Phase 0 (filling tokens with samples, embedding in `index.html`) and the full sheet for the engine |
| `scripts/export_constants.py` | Writes `engine/constants.js` from maths doc section 12 and the sheet README. Lists UNVERIFIED constants |
| `scripts/check_engine_browser.py` | Runs the engine in headless Chrome and fails unless every value is bit-identical to Node |
| `scripts/check_stated_terms.py` | Fails if a constant in maths doc section 12 disagrees with a figure the copy quotes |
| `scripts/export_market_script.py` | Writes `data/market-script.json` and `engine/market-script.js` from the section 7 market scripts and lesson windows. The named exception to rule 1, section 12 |

### Running things

Needs Python 3 with openpyxl (`pip install openpyxl`), Node 20 or later, and Chrome for the
browser check. Last run with Python 3.12, Node 20.18 and Chrome 153.

| Task | Command |
|---|---|
| Check quoted figures against constants | `python scripts/check_stated_terms.py` |
| Re-export the sheet, for Phase 0 and the engine | `python scripts/xlsx_to_json.py` |
| Regenerate the engine's constants | `python scripts/export_constants.py` |
| Regenerate the market scripts | `python scripts/export_market_script.py` |
| Run the engine tests | `node --test test/`, from inside `engine/` |
| Run the text tests | `node --test test/`, from inside `text/` |
| Run the calibration report | `node calibration/run.js`, about 160 seconds, since Balanced plays each option on to month 24. Add constants to try one, such as `node calibration/run.js 1000 CASH_LEAK_RATE=0.1` |
| Run the calibration tests | `node --test test/`, from inside `calibration/` |
| Play the game | Serve the project folder, for example `python -m http.server`, and open `/game/`. Browsers refuse ES modules from a file opened from disk |
| Build the published site | `bash scripts/build_site.sh`, which writes `site/`. Serve that folder to see exactly what players get |
| Release to players | `git push origin main:live`, only when the product owner asks. Cloudflare rebuilds within minutes |
| Screenshot the game | `python scripts/screenshot_ui.py OUT_DIR ""` |
| Check every decision fits a phone | `python scripts/check_decision_fit.py`, about a minute. Its 320 frame is 568 tall; the screenshot script's is taller, so do not use screenshots to judge fit |
| Open a design screen | Open any file in `design/` in a browser at 390px wide |
| Check the engine in a browser | `python scripts/check_engine_browser.py` |
| Run the harness | Open `index.html` in a browser |

At v34, on 30 September 2026, every check passes: 39 stated terms, 70 engine tests including
the four lesson windows, the layoff and every housing and layoff path to month 24, 17 text
tests including 300 random playthroughs with no raw token, 10 calibration tests including the
rule 29 two-option test, all 30 decisions fitting on two paths at three phone sizes, and a
bit-identical browser run. v20, v27, v28, v31 and v32 changed D29's, D02's, D26's and D20's
text, all Phase 0 test decisions, so the Phase 0 export changed on purpose. The calibration
report itself does not pass: see section 14 of the maths doc.

### Working rules

| Rule | Why |
|---|---|
| Commit and push at the end of every task, even partial work, even unasked. If a push fails, stop and tell the owner at once | The owner switches accounts and machines, so uncommitted work is lost. See "Standing rule" at the top |
| Never push to `live` unless the product owner asks for a release. A release is `git push origin main:live` | `live` is what players see. The standing rule pushes partial work to `main` every task, so `main` is never assumed ready |
| Never edit a sheet version in place. Save the next version and add a README changelog entry | The versions are the record of each ruling |
| After a new sheet version, update the file name in `xlsx_to_json.py`, `check_stated_terms.py` and `export_constants.py`, then re-export and run every check | Three scripts name the sheet file directly |
| The maths doc wins over the sheet | Maths doc section 10 |
| Every figure in the copy is either a quoted term or an outcome. Quoted terms stay in the text and constants must match them. Outcomes become tokens | Maths doc rule 16 |
| When the copy and the sheet disagree on a quoted term, the copy wins, even when changing the sheet looks like the easier fix | Rule 16. v14 got this wrong for D07-B and v15 reverted it |
| The engine holds no numbers of its own. Every number comes from maths doc section 12 or the sheet | `ENGINE.md` rule 1 |
| An UNVERIFIED constant is a placeholder, never a real figure | Maths doc section 14 |
| The same seed and choices must give the same run in Node and every browser, bit for bit. No fractional powers | `ENGINE.md` rule 3 |
| Yellow cells in the sheet are unconfirmed values | Sheet README |
| Items in the "Deliberate. Do not fix." table are not bugs | Maths doc section 14. Each was ruled on |
| Phase 0 text should not change between versions unless on purpose. Check that the export produces the same `data/decisions.json` | Testers must see the same test |
| No real brand names anywhere | Legal requirement, section 3 |

### Suggested next steps

A suggestion, not a decision.

| Step | Why |
|---|---|
| Open the harness on a real phone | It has only been tested by script |
| Run Phase 0 with real people | The main risk in section 6 is still untested |
| Prepare the facilitator's note sheet: one line per tester, recording whether they asked "what happens next?" before the harness asked | The Phase 0 gate is measured there, not in the harness CSV, section 5 |
| Rule on the step 5 questions | Maths doc section 14: D28-C borrowing with savings in the bank, and D28-C's card undercutting the D17 refusal. D29-B's figure was settled in v20 (10 LPA). D29-A is survivable to month 24 for every housing choice; the studio player's recovery after month 24 is a Chapter 2 problem |
| Write D04-B a second sentence | Its callback needs a sentence that does not depend on the savings figure, so it still appears for a player who saved nothing. Maths doc section 14 |
| Chapter 2: give hoarding a real money cost | No Chapter 1 decision costs a maximum saver real money, so validation 1 is not passable until Chapter 2 has such decisions. The harness makes it live again by itself. Maths doc section 14 |
| Decide D16-B's callback | It says inflation took most of the money, but Net Worth is nominal and rises. Change the copy, or explain real against nominal on the concept card. Maths doc section 14 |
| Still open from step 7 | Validation 2's free lunches, validation 3 tested on almost no players, the chapter 1 league benchmarks. Maths doc section 14 |
| The maximum saver takes the D30 scam | Its greedy search reads Net Worth at month 24, and D30-B's loss lands at month 30. A limit of the section 13 definition, reported, not ruled. Maths doc section 14 |
| Rule on D28-A | The open maths item that blocks nothing today but will block calibration |
| Rule on copy that assumes a state, by group | Grouped in `FIRST-SESSION.md` 9.3 and updated in 10: A tokens (4 lines, D29 added), B options for players lacking what they assume (rule 29 decides the structural ones; D07, D19-A and D22-B are affordability and go through the cascade), C rewrites true on every path (7, D27 now true). 8.2 lists 16 lines false for some paths (D07's 20,000, D08's 38,000, D19's flatmate hook, D21's "no loan", D22's 32,000 and others) and 4 false on every path: D13-A's 8% is not in the engine, and D26's 8.4, 11 and 9 LPA do not match the pay the engine gives (6.24, 8.96, 6.84). Also D24-A's callback describes D24-B |
| Cash, net worth or both | Open question, `FIRST-SESSION.md` 6.4, including the month card's salary line against the net worth above it |
| Testing tools off before launch | `TEST_TOOLS` ("Start again") is on only in builds made with `--test-tools`. The tester deploy command uses it; a deploy for real players must not (`HOSTING.md` section 6) |
| Connect the repo to Cloudflare | Last release 30 September 2026: `live` at 59b2db1, the tester build with the landing opening and band, the corner testing control and the Balanced jump, deployed by hand with `wrangler deploy` (version 1e04f929, 17:32 UTC). A push to `live` does not deploy: the Worker has no Git connection, and every deploy so far was an upload. Until it is connected, each release is the manual command in `HOSTING.md` section 6. To connect: Workers & Pages, game-finance, Settings, Build: the repo, branch `live`, build `bash scripts/build_site.sh`, deploy `npx wrangler deploy` |
| Deploy on Cloudflare, then lock it | The product owner follows `HOSTING.md` section 6: fill in the Worker create screen and Deploy, set the production branch to `live`, check the Access policy, test the address |
| Decide the UI stack | `ENGINE.md` puts it after calibration, which is closed. The game is plain HTML, CSS and ES modules today. Storage and accounts are Phase 1 |
