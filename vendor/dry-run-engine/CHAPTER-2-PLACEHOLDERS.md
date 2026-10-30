# Chapter 2 opening: placeholder copy

Every player-facing text field of D31 to D40 (sheets v35 and v36), and the three new lines in the
game's screens, is a placeholder until the product owner writes it. Generated from the sheet. Each
row: where it is, what the copy must say (the brief), and the figures it must quote. A figure under
"Must state" is a stated term (maths doc rule 16): `scripts/check_stated_terms.py` holds the sheet
to it now, and its pattern moves to the final wording when the copy is written. This exists on the
`chapter-2` branch only.

147 fields in the sheet, and 3 in the game.

## D31, month 25: Emergency fund, where to keep it

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | the year's layoff is behind you and whatever emergency money you had is thin or gone; the question is where to rebuild it. Must be true on every path, including one that is still waiting for salary to restart | none |
| why_it_matters | an emergency fund is a decision about access and return, not only about the amount | none |
| hook_line | month 25's line, shown at month 24's close: the chapter turns from surviving to building | none |
| concept_title | Emergency fund, as a working name | none |
| concept_body | what an emergency fund is for and how much is enough; no product names | none |
| month_summary | past tense, five words or fewer: the emergency fund was rebuilt, or not | none |
| D31-A option_label | move it into a liquid fund in one go | 40,000 once |
| D31-A immediate_text | the money is set aside, reachable in a day, earning a little more than savings | none |
| D31-A deferred_text | the fund is still there, a little larger; no figure | none |
| D31-B option_label | build it a little every month into a liquid fund | 6,000 a month |
| D31-B immediate_text | a standing transfer starts next month; the first weeks feel tighter | none |
| D31-B deferred_text | the habit has held for six months; no figure | none |
| D31-C option_label | spend some on what the layoff put off, keep the rest in savings | 15,000 spent, 25,000 kept |
| D31-C immediate_text | a few things you went without come back; the rest sits in savings, labelled for emergencies | none |
| D31-C deferred_text | the labelled money is still there; no figure | none |

## D32, month 25: Spending on friends, Life

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | friends plan a trip together after a hard year for everyone | 22,000 |
| why_it_matters | Life is a bar too; the cost of always saying no lands on it | none |
| D32-A option_label | go, and do it properly | 22,000 |
| D32-A immediate_text | the trip happens; it was needed | none |
| D32-A deferred_text | the photos are still the group's wallpaper; no figure | none |
| D32-B option_label | go, but the cheap version | 10,000 |
| D32-B immediate_text | train, shared room, one big dinner | none |
| D32-B deferred_text | nobody remembers the hotel; no figure | none |
| D32-C option_label | skip it this time | none |
| D32-C immediate_text | the money stays; the group chat goes quiet for a while | none |
| D32-C deferred_text | the next plan is made without asking you; no figure | none |

## D33, month 26: SIP, compounding

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | there is room for a small monthly amount; where it goes now decides what it is in ten years | 3,000 a month |
| why_it_matters | the same monthly amount compounds very differently depending on where it sits | none |
| hook_line | month 26's line: a small monthly amount, and where it goes | none |
| concept_title | Compounding, as a working name | none |
| concept_body | returns earning returns; why starting years earlier matters more than the amount; no promised returns | none |
| month_summary | past tense, five words or fewer | none |
| D33-A option_label | an index fund, every month | 3,000 a month |
| D33-A immediate_text | a second standing investment starts next month | none |
| D33-A deferred_text | ten months in; the balance has moved with the market. No figure: an outcome would need a token (rule 16) | none |
| D33-B option_label | a recurring deposit, every month | 3,000 a month for 24 months |
| D33-B immediate_text | fixed, predictable, locked for its term | none |
| D33-B deferred_text | the deposit grows on schedule; no figure | none |
| D33-C option_label | a gym and a weekend class instead | 3,000 a month |
| D33-C immediate_text | evenings and weekends feel like yours again | none |
| D33-C deferred_text | you have kept going; no figure | none |

## D34, month 27: Investing in skills, a raise

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | a certification would help at the next appraisal; it can be paid for, done through the company with strings attached, or learned for free at night | 55,200 |
| why_it_matters | money and time spent on skills is an investment with a delayed, uncertain payoff | none |
| hook_line | month 27's line: a course that might pay for itself | none |
| month_summary | past tense, five words or fewer | none |
| D34-A option_label | pay for the certification yourself | 55,200 |
| D34-A immediate_text | evenings go to study for three months | none |
| D34-A deferred_text | the appraisal comes with a raise | 4,000 a month more |
| D34-B option_label | take the company-sponsored version, with a bond | none |
| D34-B immediate_text | free, but you have promised to stay; no figure for the bond term, which nothing models | none |
| D34-B deferred_text | the raise comes, smaller, and so does a recruiter's call you cannot take | 2,500 a month more |
| D34-C option_label | learn it free online, at night | none |
| D34-C immediate_text | late nights, no certificate | none |
| D34-C deferred_text | a smaller raise, for what you can show without the certificate | 1,500 a month more |

## D35, month 27: Health cover for parents, emergency fund

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | your father needs a planned surgery that his cover does not reach; the bill comes to you | 80,000 |
| why_it_matters | parents' health is usually the first large bill a salaried child meets, and the reason family cover exists | none |
| concept_title | Health cover for parents, as a working name | none |
| concept_body | why a parent's hospital bill often lands on the child, and what cover for parents does; no insurer names | none |
| D35-A option_label | pay all of it | 80,000 |
| D35-A immediate_text | it is paid before anyone has to ask twice | none |
| D35-A deferred_text | your father is back on his walks; no figure | none |
| D35-B option_label | pay half, and ask your uncle for the rest | 40,000 |
| D35-B immediate_text | your uncle pays, and mentions it | none |
| D35-B deferred_text | he mentions it again at a family function; no figure | none |
| D35-C option_label | ask the hospital for a payment plan | 7,000 a month for twelve months |
| D35-C immediate_text | the surgery goes ahead now; the plan costs more in total than paying at once | 84,000 in all |
| D35-C deferred_text | the instalments are still going out; no figure | none |

## D36, month 28: Asset or expense, side income

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | a side project wants a better laptop than the one you have; it pays, for a while | 50,000, 4,000 a month for twelve months |
| why_it_matters | a purchase that earns is still a purchase; what it earns and for how long decides whether it was worth it | none |
| hook_line | month 28's line: weekend work, and what it needs | none |
| concept_title | Asset or expense, as a working name | none |
| concept_body | something bought that earns money or holds value, against something that only costs; a laptop that loses value but brings in work | none |
| month_summary | past tense, five words or fewer | none |
| D36-A option_label | the laptop the work wants | 50,000, 4,000 a month for twelve months |
| D36-A immediate_text | weekends go to the side project | none |
| D36-A deferred_text | the project ends; the laptop is worth much less than it cost; no figure | none |
| D36-B option_label | a cheaper laptop, and smaller jobs | 40,000, 2,500 a month for twelve months |
| D36-B immediate_text | some weekends go to the side project | none |
| D36-B deferred_text | the project ends; no figure | none |
| D36-C option_label | rent one by the month and try it first | 2,000 a month rent, 2,500 a month in, for six months |
| D36-C immediate_text | it pays a little more than it costs, for now | none |
| D36-C deferred_text | you returned the laptop months ago; no figure | none |

## D40, month 28: Term insurance, who depends on you

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | your father retires this year and your parents are starting to lean on your income; term cover is offered at two sizes. Every option here costs money every month: there is no choice that keeps it. Do not say anyone formally depends on you: the engine counts no dependents yet (section 4), so cover moves no bar | 1 crore, 50 lakh |
| why_it_matters | term cover is priced by the age you buy it at; what it protects is the income other people come to rely on | none |
| D40-A option_label | 1 crore of term cover | 1 crore for 1,000 a month |
| D40-A immediate_text | covered for far more than you earn in years; it feels like paying for nothing | none |
| D40-A deferred_text | a colleague a few years older is quoted much more for the same cover; no figure | none |
| D40-B option_label | a smaller policy, half the cover | 50 lakh for 600 a month |
| D40-B immediate_text | covered, for less; enough for now | none |
| D40-B deferred_text | your income has grown past what the cover was sized for; no figure | none |
| D40-C option_label | no cover; send your parents a fixed amount every month instead | 2,500 a month |
| D40-C immediate_text | help they can see now, and nothing for later | none |
| D40-C deferred_text | your parents have started counting on it; no figure | none |

## D37, month 29: Lump sums

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | the Diwali bonus lands whatever you choose; your family has its own ideas for it | 50,000 |
| why_it_matters | a lump sum is the easiest money to lose track of, and the easiest to invest | none |
| hook_line | month 29's line: the bonus is coming | none |
| concept_title | Lump sums, as a working name | none |
| concept_body | a bonus, a gift, an arrears payment: deciding before it arrives; no promised returns | none |
| month_summary | past tense, five words or fewer | none |
| D37-A option_label | all of it into the index fund | 50,000 |
| D37-A immediate_text | invested before it can be spent; your mother had other plans | none |
| D37-A deferred_text | it has moved with the market; no figure | none |
| D37-B option_label | half in gold for the family, half in a fixed deposit for a year | 25,000 in gold, 25,000 for a year |
| D37-B immediate_text | your mother is pleased with the gold | none |
| D37-B deferred_text | the deposit is halfway through its year; no figure | none |
| D37-C option_label | a family trip, and the rest in savings | 35,000 on the trip, 15,000 kept |
| D37-C immediate_text | the first trip your parents have taken in years | none |
| D37-C deferred_text | the photos are on your mother's phone; no figure | none |

## D38, month 29: A raise against your time

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | your manager offers a team lead role with more pay and weekends on call | 6,000 a month more |
| why_it_matters | a raise is paid in time as well as money; Life keeps the account | none |
| D38-A option_label | take the role | 6,000 a month more |
| D38-A immediate_text | the raise starts next month, and so do the weekends | none |
| D38-A deferred_text | the weekends have not let up; no figure | none |
| D38-B option_label | take it if the weekends go; less money | 4,000 a month more |
| D38-B immediate_text | agreed: a smaller raise and your weekends, but the weekdays run longer | none |
| D38-B deferred_text | it has held; no figure | none |
| D38-C option_label | decline, and take the trip you put off during the layoff | 20,000 |
| D38-C immediate_text | someone else gets the role; you get two weeks away | none |
| D38-C deferred_text | the trip is the thing you mention when people ask about the year; no figure | none |

## D39, month 30: Staying invested, timing the market

| Field | Brief | Must state |
|---|---|---|
| chapter_title | the chapter's name as Home shows it; the product spec (HANDOFF.md section 4) calls chapter 2 Building | none |
| situation_text | the market has been rising for months and everyone at work has an opinion; your index investment is {equity_change_pct}. That sentence drops for a player without one (section 10.1), so the rest must stand alone | 20,000 |
| why_it_matters | nobody can tell the top while standing on it; the fall that starts next month (section 7, months 31 to 40) is not hinted at here | none |
| hook_line | month 30's line: the market is up and everyone is talking about it. No hint of the fall | none |
| concept_title | Time in the market, as a working name | none |
| concept_body | why staying invested usually beats trying to time it; no predictions, no promised returns | none |
| month_summary | past tense, five words or fewer | none |
| D39-A option_label | pause the monthly investment until things settle | six months |
| D39-A immediate_text | the monthly investment stops for now | none |
| D39-A deferred_text | it is about to restart. Any figure for what the pause did would need a token (rule 16) | none |
| D39-B option_label | add a lump sum to the index while it is rising | 20,000 |
| D39-B immediate_text | it goes in at today's price | none |
| D39-B deferred_text | it has moved with the market; may carry {equity_change_pct}, which reads this option's holding | none |
| D39-C option_label | put it in a fixed deposit for a year and watch | 20,000 for a year |
| D39-C immediate_text | locked for a year at a known rate; no rate stated unless held to FD_ANNUAL_RATE | none |
| D39-C deferred_text | the deposit has two months to run; no figure | none |
| D39-D option_label | start in the index with a lump sum | 20,000 |
| D39-D immediate_text | your first index investment, at today's price | none |
| D39-D deferred_text | it has moved with the market; may carry {equity_change_pct}, which reads this option's holding | none |

## In the game's screens

| Where | Brief |
|---|---|
| `game/screens/report.js`, `CHAPTER_TWO` | The chapter 1 report's line about chapter two, Building, which now opens; you are 24. Replaces "Building is being written…" |
| `game/screens/report.js`, `BEGIN_NEXT` | The report's button into chapter two |
| `game/screens/opening-end.js`, `LINE` | After month 30: the opening is played and the rest of chapter two is being written |
