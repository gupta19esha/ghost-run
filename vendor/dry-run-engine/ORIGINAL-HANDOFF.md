# Original context handoff: Finance Life Simulation Game

This is the original handoff document, written before any build work started. It is the
source for the concept, market research, legal constraints and product spec.

Use it as the input for HANDOFF.md. Sections 1 to 4 and 6 carry forward unchanged.
Sections 5, 7 and 8 are out of date and get rewritten against the current state.

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

## 5. Roadmap and status AT THE TIME THIS WAS WRITTEN

Out of date. Rewrite against the current state.

### Phase 0: prove the core is fun (weeks 1 to 3)

Not an app. A clickable prototype or even a Google Form with images.

- Write 30 decisions covering Chapter 1
- Put them in front of 20 people aged 22 to 30
- Watch them. Do not ask if they like it.
- Pass or fail: do at least 12 of 20 ask "what happens next?" without being prompted

### Phase 0.5: user research (week 2, parallel)

15 interviews, two questions only:

1. What is a money decision you got wrong in your twenties?
2. What happened, and when did you realise?

The answers to question 2 become the deferred consequences. This is where the emotional
weight comes from.

### MVP (weeks 4 to 12)

Mobile web, no app store, no login until session 5. Scope: Chapter 1 only, 24 sessions,
about 100 decisions, four bars, streak, concept unlocks, chapter report, share card.

The only question the MVP answers: do people come back?

| Metric | Fail | OK | Good |
|---|---|---|---|
| Day 1 return | under 25% | 35% | 45%+ |
| Day 7 return | under 12% | 18% | 25%+ |
| Day 30 return | under 5% | 8% | 12%+ |
| Session completion | under 70% | 80% | 90%+ |
| Median session length | over 7 min | 4 to 6 min | 3 to 5 min |

If Day 7 is under 12%, stop and fix the loop. Do not build Chapter 2. Retention problems
are never solved by more features.

### Phase 1 (months 4 to 7)

Only if MVP retention passes. Chapters 2 and 3 (about 300 more decisions), leagues,
streak freeze, India-chose reveal, accounts and sync, ads, Android build.

### Phase 2 (months 8 to 14)

Chapters 4 to 6, Life Report and endgame, paid tier launch, scenario packs, private
leagues, iOS build.

### Phase 3 (months 15+)

New Game Plus, regional languages starting with Hindi and Tamil, possible B2B licensing
to colleges and employers, which is how Zogo makes all its money.

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

## 7. What was not yet decided WHEN THIS WAS WRITTEN

Out of date. The simulation maths now exists. Rewrite the rest against the current state.

- Product name. Options floated: Crore, Chakra, Zindagi, Barah Saal. Nothing chosen.
- The simulation maths. NOW WRITTEN, see SIMULATION-MATHS.md.
- Tech stack.
- Whether to build the authoring tool in-house or use a spreadsheet plus a script.
