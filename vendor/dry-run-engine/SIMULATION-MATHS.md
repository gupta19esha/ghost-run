# Simulation maths

Chapter 1 to 6. Version 1, draft for review.

This document decides how a choice moves the bars, how money compounds, and how shocks
are weighted. It is the missing piece from section 7 of the handoff doc. Nothing gets
built on top of this until you have read it and disagreed with the parts you disagree
with.

---

## 0. What this fixes, and the one problem it found

The sheet currently carries five numbers per option: `money_once`, `money_monthly`,
`safety`, `freedom`, `life`.

Three of those five are double counting.

If an option moves 20,000 into a fixed deposit, Safety should rise because your liquid
assets rose. The ledger already knows that. Adding a hand-written `safety = +2` on top
counts the same event twice, and the two will disagree the moment you tune anything.

| Column | Verdict | What replaces it |
|---|---|---|
| `money_once` | Keep | Feeds the ledger directly |
| `money_monthly` | Keep | Feeds the ledger directly |
| `safety` | Replace | `liquidity_class`, `monthly_destination`, `health_cover_delta` and `term_cover_delta`. Facts the ledger cannot infer |
| `freedom` | Replace | `commitment_months` and `def_commitment_months`. How long the obligation runs |
| `life` | Keep | The only bar not derivable from money |

This is the single biggest change in this document. Section 10 defines the columns that
replace them.

---

## 1. Four principles

1. **Net Worth is calculated, never assigned.** Every rupee has a source and a
   destination. If a number cannot be traced to a ledger movement, it is not real.
2. **The same event, different outcomes.** Shocks are scripted so everyone gets the
   layoff. The damage is computed from your state. That gap is the whole lesson.
3. **The market is synthetic.** No real prices, no real index, no real lag rules to
   comply with. It is fiction that behaves like reality.
4. **Tuning lives in one table.** Section 12. Nobody edits logic to change a number.

---

## 2. The ledger

Every month, the simulation carries this state.

| Group | Fields |
|---|---|
| Income | `salary_gross`, `salary_net`, `bonus_pending` |
| Costs | `living_costs`, `minimum_living` |
| Liquid | `cash`, `cash_at_home`, `liquid_fund` |
| Locked | `fds[]` each with `opened_by`, `value` and `maturity_month`; `retirement_fund`, `endowment_balance`, `tax_product_balance` |
| Invested | `equity[]`, `gold[]`, `small_cap[]`, each a list of tagged holdings |
| Owned | `assets[]` each with purchase price, month, depreciation rate |
| Debt | `debts[]` each with principal, monthly rate, months remaining, type |
| Cover | `health_cover`, `term_cover`, `dependents` |
| Commitments | `commitments[]`, defined below |
| Monthly flows | `income_net`, `leak`, `discretionary_this_month`, recomputed every month |
| Soft | `life_score`, `knowledge[]` |

**Holdings are tagged.** Every holding in `equity[]`, `gold[]` and `small_cap[]` records:

| Field | Meaning |
|---|---|
| `opened_by` | The option_id that opened it, for example D16-A |
| `month_opened` | Month of that decision |
| `value` | Current value |
| `contributed` | Rupees paid in so far |
| `history[]` | Value at each month end, written at step 11 |

Net Worth and the bars use the sum across a bucket's holdings. The tokens in §10.1 read
one holding, found by `opened_by`. A commitment that pays into a holding carries the same
`opened_by`, which is how `modifies_commitment` (§10) finds the commitment to redirect or
cancel.

**Costs.** `living_costs` is what the player spends on ordinary life each month before any
option. It has three tiers:

| Tier | Meaning | Start |
|---|---|---|
| `minimum_living` | Essentials: food, transport, utilities. What a player cuts down to in a crisis | `MINIMUM_LIVING_START` |
| `normal_living` | A normal month. Essentials plus the ordinary life most people call normal | `NORMAL_LIVING_START` |
| `living_costs` | What the player actually spends | `LIVING_COSTS_START` |

All three rise every month by the same inflation index, built by repeated multiplication:

```
inflation_index(1)   = 1
inflation_index(m+1) = inflation_index(m) × (1 + INFLATION_MONTHLY_RATE)

living_costs(m)   = LIVING_COSTS_START   × inflation_index(m)
normal_living(m)  = NORMAL_LIVING_START  × inflation_index(m)
minimum_living(m) = MINIMUM_LIVING_START × inflation_index(m)
```

**Why a stored monthly rate.** D13 tells the player inflation was about 6% this year, a
year-on-year price change, so the game must really run at 6% a year. Three ways were tried:

| Formula | Problem |
|---|---|
| `(1 + 6%) ^ ((m - 1) / 12)`, until v12 | A fractional power rounds differently in the last bit on different JavaScript engines. Chrome and Node gave different runs, which breaks ENGINE.md rule 3 |
| `× (1 + 6% / 12)` each month, briefly in v12 | Deterministic, but compounds to 6.17% a year, not the 6% the copy states |
| `× (1 + INFLATION_MONTHLY_RATE)` each month, now | `INFLATION_MONTHLY_RATE` is 1.06 ^ (1/12) - 1, worked out once and stored as 0.00486755. Multiplied 12 times it gives 6.00% a year, and the engine never computes a fractional power |

Deposit rates in §7 (savings, FD, RD) still convert as `annual / 12`. Banks quote those as
nominal annual rates, so that is the correct conversion for them.

`minimum_living` feeds Safety (§4). `living_costs - normal_living`, spending above a normal
month, feeds Life (§6). Rent is not a living cost. It comes from D02 as a commitment.

**Where the starting values come from.** They were derived from the copy for one
reference path and accepted in v12:

| Copy | Figure | Reads as |
|---|---|---|
| D01 situation | "The bank says 41,300" | `SALARY_NET_START`, a stated term |
| D28 situation, month 22 | 34,000, now `{monthly_costs}` | `living_costs(22)` + rent |
| D28-A immediate, month 22 | "Costs down to 22,000" | `minimum_living(22)` + rent |
| D04-A and D04-B immediate, month 2 | "Auto-transfer 6,000… You adjust within a week" and "Auto-transfer 12,000… Two of the next four months will be tight" | `normal_living(2)` |

Monthly costs include rent, and rent depends on the player's path. The copy is read for a
player in the D02-B shared flat, whose rent is still 9,000 at month 22. That is the
reference path.

```
inflation_index(22)      = 1.00486755 multiplied 21 times = 1.10735

living_costs(22)         = 34,000 - 9,000             = 25,000
LIVING_COSTS_START       = 25,000 / 1.10735           = 22,576  -> 22,600
check                      22,600 × 1.10735 + 9,000   = 34,026  -> 34,000

minimum_living(22)       = 22,000 - 9,000             = 13,000
MINIMUM_LIVING_START     = 13,000 / 1.10735           = 11,740  -> 11,700
check                      11,700 × 1.10735 + 9,000   = 21,956  -> 22,000

normal_living(2)         = 41,300 - 9,000 - 12,000    = 20,300
NORMAL_LIVING_START      = 20,300 / 1.00487           = 20,202  -> 20,200
```

**How `normal_living` is read from D04.** A salary-day transfer is money the player never
sees, so they live on what is left. On the reference path at month 2 that is
41,300 - 9,000 rent - the transfer. After a 6,000 transfer, 26,300 is left, more than the
22,710 the player actually spends, so they "adjust within a week". After a 12,000 transfer,
20,300 is left, less than actual spending, so they must cut. The copy says the months are
tight half the time, which puts a normal month at the line itself: 20,300. This is a reading
of words, not a quoted figure, so it is not in the stated terms check. See §14.

Starting values are rounded to the nearest 100. The check rounds back to the nearest
1,000, as the copy does. `scripts/check_stated_terms.py` checks D01 and D28-A. D28's figure
became `{monthly_costs}` in v12, because a figure that depends on the player's path is an
outcome, not a stated term. Its Phase 0 sample is the reference path's 34,000.

Two cross-checks agree with the copy. The cut these values imply at month 22 is
34,026 - 21,956 = 12,070, against D28-A's `money_monthly` of +12,000. At month 1, in-hand
less living costs less rent leaves 700 on the D02-A studio, 9,700 on the D02-B shared
flat and 12,700 on the D02-C room, so every D02 option is solvent. D02-A's "Rent is 44% of
your take home" is 18,000 / 41,300 = 43.6%.

**Commitments.** `commitments[]` holds every recurring monthly amount that an option
creates, and nothing else. One entry is created for each non-zero `money_monthly`,
`money_monthly_2` and `def_money_monthly` on a chosen option or a landed callback. Money
family lends at step 5 of the §9 cascade is a debt, not a commitment.

| Field | Meaning |
|---|---|
| `amount` | Signed rupees a month, as in the sheet |
| `months_remaining` | From `commitment_months` or `def_commitment_months`. 0 means permanent |
| `destination` | From `monthly_destination`, `monthly_destination_2` or `def_monthly_destination` |
| `opened_by` | The option_id that created it |
| `kind` | From `commitment_kind`, or `commitment_kind_2` for `money_monthly_2` (§10 rule 18). Never inferred |

The kind says which pool an amount belongs to. The sign says which way it moves the pool.

| Kind | Meaning | Chapter 1 examples |
|---|---|---|
| `cost` | A recurring cost, or a change to one | Rent (D02), rent changes (D24-A, D24-C, and D24-B's -5,000 cut as +5,000), EMIs (D11-C, D22-A), premiums (D09-A, D21-A, D21-B), family support (D23), lunches (D06), D28-A's +12,000 cut |
| `saving` | Money moved into a balance every month. Always negative | Index investment (D16-A), RD (D16-B), EPF increase (D01-C), endowment (D05-A), auto-transfer (D04), the locked product (D18-A) |
| `income` | Income, or a change to it | Tax declaration (D01-A), raises (D13-B, D26), parents (D28-D), D29-A's lower offer as -2,900, D29-B, freelance (D29-C), the D30 payouts and their deferred stop |

Not in `commitments[]`, and so never added to it in any formula:

| Item | Where it lives |
|---|---|
| Base salary | `salary_net` |
| Everyday spending | `living_costs`, `minimum_living` |
| Tax and statutory retirement contributions | Step 2 |
| Interest-bearing balances: revolving card, loans | `debts[]`, paid each month through `debt_minimums` (§8) |

An EMI purchase is a debt, not a commitment (§10 rule 24), so an EMI is never counted twice.

**Monthly flows.**

```
income_net               = salary_net + sum(c.amount for income commitments)
leak                     = §2.1
discretionary_this_month = (living_costs - normal_living) + leak × LEAK_DISCRETIONARY_SHARE
```

Monthly order of operations. Order matters, so fix it now:

```
1. Salary in. The layoff and a salary restart take effect first (§9)
2. Statutory deductions out (tax, retirement fund)
3. Fixed commitments out (rent, premiums, dependents), then debt payments: each debt's interest and payment, §8
4. Living costs out
5. Apply the player's decisions for this month
6. Apply any deferred callbacks landing this month
7. Apply returns to all balances
8. Resolve any shock: the payment cascade covers any month that ends with cash below zero (§9)
9. Leak unallocated cash (§2.1)
10. Recompute all four bars
11. Write the month to history
```

**Step 2.** `salary_net` is the in-hand figure, already after tax and the employee's
retirement contribution, so no cash leaves here. Step 2 credits
`RETIREMENT_CONTRIBUTION_MONTHLY` to `retirement_fund` in any month with a salary. It
stands for employee and employer contributions together. The constant is an UNVERIFIED
placeholder (§14).

**Step 7.** Every balance earns its rate, including cash:

| Balance | Rate |
|---|---|
| `cash` | `SAVINGS_ANNUAL_RATE` |
| `cash_at_home` | 0% |
| `fds[]` | `FD_ANNUAL_RATE`, per deposit. A deposit reaching its `maturity_month` moves to `cash` |
| `retirement_fund` | `RETIREMENT_ANNUAL_RATE`, UNVERIFIED placeholder. Accrues monthly, credited to the balance every 12th month |
| `endowment_balance` | `ENDOWMENT_EFFECTIVE_RETURN` |
| `tax_product_balance` | `TAX_PRODUCT_ANNUAL_RATE`, UNVERIFIED placeholder |
| `assets[]` | Depreciation by `asset_type`, §3 |
| Everything else | Its §7 rate |

Annual rates convert to monthly as `annual / 12` (§7).

**Fixed-term deposits.** Each deposit into `locked_short` is its own entry in `fds[]`,
tagged with the option that opened it. It matures at the month of that decision plus the
option's `term_months`. At step 7 of that month its value moves to `cash`. A deposit with no
`term_months` never matures, so it stays locked and is haircut by `FD_BREAK_PENALTY` in
§4 for as long as it exists.

### 2.1 Cash leak

Cash with no job leaks. At month end, a share of this month's unallocated cash goes on
discretionary spending.

```
cash_in     = salary_net + positive money_monthly + positive money_once + income_event
cash_out    = steps 2 to 4
            + every negative money_once and money_monthly this month,
              whatever its destination, including cash
unallocated = max(0, cash_in - cash_out)

leak        = unallocated × CASH_LEAK_RATE
cash       -= leak
discretionary_this_month += leak
```

Money moved out on salary day does not leak. Every negative `money_monthly` is a
salary-day move, so it comes off before the leak even when its destination is `cash`.

Without this, D04's auto-transfer options do nothing and the pay-yourself-first lesson
has no mechanic. With it, D04-C "Save whatever is left at month end" leaves the whole
surplus exposed, while D04-A and D04-B take their amount out first.

The leak works on this month's flow, not on the balance. Money saved in earlier months
does not leak, otherwise D07-A's emergency fund in a savings account would drain away.

The leak is a Net Worth mechanic: unallocated cash vanishes. None of it counts as
discretionary spending for Life in §6: `LEAK_DISCRETIONARY_SHARE` is 0. Money that dribbles
away unspent is not a life lived. Until v12 all of it counted, which propped up Life for a
player who did nothing. From v12 to step 7, 40% counted, which gave a maximum-saving player a
higher Life baseline than a random player, because a saver has a surplus to leak and a broke
player does not (§14).

Bonuses leak, deliberately. `income_event` is part of `cash_in`, so a bonus nobody
allocates loses 35% in the month it lands. An unallocated bonus disappearing is the
lesson of D14.

**Allocated money never leaks. Intended.** Money deliberately moved into any balance, a
deposit, gold, equity, the endowment, or a transfer into cash on salary day, is allocated,
and allocated money does not leak. So an option that moves money into a balance ends ahead
of leaving the same money unallocated, even before any return: in the step 7 calibration,
D15-A's 60,000 of gold ends 34,107 ahead of leaving it as cash in the bonus month, and
D16-A's 5,000 a month ends 15,217 ahead by month 24. That is the pay-yourself-first lesson,
not a flaw. Ruled at step 7.

---

## 3. Net Worth

```
net_worth = cash + cash_at_home + liquid_fund + sum(fds)
          + sum(equity) + sum(gold) + sum(small_cap)
          + retirement_fund + endowment_balance + tax_product_balance
          + sum(asset.current_value)
          - sum(debt.principal_outstanding)
```

Asset depreciation, straight line to a floor, by the option's `asset_type`. Applied at
step 7 every month:

```
months_held   = month - month_acquired
current_value = max(purchase_price × (1 - rate × months_held / 12), purchase_price × floor)
```

| `asset_type` | Annual rate | Floor, as a share of the price |
|---|---|---|
| `phone` | `PHONE_DEPRECIATION_ANNUAL` | `PHONE_VALUE_FLOOR` |
| `two_wheeler` | `TWO_WHEELER_DEPRECIATION_ANNUAL` | `TWO_WHEELER_VALUE_FLOOR` |
| `car` | `CAR_DEPRECIATION_ANNUAL` | `CAR_VALUE_FLOOR` |
| `deposit` | Does not depreciate | n/a |
| `other` | No constants yet. The engine refuses an `other` asset until they exist | n/a |

Property appreciates (§7) and arrives in Chapter 4. It is not an `asset_type` yet.

The retirement, endowment and tax product balances count toward Net Worth but not Safety.
They are wealth you cannot reach. That distinction is most of what the two bars are for.

---

## 4. Safety

Definition from your spec: how long you survive with zero income.

```
essential_burn = minimum_living
               + sum(-c.amount for cost commitments)
               + debt_minimums

reachable = cash
          + cash_at_home
          + liquid_fund
          + sum(fds) × (1 - FD_BREAK_PENALTY)
          + sum(equity) × EQUITY_CRISIS_HAIRCUT          (see note)
          + sum(small_cap) × SMALL_CAP_CRISIS_HAIRCUT
          + sum(gold) × GOLD_CRISIS_HAIRCUT
          - card_debt                                     (never below 0)

card_debt = sum(principal of card debts)

runway_months = reachable / essential_burn
```

**Card debt is netted against reachable money.** Ruled 30 September 2026. Money owed on a card
is not runway. Before, card debt entered Safety only as its 5% minimum in `essential_burn`, so a
player who kept their own cash and put their costs on the card read as safer the more they
borrowed: after D28-C, 76.0 at month 24 rising to 82.6 at month 30 with 1,76,523 on the card.
Netted, the same player reads 47.6 and then 33.2. Family money, a 0% loan repaid over 12 months,
is not netted. The runway figure beside Safety on Home reads the same netted runway.

Each rupee of burn is counted once. Rent, EMIs, premiums and family support are all cost
commitments (§2), so none of them appears again as its own term. A cost reduction is a
positive cost commitment, so D28-A's +12,000 lowers `essential_burn` directly and
lengthens runway through the layoff. The first draft added
rent separately and then added `sum(commitments)`, which counted rent twice. Saving
commitments are left out because a player with no income stops them. Income commitments
are left out because runway assumes no income.

The equity haircut is not a market prediction. It represents that selling equity in an
emergency usually means selling at a bad moment and paying tax on the way out. A player
with everything in equity is less safe than the raw number suggests, and that is the
point. Small caps take the deeper `SMALL_CAP_CRISIS_HAIRCUT` because they fall further in
the same crash (§7), so a forced sale loses more.

Score:

```
runway_component  = clamp(runway_months / SAFETY_TARGET_MONTHS, 0, 1) × SAFETY_RUNWAY_WEIGHT
health_component  = clamp(health_cover / (annual_income × SAFETY_HEALTH_COVER_MULTIPLE), 0, 1)
                    × SAFETY_HEALTH_WEIGHT
term_component    = dependents > 0
                    ? clamp(term_cover / (annual_income × SAFETY_TERM_COVER_MULTIPLE), 0, 1)
                      × SAFETY_TERM_WEIGHT
                    : SAFETY_TERM_WEIGHT

safety = runway_component + health_component + term_component     # 0 to 100
```

The three weights must sum to 100. `annual_income` is 12 × `salary_net` at the player's
most recent job, so a layoff does not divide by zero.

Term cover scores full marks when nobody depends on you, so the bar does not nag a
22 year old about insurance they do not need. The moment `dependents` goes above zero,
the component collapses and Safety drops without anything bad having happened. That
drop is the lesson.

**Danger.** Runway below `SAFETY_DANGER_MONTHS` is danger. Bar colour means change
everywhere in the product (teal rose, vermilion fell, slate did not move), but a Safety bar
in danger is vermilion whatever it did this month: it is a warning, the one state the
player should feel before reading anything. The engine answers it (`safetyInDanger`), so
the threshold is never a number in the UI. It changes no score.

---

## 5. Freedom

Definition from your spec: how much income is already committed.

```
committed = sum(-c.amount for cost commitments)
          + sum(-c.amount for saving commitments into locked_short, retirement, endowment or tax_product)
          + debt_minimums

income_for_ratio = income_net                                   while there is a salary
                 = income_net + salary_net_last_job             while there is none

committed_ratio = committed / income_for_ratio

freedom = clamp((FREEDOM_CEILING_RATIO - committed_ratio) / FREEDOM_CEILING_RATIO, 0, 1) × 100
```

At zero commitments Freedom is 100. At `FREEDOM_CEILING_RATIO` of net income committed it
is 0.

**With no salary, the ratio is against the last salary earned.** Ruled 27 September 2026,
option F1 (§14). Until then, no salary meant Freedom 0, so the layoff put 94% of players at 0
at month 24 and a cautious player fell from 87.9 to 0 without doing anything wrong. That made
the bar meaningless on the chapter report. `salary_net_last_job` is the salary at the layoff
with raises folded in, the same figure Safety uses for cover (§4). The bar keeps meaning how
much of the player's pay is spoken for, and it still moves on what they do while out of work:
a card balance raises the minimums, a paused deposit lowers what is committed. While there is
no salary, the line beside the bar says so: "64% of your last salary committed", not "64%
committed" (`formatCommitted` in `text/render.js`).

As in §4, each rupee is counted once. Rent, EMIs, premiums and family support are cost
commitments, so none is listed again. The first draft listed each of them and then added
`sum(commitments)` as well.

Savings split by destination. A saving into `locked_short`, `retirement`, `endowment` or
`tax_product` (RD, EPF, endowment, the D18-A product) is committed, because stopping it
costs a penalty or the policy. A saving into
`cash`, `cash_at_home`, `liquid`, `equity`, `small_cap` or `gold` can stop any month, as
D28-B does under rule 17, so it is not committed.

**On your open question.** You flagged in the v2 README that nothing in Chapter 1 buys
Freedom back above +1, and asked whether that is a statement or a gap. Your own data
confirms it: across 94 options, `freedom` ranges from -4 to +1 and sums to -33.

It is a gap, and this formula fixes it without you rewriting a single option. Freedom
recovers on its own through three mechanisms the ledger already tracks:

| Mechanism | Effect |
|---|---|
| An EMI reaches its final month | `committed` drops, Freedom jumps |
| Salary rises | Same commitments, smaller ratio |
| A commitment's `commitment_months` expires | Same as an EMI ending |

That last month of an EMI producing a visible jump is a genuinely good game moment, and
you get it for free. It also teaches the real thing: debt is temporary, and the relief
is real and arrives on a date you can predict.

---

## 6. Life

The only bar not derivable from money, so it needs a stock with a pull toward a
baseline.

```
baseline = LIFE_BASELINE_FLOOR
         + clamp(discretionary_ratio / DISCRETIONARY_TARGET, 0, 1) × LIFE_DISCRETIONARY_WEIGHT

discretionary_ratio = discretionary_this_month / reference_income   (0 when salary_net is 0)
reference_income    = SALARY_NET_START × normal_living / NORMAL_LIVING_START

discretionary_this_month = (living_costs - normal_living) × (1 - saved_share)
                         + leak × LEAK_DISCRETIONARY_SHARE
saved_share         = min(1, saving_this_month / (SAVING_FULL_SHARE × reference_income))
saving_this_month   = recurring saving paid this month
                    + each one-off into saving or investment / SAVING_ONE_OFF_SPREAD_MONTHS,
                      for SAVING_ONE_OFF_SPREAD_MONTHS from its decision's month

life_score += sum(life of options chosen this month)
            + sum(def_life of callbacks landing this month)
life_score += LIFE_DRIFT × (baseline - life_score)

life_score = clamp(life_score, 0, 100)
```

**The yardstick is fixed, not the player's income.** `reference_income` is the starting
in-hand salary inflated to this month, by the same index every cost uses (§2). Until step 7
the ratio divided by `income_net`, which caused two bugs. A raise lowered the baseline: the
same spending divided by more pay is a smaller ratio, so earning more made a life look worse.
And a laid-off player with a tiny income looked like a big spender: at month 24, 450 of 1,000
random players had no salary but an income between 1 and 5,000, such as D30-B's 300 a month,
and every one of them sat at the ceiling of 70. Measured against a fixed yardstick, spending
is what moves the baseline and pay is not. At month 1 the yardstick equals the starting
salary, so every month 1 figure is unchanged.

**No salary, floor.** A player with no salary sits at `LIFE_BASELINE_FLOOR`, whatever else
comes in. After the fix all 450 of those players sit at 40, with a median Life of 44.7 at
month 24, against 50.5 before. This also puts at the floor a laid-off player living on D28-D's
parents or D29-C's freelance work until salary restarts.

**What counts as discretionary.** `discretionary_this_month` (§2):

| Counts | Source |
|---|---|
| Spending above a normal month | `living_costs - normal_living` |
| Less what the player deliberately saved | Spending above normal shrinks by the share of the yardstick saved this month, and is gone at `SAVING_FULL_SHARE`, 30%. Ruled 27 September 2026, option L3-30 (§14) |
| A share of the cash that leaked | `leak × LEAK_DISCRETIONARY_SHARE`, §2.1. The share is 0 since step 7, so in practice nothing |

**What counts as deliberate saving.** Money the player chooses to put into saving or
investment. That is every saving commitment that pays this month, whatever its destination
(D01-C, D04-A, D04-B, D05-A, D16-A, D16-B, D21-C, D27-B, D27-C). It is also every option
one-off into cash, cash at home, the liquid fund, a deposit, equity, small caps, gold,
retirement, the endowment or the tax product (D07, D14-B, D14-D, D15, D18-A, D20-B, D30-A,
D30-B), spread evenly over `SAVING_ONE_OFF_SPREAD_MONTHS`. Investing a bonus is money not spent
on a life, the same as a monthly transfer, so it costs the same way. Not counted: the
retirement credit that comes with a salary, which is not a choice; `illiquid` money, which is a
rent deposit or a bought asset; and saving by not spending, such as D04-C's "save whatever is
left", which allocates nothing.

| Does not count | Why |
|---|---|
| Spending from options: `money_once` with class `spent`, and cost commitments | Its effect on Life is already in the option's `life` and `def_life` columns. Counting its rupees again would be the §0 double count. Confirmed by ruling at step 7, O0 (§14), and still true |
| A normal month | `normal_living`, which includes `minimum_living` and anything in `essential_burn` |

A salaried player who saves nothing has the same discretionary as everyone else, spending
above a normal month, and so the same baseline, 51.6. A player who saves 30% of the yardstick
or more sits at the floor, 40, and one who saves less sits in between. A player with no
salary sits at the floor.

**Why three tiers.** Until v12, discretionary was `living_costs - minimum_living`. That is
most of ordinary life, 10,900 a month or 26% of income at the start, against a
`DISCRETIONARY_TARGET` of 15%. Every salaried player sat at the baseline ceiling of 70 from
month 1, so saving cost no Life and "spend nothing, win" was not prevented. Measuring
above a normal month instead leaves 2,400 at the start, so what the player does with the
rest now moves the baseline.

**Why the leak no longer counts.** With the normal tier alone, the leak carried a
do-nothing player to the ceiling: 35% of unallocated cash is 6,545 a month without rent,
16% of income. From v12 only 40% of it counted. That produced the opposite problem, found in
step 7: a player who saves has a surplus, some of it leaks, and the leak counted as a life
lived, so the maximum-saving player's baseline at month 21 was 55.7 against the random
median's 51.7. Saving everything scored a better baseline than spending. The share is now 0.

Life baseline now, with the floor at 40, the middle at 55 and the ceiling at 70:

| Player | Discretionary, month 1 | Baseline, month 1 | Baseline, month 21 | Baseline, month 24 |
|---|---|---|---|---|
| Do-nothing, no rent at all | 2,400 | 51.6 | 51.6 | 40.0 |
| D02-B rent, no saving | 2,400 | 51.6 | 51.6 | 40.0 |
| Before step 7, do-nothing, no rent | 2,400 + 0.4 × 6,545 = 5,018 | 64.3 | 63.9 | 40.0 |
| Before step 7, D02-B rent, no saving | 2,400 + 0.4 × 3,395 = 3,758 | 58.2 | 57.8 | 40.0 |

A do-nothing player now sits at 51.6, just below the middle, and rent or a raise makes no
difference to it. Saving does, since 27 September 2026, above. Before the fixed yardstick it crept to 52.8 by month 21, because
inflation raised living costs above normal while income stood still. At month 24 the do-nothing player has had no salary since the layoff, so
income is 0 and the baseline is the floor.

**O0 was half right. Ruled 27 September 2026.** At step 7, O0 ruled that nothing a player
chooses moves the baseline, and that choices move Life only through the `life` and `def_life`
columns (§14). The half about spending stands: option spending still does not feed the
baseline, because its Life is already in its `life` column, and counting its rupees again would
count it twice. The half that left the baseline blind to every choice was incomplete. Saving
options carry almost no authored Life of their own: D04-A, D07-A, D07-C and D16-B are 0, D16-A
is +2. With the baseline blind as well, saving was free on every bar, and maximum saving cost
nothing but the few `life` values that happened to be negative. Saving now feeds the baseline.
Spending still does not.

The first draft also added `social_events_this_quarter` and subtracted
`overwork_penalty`. Nothing in the ledger or the sheet produced either, so both are gone.
See §14.

The intent is to stop "spend nothing, win" without punishing saving, by pulling toward a
mediocre middle: a life of pure accumulation is not a disaster, it is just thin. Since 27
September 2026 the baseline does this for deliberate saving. The maximum-saving player still
tops the league, because its lead is Net Worth and nothing in Chapter 1 costs it money: a
content gap for Chapter 2, not something the baseline can close (§14).

Choice effects use the existing `life` column directly. The -5 to +5 scale maps one to
one onto points. A `life = +3` option adds 3 and then decays back toward baseline over
following months, so a single good weekend fades. That decay is correct and you should
resist the urge to remove it.

---

## 7. The returns engine

Synthetic, for legal reasons and for design reasons. SEBI's January 2025 circular bars
educators from live or recent market data; a fully invented market sidesteps the
question entirely. It also lets you guarantee that the months 31 to 40 crash happens to
everybody, which a random walk would not.

**Structure: a scripted skeleton plus seeded noise.**

```
return(instrument, month) = drift(instrument, month)
                          + damping(instrument, month) × sigma_m × noise(seed, instrument, month)

damping(instrument, month) = NOISE_DAMPING   if month is inside a lesson window for that instrument
                           = 1               otherwise

noise(seed, instrument, month) = u1 + u2 + ... + u12 - 6
```

**The noise.** Each `u` is a uniform draw between 0 and 1, from a 32 bit integer hash of the
seed, the instrument, the month and the draw's number. The sum of twelve such draws minus 6
has mean 0 and variance 1, like a standard gaussian, but it can never go beyond plus or
minus 6, and its tails are lighter.

It is not a true gaussian on purpose. Every way of making a true gaussian needs `Math.log`,
`Math.exp` or `Math.cos`, and JavaScript does not guarantee those to the last bit across
browsers. The same seed would give a different market in two browsers, which breaks
ENGINE.md rule 3. The sum of uniform draws uses only addition, multiplication and integer
hashing, which are bit-identical everywhere. Determinism beats the tail (§14).

Broad equity and small caps take their drift from their scripts. Gold and the liquid fund
drift at their §12 rate divided by 12. Gold's noise moves partly with broad equity's:

```
noise(gold) = GOLD_EQUITY_CORRELATION × noise(equity) + sqrt(1 - GOLD_EQUITY_CORRELATION²) × gold's own noise
```

The two parts are independent with variance 1, so gold's noise keeps variance 1.

**Broad equity script.** `scripted_drift` is a 240 month array you author by hand. It
contains the regimes the curriculum needs. Monthly drift is the scripted return per
month before noise, and is placeholder until calibration (§13). This table, the small cap
script and the lesson windows below are generated into `data/market-script.json`, the named
exception to rule 1 recorded in §12:

| Months | Regime | Monthly drift | Why it exists |
|---|---|---|---|
| 1 to 10 | Mild positive | +0.9% | The first months of salary feel quietly fine |
| 11 to 12 | Short dip, about -6% over two months | -3.0% | D16-A's first investment starts red |
| 13 to 30 | Mild positive | +1.2% | First SIP feels quietly fine. +0.9% until 27 September 2026, ruled up with `EQUITY_ANNUAL_SIGMA` so D16-A ends Chapter 1 above money put in on at least 80% of seeds (§14) |
| 31 to 40 | Sharp fall, about -28% peak to trough | -3.2% | Decision 10, the one that matters |
| 41 to 60 | Slow recovery | +1.7% | Rewards whoever held on |
| 61 to 120 | Long positive run | +1.1% | Compounding becomes visible |
| 121 to 132 | Second correction, milder | -1.2% | Tests whether the first lesson stuck |
| 133 to 240 | Mixed, mild upward drift | +0.8% | Realistic long tail |

The months 11 to 12 dip is new in v9. The first draft had months 1 to 30 all mildly
positive, which meant D16-A's early red months had no scripted direction for a lesson
window to protect.

The seeded noise means two players see the same crash in the same month but different
month-to-month texture, and a replay of the same seed is reproducible. Reproducibility
matters for debugging and for Phase 2 decision replay.

| Instrument | Annual drift | Annual sigma | Notes |
|---|---|---|---|
| Broad equity | From the broad equity script, about 11% long run | `EQUITY_ANNUAL_SIGMA` | The main teaching instrument |
| Small cap equity | From its own script, about 13% long run | `SMALL_CAP_ANNUAL_SIGMA` | Higher drift, much rougher ride. D20 |
| Debt fund, FD, RD | `FD_ANNUAL_RATE` | `DEBT_FUND_ANNUAL_SIGMA` | Predictable by design. Stated to the player in D16-B |
| Savings account | `SAVINGS_ANNUAL_RATE` | None | Stated to the player in D07-A |
| Cash at home | Earns nothing | None | D07-D. Inflation erodes it |
| Endowment | `ENDOWMENT_EFFECTIVE_RETURN` | None | D05-A and the D21-C return of premium plan. Stated to the player in D05-A's callback |
| Tax product | `TAX_PRODUCT_ANNUAL_RATE`, UNVERIFIED placeholder | None | D18-A. No figure in the copy |
| Liquid fund | `LIQUID_FUND_ANNUAL_RATE` | `LIQUID_FUND_ANNUAL_SIGMA` | Emergency money |
| Gold | `GOLD_ANNUAL_RATE` | `GOLD_ANNUAL_SIGMA` | Weakly correlated with equity on purpose |
| Retirement fund | `RETIREMENT_ANNUAL_RATE`, UNVERIFIED placeholder, see §14 | None | Accrues monthly, credited annually |
| Property | `PROPERTY_ANNUAL_RATE` | `PROPERTY_ANNUAL_SIGMA` | Chapter 4 onward |

Every rate and sigma lives in §12. This table only says which constant each instrument
uses. The long-run figures for the two equity scripts describe what the scripts are meant
to produce. They are not inputs.

Monthly conversion: `monthly_drift = annual / 12`, `sigma_m = annual_sigma / sqrt(12)`.

**Small cap script.** Small caps have their own `scripted_drift_small_cap` array, so D20
has something real to chase. Its first 40 months are set by D20, and its month 22
callback needs a fall that the broad equity regime does not have:

| Months | Regime | Monthly drift | Why it exists |
|---|---|---|---|
| 1 to 14 | Strong positive, about +40% over the 12 months to month 14 | +2.8% | The colleague's "40% last year" in D20 is true. Deliberate, §14 |
| 15 to 16 | Still rising | +2.8% | D20-A's first month is up, so moving the money feels smart |
| 17 to 22 | Sharp fall, about -28% peak to trough, bottoming at month 22 | -5.4% | Money moved in at month 14 is about -22% at the D20 callback. The bottom is the layoff month. Deliberate, §14 |
| 23 to 30 | Partial recovery | +1.5% | |
| 31 to 40 | Falls further than broad equity in the same crash, about -37% | -4.5% | Same event, bigger drop |
| 41 to 240 | Not yet authored | n/a | Write it with the full 240 month broad equity script |

The small cap numbers are not calibrated. See §14.

**Lesson windows.** `LESSON_WINDOWS` names the month ranges where a scripted direction
carries a lesson. Inside a window, noise is multiplied by `NOISE_DAMPING` (§12), so the
script wins. Outside, noise runs at full strength.

| Window | Instrument | Months | Scripted direction | Lesson |
|---|---|---|---|---|
| `D16A_EARLY_RED` | Broad equity | 11 to 12 | Down | D16-A's first investment starts red |
| `D20_SMALL_CAP` | Small cap equity | 14 to 22 | Down | Money moved into small caps at D20 is down by its month 22 callback |
| `CRASH_31_40` | Broad equity | 31 to 40 | Down | The crash |
| `CRASH_31_40_SMALL_CAP` | Small cap equity | 31 to 40 | Down | Same crash, bigger drop |

A window's direction is its net return, the product of (1 + return) across every month
in the range. The engine test `engine/test/market.test.js` runs 200 seeds through the
engine's own market and fails if any window ends in the wrong direction on any seed.

Damping shrinks noise. It does not clamp the result. A rare seed can still flip a window.
That is deliberate, see §14.

Inflation runs at `INFLATION_MONTHLY_RATE`, 6% a year (§2), and applies to living costs, rent at renewal, and the
Life baseline calculation. Without it, a fixed salary feels fine for twenty years and
the whole point of the endgame is lost.

---

## 8. Debt

```
interest_this_month = principal × monthly_rate
principal -= (emi - interest_this_month)
```

| Debt type | Monthly rate | Notes |
|---|---|---|
| Credit card revolving | `CARD_MONTHLY_RATE` | The most expensive thing in the game. Deliberately |
| Personal loan | `PERSONAL_LOAN_MONTHLY_RATE` | |
| Two wheeler, consumer | `TWO_WHEELER_LOAN_MONTHLY_RATE` | |
| Home loan | `HOME_LOAN_MONTHLY_RATE` | Chapter 4 |
| EMI purchase | Worked out from the copy, below | D11-C, D22-A |

Debts are paid at step 3 of the month (§2), from the month after they open. A loan's last
payment clears whatever is left, so no rounding residue survives its term.

`debt_minimums` (§4, §5) is the sum over `debts[]` of each month's minimum: balance ×
`CARD_MIN_PAYMENT_PCT` for a revolving card, the scheduled payment for a loan or EMI.

**A card on minimum payments.** Each month a card keeps 98.5% of its balance: 3.5% interest
in, 5% minimum out. It shrinks forever without reaching zero. Once the opening balance is
below `CARD_MINIMUM_FLOOR`, that month's payment clears the card entirely. A 40,000 balance
on minimum payments takes 291 months to get there.

**An EMI purchase opens a debt, not a monthly cost** (§10 rule 24). The asset is acquired at
its cash price, and a debt opens for the same amount, so buying on EMI does not raise Net
Worth. The monthly payment and the number of months are the ones the copy states, which are
Category A terms (rule 16). The monthly rate is whatever rate makes those payments clear the
cash price in those months, found by halving an interval, which uses only arithmetic.

**No-cost EMI is not free.** The real cost is the cash discount the player gives up by not
paying up front. The copy quotes both prices, and the gap between them is
`NO_COST_EMI_MARKUP` of the EMI total:

```
hidden cost = emi_total - cash_price
markup      = 1 - cash_price / emi_total      must round to NO_COST_EMI_MARKUP
```

| Option | Cash price | EMI | EMI total | Hidden cost | Markup |
|---|---|---|---|---|---|
| D11-C, phone | 73,000 | 12 × 6,600 | 79,200 | 6,200 | 7.8% |
| D22-A, two wheeler | 95,000 | 12 × 8,600 | 1,03,200 | 8,200 | 7.95% |

The stated terms check holds each EMI purchase's copy to the constant, to a whole percent.
Until v17 D11-C's copy priced the phone at 79,000, a hidden cost of only 200, which made a
no-cost EMI look almost free.

A missed payment adds a penalty and raises `credit_score_damage`, which matters in
Chapter 3.

---

## 9. Shock resolution

Shocks are scripted by month, not random. Everyone gets the layoff. What varies is what
it costs you.

**The layoff.** The sheet names the shock: the decision whose `shock` is `layoff`, D28 at
month 22. At step 1 of that month:

| What happens | Rule |
|---|---|
| Salary stops | `salary_net` becomes 0 |
| Raises stop with the job | Every income commitment marked `is_salary_change` folds into the salary the player had, and ends. `salary_net_last_job` becomes salary plus those changes |
| Severance is paid | `LAYOFF_SEVERANCE_MONTHS` × `salary_net_last_job`, into cash, as that month's income. It can leak (§2.1) |
| Retirement contributions stop | Step 2 only credits a month with a salary |

Salary stays at 0 until a D29 option restarts it, `restarts_salary_after_months` after the
decision: D29-A at month 24, D29-B and D29-C at month 27. It restarts at `salary_net_last_job`,
and the option's own salary change applies on top, such as D29-A's -2,900 for the offer
"below what you made". Salary is 0 in month 22 and 23 and severance covers month 22, which is
how D28's "One month severance" and D29's "Two months without income" are both true.

**When the cascade runs.** At step 8 of any month that ends with cash below zero, whatever
the cause: the layoff, or ordinary overspending. The shortfall is raised in five steps, and
the cascade stops the moment it is covered. Each step down is worse, and the player feels
which step they landed on:

| Step | Source | How | Consequence |
|---|---|---|---|
| 1 | `cash_at_home`, `liquid_fund` | As much as needed | Safety drops. Nothing else |
| 2 | Fixed deposits | Oldest first. A deposit breaks whole, less `FD_BREAK_PENALTY`. Any excess stays in cash | Safety drops harder |
| 3 | `gold`, then `equity`, then `small_cap` | Oldest holding first, only as much as needed, at that month's value. A partly sold holding keeps its remaining value, with `contributed` scaled down to match | Loss crystallised at whatever the scripted market is doing that month |
| 4 | Credit card | Only for a card holder (`grants_card`: D17-A, D17-C, D28-C), up to `CARD_LIMIT` in total | Freedom collapses, `CARD_MONTHLY_RATE` begins the month after |
| 5 | Family | Covers whatever is left | A debt at 0% interest, repaid in equal payments over `FAMILY_REPAYMENT_MONTHS` from the month after. It counts against Net Worth like any debt. Life falls by `FAMILY_LIFE_PENALTY` once per episode |

The engine reports the deepest step reached each month, so the UI can show it. A month that
does not end negative needs no cascade at all.

**Family is a debt.** Money from family is repaid, so it lowers Net Worth exactly as the
same amount on a card would. Only the interest differs: 0% against `CARD_MONTHLY_RATE`.
Until v19 the repayment was a cost commitment, which §3 does not count, so a family bailout
left Net Worth untouched and looked better than the card. That inverted the lesson.

**One Life penalty per episode.** An episode is a run of consecutive months in which the
cascade reaches step 5. `FAMILY_LIFE_PENALTY` lands in the first month of the run only.
Asking your parents five months running is one humiliation, not five. A month that does not
reach step 5 ends the episode, and the next month that does starts a new one.

**Card debt from decisions.** Two options put money on the card directly:

| Option | Column | What happens |
|---|---|---|
| D17-C | `card_balance` 18,000 | Opens on the card at the decision, month 11, for things already bought. The minimum is paid from month 12. At the month 17 callback the balance is 18,000 × 0.985 six times, about 16,440, so "the balance has barely moved" is literally true |
| D28-C | `card_takes_gap` Y | At step 8 of every month the player is unemployed, before the cascade, the month's gap goes on the card: money out less money in, up to `CARD_LIMIT`. The player's savings, including cash in the bank, are left alone. It stops when salary restarts. D28-C also gives a card (`grants_card`) |

A D28-C player with 3,00,000 saved who waits for D29-B puts about 1,48,000 on the card over
months 23 to 26 while the savings sit untouched. That is the lesson of the option.

**D29-A is survivable.** The offer must cover a shared-flat player's costs at month 24, with
a small surplus, even after the layoff has put them on the card:

| Line | Month 24 |
|---|---|
| Living costs, 22,600 inflated 23 months | 25,270 |
| D02-B rent | 9,000 |
| Costs | 34,270 |
| Card minimum, 5% of the 24,389 an unprepared player borrowed in month 23 | 1,219 |
| Needed | 35,489 |
| D29-A salary: 41,300 - 2,900 | 38,400 |
| Surplus before the card minimum | 4,130 |
| Surplus after the card minimum | 2,911 |

The offer is quoted as 5.8 LPA. At D01's ratio of 52,000 on the letter to 41,300 in hand,
38,400 in hand is 48,349 a month, 5.80 lakh a year. 5.8 LPA is below the 6.24 LPA of the
starting job, so "below what you made" stays true on the reference path. An unprepared
shared-flat player on D29-A borrows once, in month 23, and never again to month 60: the card
falls from 24,389 to about 13,900. Until v19 the offer was -10,000 (31,300 in hand, quoted as
7 LPA), 2,970 below costs before any card payment, so the card grew every month with no exit.

**Step 3 sale order.** Gold first, then equity, then small caps. Within a bucket, the
oldest holding goes first. The order follows the §4 crisis haircuts, from the asset that
loses least in a forced sale to the one that loses most, so a player in trouble sells
what hurts least first, and Safety's estimate of reachable money is raised in the same
order the cascade raises it. Gold also moves weakly with equity (§7), so in an equity
crash it is the asset most likely to still be near its value. A holding sold to zero
closes, and tokens that read it fall back (§10.1).

Selling small caps at month 22 is selling at the bottom of the small cap fall (§7).
Because small caps go last, a player reaches them only when gold and equity do not cover
the gap. A D20-A player gets there fast: from month 14 every monthly investment went into
small caps, so their equity holding is only months 10 to 13 of D16-A. That stack is
deliberate, §14. Selling gold first softens it for a D20-A player who holds gold, and that
softening is also deliberate, §14.

Step 3 is the cruel one and it should be. A shock landing during the month 31 to 40
drawdown forces a sale at the bottom. That is exactly how it happens to people, and
having it happen once is worth more than any explanation.

Shock schedule, illustrative:

| Chapter | Scripted shocks |
|---|---|
| 1 | Layoff at month 22 |
| 2 | Medical event, rent shock |
| 3 | Family medical, job instability |
| 4 | Market drawdown coinciding with a large commitment |
| 5 | Parent health, child cost step-up |
| 6 | One late-career income shock |

---

## 10. Sheet columns the engine reads

Applied in `chapter1_decisions_v10.xlsx`, all 94 options. This section defines every
engine-facing column. If the sheet and this section disagree, the sheet is wrong.

The sheet's text stays as written, except where it carries a figure the engine now
decides. Those figures become tokens under rule 16. D14-B's deferred text was rewritten
in v7 for the same reason, before tokens existed.

### Columns

Options sheet:

| Column | Values | Meaning |
|---|---|---|
| `money_once` | Rupees, signed | One time movement at the moment of the decision |
| `liquidity_class` | Vocabulary below | Where `money_once` goes. Blank when `money_once` is 0 |
| `money_once_2` | Rupees, signed | A second one time movement, for options that split money |
| `liquidity_class_2` | Vocabulary below | Where `money_once_2` goes. Blank when `money_once_2` is empty |
| `money_monthly` | Rupees, signed | Recurring movement from the month after the decision, or the same month when `starts_same_month` is Y (rule 21) |
| `monthly_destination` | Vocabulary below | Where `money_monthly` goes. Blank when `money_monthly` is 0, except on an option that redirects a commitment (rule 17) |
| `money_monthly_2` | Rupees, signed | A second recurring movement, for options that split money |
| `monthly_destination_2` | Vocabulary below | Where `money_monthly_2` goes. Blank when `money_monthly_2` is empty |
| `commitment_months` | Integer, 0 means permanent | How long `money_monthly` and `money_monthly_2` run. Blank when `money_monthly` is 0, except on an option that modifies a commitment, where it says how long the change lasts (rule 17) |
| `def_liquidity_class` | Vocabulary below | Which bucket `def_money_once` hits. Blank when `def_money_once` is 0 |
| `def_monthly_destination` | Vocabulary below | Where `def_money_monthly` goes. Blank when `def_money_monthly` is 0 |
| `def_commitment_months` | Integer, 0 means permanent | How long `def_money_monthly` runs. Blank when `def_money_monthly` is 0 |
| `health_cover_delta` | Rupees of cover added | Feeds `health_cover` in §4 |
| `term_cover_delta` | Rupees of cover added | Feeds `term_cover` in §4 |
| `asset_acquired_value` | Rupees | A depreciating asset (§3) created by the decision |
| `modifies_commitment` | One or more option_ids, comma-separated | Earlier options whose monthly commitments this option redirects or cancels (rule 17). The option is offered only while one of them runs (rule 29) |
| `requires` | `index`, `no_index`, or blank | A precondition the option needs to be offered (rule 29). Blank for 93 of 95 options. Since v32 |
| `commitment_kind` | `cost`, `saving` or `income` | Which pool `money_monthly` and `def_money_monthly` belong to (rule 18). Blank when both are 0 |
| `commitment_kind_2` | `cost`, `saving` or `income` | Which pool `money_monthly_2` belongs to (rule 18). Blank when it is empty |
| `asset_type` | `phone`, `two_wheeler`, `car`, `deposit`, `other` | What an asset is, which sets its depreciation (rule 22). Set exactly when an asset is bought or money goes to `illiquid` |
| `term_months` | Integer | Term of a fixed-term deposit into `locked_short` (rule 23) |
| `starts_same_month` | Y or blank | Y when a monthly cost starts in the decision's own month: rent (rule 21) |
| `is_emi_purchase` | Y or blank | Y when an asset is bought on EMI. The asset opens a matching debt instead of a monthly cost (rule 24) |
| `restarts_salary_after_months` | Integer | After a layoff, the months until this option restarts salary. D29 only (rule 25) |
| `is_salary_change` | Y or blank | Y when the option's monthly income is a change to salary, which stops with the job (rule 25) |
| `grants_card` | Y or blank | Y when the option gives the player a credit card for step 4 of the cascade (rule 26) |
| `card_balance` | Rupees | A balance put on the card at the decision, for things already bought. It opens no asset. D17-C (§9) |
| `card_takes_gap` | Y or blank | Y when, while unemployed, each month's gap goes on the card before the cascade. D28-C (§9) |

Column order in the sheet follows the order they were added, not this table.

Decisions sheet:

| Column | Values | Meaning |
|---|---|---|
| `shock` | `layoff` or blank | The scripted shock that lands in this decision's month (§9). D28 |
| `income_event` | Rupees | One time income that arrives with the decision whatever the player picks. Lands in `cash` before the chosen option applies. D14 is 1,20,000 |

`insurance_delta` from the first draft is gone, split into the two cover columns
because §4 scores health and term cover separately.

### Liquidity vocabulary

Used by `liquidity_class`, `liquidity_class_2`, `monthly_destination`,
`monthly_destination_2`, `def_liquidity_class` and `def_monthly_destination`.

| Class | Ledger field (§2) | Reachable in §4 | Chapter 1 examples |
|---|---|---|---|
| `cash` | `cash` | In full | Savings account, income |
| `cash_at_home` | `cash_at_home` | In full. Zero return, counts in Net Worth | Cash kept at home, D07-D |
| `liquid` | `liquid_fund` | In full | Liquid fund |
| `locked_short` | `fds[]` | × (1 - `FD_BREAK_PENALTY`) | One year FD, 24 month RD |
| `retirement` | `retirement_fund` | Not reachable. Counts in Net Worth only | EPF, D01-C |
| `endowment` | `endowment_balance` | Not reachable. Counts in Net Worth only | Endowment policy D05-A, return of premium plan D21-C |
| `tax_product` | `tax_product_balance` | Not reachable. Counts in Net Worth only | The five year tax product, D18-A |
| `equity` | `equity[]` | × `EQUITY_CRISIS_HAIRCUT` | Index investment, the D30 scheme |
| `small_cap` | `small_cap[]` | × `SMALL_CAP_CRISIS_HAIRCUT` | Small companies, D20 |
| `gold` | `gold[]` | × `GOLD_CRISIS_HAIRCUT` | Gold bought for the family |
| `illiquid` | `assets[]` | Not reachable | Phone, scooter, rent deposit |
| `spent` | None. Leaves the ledger | n/a | Gifts, trips, repairs, rent, premiums, EMIs |

`invested` from v5 is gone, replaced by `equity` and `gold` because §4 haircuts them
differently. `small_cap` was added in v9 for the same reason. `locked_long` was split in v13
into `retirement`, `endowment` and `tax_product`, because pooling them put the endowment and
tax product on the UNVERIFIED retirement rate.

### Rules

1. **A negative `money_once` moves cash into whatever `liquidity_class` says, so net
   worth is flat at that moment unless the class is `spent`.**
2. `money_once_2` follows rule 1 with `liquidity_class_2`, at the same moment. An option
   that splits money records each part once: D15-B is -20,000 `gold` plus -40,000 `equity`.
3. A negative `money_monthly` does the same every month into `monthly_destination`, for
   `commitment_months` months, starting as rule 21 says. `money_monthly_2` goes to
   `monthly_destination_2` for the same number of months: D27-C.
4. A positive amount is money arriving in cash, and its class is `cash`. Costs going
   down count as positive: D24-B and D28-A.
5. Income going down is a negative `money_monthly` with destination `spent`: D29-A.
6. A negative amount with class `cash` leaves the balance unchanged, but the money counts
   as allocated and does not leak (§2.1): D04-A, D04-B, D07-A.
7. **A negative `def_money_once` with a `def_liquidity_class` removes from that bucket
   rather than from cash.** D30-A's -50,000 is a write-off of the scheme balance, not a
   second 50,000 out of cash. D07-D's -4,000 comes out of the cash kept at home.
8. **A positive `def_money_once` never goes into `equity`, `gold` or `small_cap`.** §7 already grows
   those buckets every month, so deferred growth would count twice. The deferred text
   still fires and narrates what §7 did. The sheet refuses to save if this rule is broken.
   D14-B, D15-A and D15-B were set to 0 in v7.
9. `def_money_monthly` goes to `def_monthly_destination` and follows rules 3 to 5:
   D18-A's -4,000 pays into `tax_product`, and D29-B's +25,000 is positive, so it lands in
   `cash`.
10. `asset_acquired_value` is the only thing that creates an asset. On a cash purchase,
    `money_once` with class `illiquid` is the payment for that same asset, not a second
    one: D11-B, D22-B. On an EMI purchase there is no `money_once`, and the EMI runs
    through `money_monthly`: D11-C, D22-A. The value is the cash price in the text: 73,000
    for D11-C, 95,000 for D22-A. §8 handles the interest.
11. **Content never carries arithmetic that a config constant controls.** A value in the
    sheet is a price, an amount or a term from the text, never a figure derived from §12.
    Text names a figure the engine decides only through a token (rule 16).
12. `illiquid` money with no `asset_acquired_value` is a deposit: an asset with
    `asset_type` `deposit` that does not depreciate. D02's rent deposits.
13. `commitment_months`: EMIs, fixed-term products and anything with a stated end get
    their term. Rent, lifestyle, salary changes and open-ended habits stay 0.
14. `def_commitment_months` follows rule 13. A deferred monthly effect that cancels an
    earlier permanent one is itself permanent, 0: D30-A and D30-B.
15. Cover columns hold cover, never premium. The premium sits in `money_monthly`.
16. **Every figure in the copy is either a stated term or an outcome.**
    - **Category A, stated terms.** A figure quoted to the player as a term of the
      decision, at the time they make it. The copy is the source of truth, and §12 and
      the sheet must match it. Leave the text alone. `scripts/check_stated_terms.py`
      fails when a constant or column disagrees with the copy.
    - **Category B, outcomes.** A figure the engine computes. The copy carries a token
      from §10.1 instead of the figure, and the engine fills it at runtime.

    Category A terms the check covers:

    | Option | Stated term | Must match |
    |---|---|---|
    | D16-B | "about 6.5% a year before tax" | `FD_ANNUAL_RATE` |
    | D17-C | "Interest runs near 3.5% a month" | `CARD_MONTHLY_RATE` |
    | D17-C | "The minimum is only 5%" | `CARD_MIN_PAYMENT_PCT` |
    | D17 concept card | "costs about 3.5% a month on everything left over" | `CARD_MONTHLY_RATE` |
    | D07-A | "Earns about 3%" | `SAVINGS_ANNUAL_RATE` |
    | D05-A | "Roughly 4.5% a year" | `ENDOWMENT_EFFECTIVE_RETURN` |
    | D13 situation | "Inflation this year was about 6%" | `INFLATION_MONTHLY_RATE` multiplied 12 times, to two decimal places |
    | D13-A | "About 2% after inflation" | D13's quoted 8% appraisal after 12 months of `INFLATION_MONTHLY_RATE`, rounded to a whole percent |
    | D11 situation, D22 situation | The cash price: "73,000", "95,000" | `asset_acquired_value` of D11-C and D22-A |
    | D11 situation, D22 situation | Cash price against the EMI total | `NO_COST_EMI_MARKUP`, to a whole percent (§8) |
    | D11-C, D22-A | "6,600", "8,600" and "twelve months" | `money_monthly` and `commitment_months` in the sheet |
    | D01 situation | "The bank says 41,300" | `SALARY_NET_START` |
    | D09 situation | "Your company covers you for 3 lakhs" | `HEALTH_COVER_START` |
    | D28-A | "Costs down to 22,000" | `MINIMUM_LIVING_START` at month 22, plus the reference rent (§2) |
    | D07-B | "One year fixed deposit" | `term_months` in the sheet, read as 12 months |
    | D07-B | "Locked for twelve months" | `term_months` in the sheet |
    | D28 situation | "One month severance" | `LAYOFF_SEVERANCE_MONTHS` |
    | D17 situation | "2 lakh limit" | `CARD_LIMIT` |
    | D29 situation, D29-A label | "5.8 LPA" | D29-A's `money_monthly` on `SALARY_NET_START`, as CTC at D01's ratio |
    | D29-B deferred | "10 LPA" | D29-B's `def_money_monthly` on `SALARY_NET_START`, as CTC at D01's ratio |
    | D02-A, D02-B, D02-C labels | "deposit 20,000", "deposit 12,000", "deposit 8,000" | Each option's `money_once`. Stated since v27: before it the copy never mentioned the deposits, which broke this rule |
    | D31 to D40, chapter 2's opening (v35, v36) | Every figure after "States:" in their placeholder copy, and D40's from v36: 62 terms, from "40,000 once" to "1 crore for 1,000 a month" | The option's own column, or the named option's for a situation: `money_once`, `money_once_2`, `money_monthly`, `money_monthly_2`, `def_money_monthly`, `asset_acquired_value`, `income_event`, `term_cover_delta` in crore or lakh, and `commitment_months` or `term_months` for a term. D35-C's "84,000 in all" is its `money_monthly` over its `commitment_months`, a new check kind, `monthly_total`. The copy is placeholder text until the product owner writes it; the checker's patterns then move to its wording, as chapter 1's did |

    Category B text rewritten with tokens in v8: D01-C, D04-A, D04-B, D04-C, D06-C,
    D15-A, D16-A, D20-A, D20-B. Only the figure changed, except D16-A's immediate text,
    which now reports one month instead of two. D13-A was tokenised in v8 and returned to
    Category A in v9, because both of its inputs are quoted to the player. D20's situation
    was tokenised in v10. D28's situation and D03-B's deferred text were tokenised in v12,
    because both figures depend on the player's path.
17. **`modifies_commitment` names earlier options whose monthly commitments this option
    changes.** It takes a comma-separated list. The modifying option carries no
    `money_monthly` of its own. The engine finds each commitment by `opened_by` (§2).
    - With `monthly_destination` set, it **redirects**: the earlier amount keeps running
      into the new destination. D20-A redirects D16-A's monthly investment to `small_cap`.
    - With `monthly_destination` blank, it **cancels**: the earlier amount stops.
    - `commitment_months` says how long the change lasts, 0 meaning permanent. D28-B
      cancels D16-A and D16-B for 4 months, then the commitment resumes, wherever D20-A
      may have sent it.
    - It applies to each named option the player actually chose and ignores the rest.
      D16-A and D16-B are options of one decision, so a D28-B player has at most one of
      them to stop. Since rule 29, a player with none of them running is not offered D28-B.
    - **It acts on the target's saving commitments only** (29 September 2026). D28-B names
      D27-B and D27-C as well as D16-A and D16-B, so it stops an investment started at D27
      too; D27-C also opens a 6,000 spending half, which D28-B leaves running.

    The sheet refuses to save if a named option has no monthly commitment or is not an
    earlier decision.

    **Why D28-B's `money_monthly` is 0.** Until v9 it carried +5,000 as a stand-in for
    stopping the investment. Once the cancel is real, that +5,000 is wrong in three ways:
    - The cancel already keeps the money in cash. Adding +5,000 on top puts another
      5,000 a month into the ledger from nowhere, which breaks principle 1: every rupee has
      a source.
    - A fixed 5,000 cannot follow the commitment. The cancel stops whatever the commitment
      actually is. A player with no investment would otherwise be paid 5,000 a month for
      stopping one they never made.
    - Cancel and amount would be two records of one event, and they would drift apart the
      first time either was tuned. That is the §0 double counting problem again.
18. **`commitment_kind` is set by hand on every option, never inferred.** It says which
    pool a monthly amount belongs to, `cost`, `saving` or `income`, and the sign says
    which way it moves that pool. All 94 options were read against their text in v11.
    The sheet refuses to save a kind without a monthly amount, an amount without a kind,
    or a positive `saving`. `commitment_kind_2` does the same for `money_monthly_2`:
    D27-C's spent half is a `cost`, its invested half a `saving`.

    **Why.** Until v11 the kind was inferred: positive meant `income`, negative into
    `spent` meant `cost`, anything else `saving`. That misread five amounts:

    | Option | Amount | Inferred | Actually |
    |---|---|---|---|
    | D24-B | +5,000 | `income` | `cost`, rent going down |
    | D28-A | +12,000 | `income` | `cost`, costs going down |
    | D29-A | -10,000 (-2,900 from v19) | `cost` | `income`, a lower salary |
    | D30-A | deferred -3,000 | `cost` | `income`, the payout stopping |
    | D30-B | deferred -300 | `cost` | `income`, the payout stopping |

    The D28-A misread silently broke the layoff. "Cut everything, live off the emergency
    fund" exists to buy runway. Read as income, the cut never reached `essential_burn`,
    and income is zero during a layoff anyway, so a player who cut everything got no
    extra runway at all. Nothing failed, and nothing looked wrong. The same misread made
    D29-A's lower salary count toward Freedom as a new cost instead of a smaller income.
19. **A deferred removal is capped at the balance available, and reports the shortfall.**
    If `def_money_once` asks to remove more than its bucket holds, for example because an
    FD already matured, the engine removes what is there and the event records both the
    amount asked and the amount applied.
20. **A paused commitment counts toward nothing while paused.** A commitment paused under
    rule 17 is left out of Safety, Freedom and `income_net` until the pause ends.
21. **Monthly money starts the month after the decision.** D11-C's twelve payments run
    months 7 to 18, which is what its "Final EMI paid" callback at month 18 requires. The
    one exception is rent, which starts in the decision's own month, because you pay on
    moving in. `starts_same_month` marks it: D02-A to C, D24-A to C and D27-A. A monthly
    amount opened by a callback starts the month after the callback. Until v13 §10 said
    money runs "from this month". The copy settled this, not the doc (§14).
22. **`asset_type` sets depreciation (§3).** A bought asset needs `asset_acquired_value` and a
    depreciating type. A deposit is `illiquid` money with `asset_type` `deposit`.
23. **`term_months` makes a deposit mature.** A deposit into `locked_short` with
    `term_months` matures at the decision's month plus the term and moves to cash (§2). A
    deposit without one never matures and stays haircut in Safety. D07-B's FD is 12, as its
    copy states, so it matures at month 16. D16-B's RD is 24, the length of its commitment.
24. **An EMI purchase opens a debt.** With `is_emi_purchase` Y, the option acquires its asset
    at `asset_acquired_value` and opens a debt for the same amount. `money_monthly` is the
    stated EMI and `commitment_months` its term. The debt is paid from the month after the
    decision and amortised per §8. No monthly cost opens. D11-C and D22-A. Until v16 an EMI
    was a monthly cost with no debt, so buying a 79,000 phone on EMI raised Net Worth by
    79,000, which inverted the lesson of D11-C.
25. **Salary after a layoff is set by the sheet.** An income commitment with
    `is_salary_change` Y (D01-A, D13-B, D26-A, D26-B, D29-A, D29-B) is part of the job: it
    folds into `salary_net_last_job` at the layoff and ends. An income commitment without it,
    such as D28-D's parents, D29-C's freelance work or D30's payouts, carries on. Salary
    restarts only through `restarts_salary_after_months`. A player who never makes a D29
    choice stays without salary.
26. **Only a card holder can borrow at step 4.** `grants_card` is Y for D17-A, D17-C and
    D28-C. D17-B is left out because its callback closes the card for non-use by month 20,
    before the layoff. D17-D refused the card, though D28-C gives one at month 22 (§14).
    Everyone else goes from step 3 to step 5.
27. **A card balance in the copy is a card debt.** An option whose story puts money on a card
    uses `card_balance` or `card_takes_gap`, never `def_money_once` or `def_money_monthly`.
    Until v19 D17-C and D28-C carried their balances as deferred cash, which was not a debt,
    did not count toward `CARD_LIMIT`, and let a D17-C player borrow the full limit on top.
28. **A callback with no text left does not happen.** If every sentence of a deferred text
    drops under the §10.1 fallback, the card does not show and nothing the callback carries
    is applied: no `def_money_once`, no `def_money_monthly`, no `def_life`. A consequence the
    player never sees cannot teach anything, and a silent Life penalty is worse than no
    penalty. Whether anything is left depends on the end of the callback's month, so at step
    6 the engine runs the rest of that month on a copy with the callback applied and reads the
    text there, as the player would see it. If nothing is left, the callback is skipped on the
    real state and the month reports `callback_skipped`. In Chapter 1 only D04-A and D04-B
    can empty, when nothing was saved.
29. **An option that cannot apply is not offered.** Ruled 29 September 2026. An option whose
    precondition the player does not meet is not shown. A decision always keeps at least two
    options on every path.

    *Why.* An option that acts on something the player does not have is not a choice, it is a
    broken button. "Move your monthly investment to small caps", offered to a player with no
    monthly investment, changes nothing in the engine. Offering it and quietly doing nothing is
    worse than not offering it, because the player learns that their choices sometimes do not
    matter. This is different from hiding a situation. D03's situation happens to everyone, so
    hiding it would hide a real month (ruled at v30); the fix there was the words.

    *A precondition is structural: the thing the option acts on exists.* An index investment to
    move or keep, a monthly investment to stop, a card to use. It is not whether the player can
    afford the option. An option the player cannot afford stays offered and goes through the
    payment cascade, because discovering you cannot afford it is the lesson: a player with 702
    who chooses D03-C, dipping into savings, finds they have none and ends up on family money
    (ruled 29 September 2026). **Confirmed by the product owner, 29 September 2026: structural
    means the thing the option acts on exists. Affordability is never a precondition.**

    **Built 29 September 2026, sheet v32,** in the simpler form ruled that day, which
    replaces the vocabulary in the table below: an option that modifies a commitment is
    offered only while a saving commitment of one of its targets runs, derived from
    `modifies_commitment` with no new column. The `requires` column names the rest, and its
    only values are `index` (D16-A's monthly investment is running, wherever D20-A sent it)
    and `no_index`, for D20-B and D20-D. `optionOffered` and `optionsFor` in
    `engine/content.js`; `decisionsForMonth` returns each decision with only its offered
    options; `applyDecision` refuses any other. The game, save replay, the timeline, the
    calibration harness, the text tests and the Phase 0 harness all read it. A calibration
    test plays every housing and D16 choice, the four player types and 300 random players and
    fails if any decision offers fewer than two options: the fewest anywhere is two, at D20.
    Chapter 2's opening uses the same two values and nothing new (v35): D39-A modifies D16-A,
    so it is offered only while that investment runs; D39-B requires `index` and D39-D
    `no_index`; D39-C is offered to everyone. A player with D16-A running sees three options, one
    without it sees two.
    The table below is the first draft, kept for the record.

    *What the first draft said it needs:*

    | Where | What |
    |---|---|
    | Sheet | A `requires` column on Options, from a small fixed vocabulary, each answered by the engine from the state: `equity_commitment` (a running monthly equity investment, D16-A's or a redirect of it), `monthly_investment` (any running saving commitment into equity, small caps or a deposit), `card` (`has_card`). Empty for almost every option |
    | Engine | `optionsFor(state, decision)` in `engine/content.js`: the options whose `requires` the state meets. `applyDecision` refuses an option not in it, as it refuses a decision out of its month |
    | Game | The decision screen shows `optionsFor`, not every option. The compact layout already adapts to the count |
    | Save and replay | Unchanged: the save holds choices, and replay applies them to the same state, so the same options exist |
    | Calibration | Random play, the player types, maximum saving and validation 2 choose only from `optionsFor`. Validation 2 judges an option only on paths where it is offered |
    | Checks | A test that plays every housing path and the player types to month 24 and fails if any decision is left with fewer than two options, and an export check that every `requires` value is in the vocabulary |

    *Where it applies in Chapter 1 today,* from `FIRST-SESSION.md` 9.3 group B:

    | Option | Requires | Left for a player without it |
    |---|---|---|
    | D20-A, move your monthly investment to small caps | `equity_commitment` | D20-C only. **One option: breaks the two-option rule.** D20 needs a second option for a player with no index, which is content |
    | D20-B, keep the index and add a little to small caps | `equity_commitment` | The same |
    | D28-B, stop the monthly investment | `monthly_investment` | D28-A, D28-C, D28-D. Three, fine |
    | D28-C, the gap on the card | Not `card`: ruled at v19 that D28-C gives a card (§14) | Unchanged |

    D07, D19-A and D22-B are affordability, not structure, so they stay offered and go through
    the cascade; their words are still false for the studio path and are copy to fix
    (`FIRST-SESSION.md` 9.3). D27-B starts investing for anyone, so it needs no precondition,
    only words that do not assume an SIP already running.

`money_monthly` used to run forever, which is wrong for an EMI. D11-C is 6,600 for
twelve months, not 6,600 until you are 42. `commitment_months` fixes that, and it is
also what makes Freedom recover in §5.

### Open items

Yellow cells in the sheet are values not yet confirmed.

| Option | Column | Question |
|---|---|---|
| D14-B, D14-D | `liquidity_class_2` | "invested" read as `equity`. Could be gold or a mix |
| D27-C | `money_monthly_2`, `monthly_destination_2` | Comfort half inferred as -6,000 `spent`, from D27-B putting the full increase at 12,000 |
| D21-C, D05-A | `monthly_destination` | Premium is partly cover, partly returned money. Classed `endowment`. Could now use `money_monthly_2` |
| D02-A, B, C | `liquidity_class` | `illiquid` assumes a refundable deposit. Brokerage or moving costs would be `spent` |
| D29-C | `commitment_months` | Freelance for the three week wait, rounded to 1 |
| D30-A, B | `commitment_months` | 0, ended by `def_money_monthly` |
| D18-A | `def_commitment_months` | 48 months left on a five year product |

Rule 16 and token open items:

| Option | Column | Question |
|---|---|---|
| D16-A | `immediate_text` | Tokens in immediate text look one month ahead, so the old "down 2%, then down 6%" build-up is gone. Keeping it needs a two-month token |
| D06-C | `deferred_text` | `{total_saved}` counts all saving since month 3, not only what the tiffin saved |
| D28-B | `modifies_commitment` | **Resolved 29 September 2026, v32:** D28-B names D27-B and D27-C too, and rule 17 now acts on saving commitments only, so it stops D27's investments and leaves D27-C's comfort half running. Still open: D28-B's result, "5,000 a month back", is D16's figure; a player stopping D27-B's 12,000 gets more back than it says |

### Cross-check before deleting `safety` and `freedom`

Keep both columns for one version. Run the engine, compare the computed bar movement
against the hand-written weight, and look at the options that disagree most. Those are
where intuition and the maths diverge, and one of them is wrong. Then delete the columns.

Do not skip this step. It is the valuable one.

## 10.1 Engine tokens

Category B figures (rule 16) appear in the copy as tokens. No other token is valid.

| Token | Engine substitutes | Format | Fallback if unavailable | Used in |
|---|---|---|---|---|
| `{equity_balance}` | Current value of the `equity` or `small_cap` holding the owning option opened | Rupees | Drop the sentence | D16-A |
| `{equity_change_pct}` | The holding's balance against the money put in, `(value - contributed) / contributed`, in the month the text shows | Direction and percent | Drop the sentence | D16-A, D20 situation, D20-A, D20-B |
| `{equity_down_months}` | Months in that window in which the gain on money put in fell, so new money going in does not hide a fall | Number in words, "none" when 0 | Drop the sentence | D16-A |
| `{equity_contributed}` | Rupees paid into that holding in that window | Rupees | Drop the sentence | D16-A |
| `{total_saved}` | Change since the owning decision in `cash` + `liquid_fund` + `sum(fds)` + `equity` + `gold`. Excludes `retirement_fund` and assets | Rupees | Drop the sentence, also when the change is zero or negative | D04-A, D04-B, D04-C, D06-C |
| `{retirement_balance}` | `retirement_fund` in the month the text shows | Rupees | Drop the sentence | D01-C |
| `{monthly_costs}` | `living_costs` + `sum(-c.amount for cost commitments)` + `debt_minimums`, in the month the text shows | Rupees | Drop the sentence | D28 situation |
| `{minimum_month}` | `essential_burn` (§4) in the month the text shows | Rupees | Drop the sentence | D03-B |
| `{gold_change_pct}` | The gold holding the owning option created, balance against money put in, as `{equity_change_pct}` | Direction and percent | Drop the sentence | D15-A |
| `{stopped_monthly}` | The monthly saving the owning option paused: `-amount` summed over the saving commitments of its `modifies_commitment` targets that are paused when the text shows. Since v34 | Rupees | Drop the sentence. It cannot happen for D28-B, which rule 29 offers only while one of its targets runs | D28-B |

**Formats.**

- Rupees: Indian grouping (1,20,000), rounded to the nearest 1,000, or to the nearest
  100 below 10,000 so small totals such as 3,400 survive.
- Direction and percent: "up 7%", "down 22%", or "flat" when it rounds to 0.

**Where it is built.** `engine/tokens.js` gives the raw values: `tokenValues(state,
{ decisionId, optionId, field })` returns a number for each token, or null when the value is
unavailable. The engine formats nothing (ENGINE.md rule 2). `text/render.js`, outside the
engine, turns the numbers into words: `renderText(template, values)` returns the filled
text, or null when nothing is left.

**Balance against money put in.** A player reads "my investment is down 22%" as what their
balance did to the money they put in, so that is what the change tokens show. For a lump
sum such as D20-B it is the same as the market's move. For monthly investing it is not:
money that went in during a fall bought low, and money that went in before it lost more.
On seed 1 D20-A shows down 25%.

**Window.** In deferred text, the window runs from the month the option was chosen to
the month the callback shows, and the values are read at the end of the callback's month.
In immediate text, which shows at the moment of the choice, tokens look one month ahead:
the end of the month after the decision, since monthly money starts that month (§10 rule
21). The engine runs those months on a copy of the state, so reading the text changes
nothing. The market is seeded (§7), so the engine can. `{total_saved}` counts from just
before the owning decision.

In situation text there is no chosen option yet. Tokens read the holding opened at the
decision named in `depends_on`, from the month it opened to the current month. D20 reads
the holding D16-A opened. A player who chose D16-B or D16-C has no equity holding, so
the sentence drops and D20 opens on the colleague's 40% alone. For a D16-A player, month
14 comes straight after the months 11 to 12 dip (§7), so the real number is usually
modest or negative against the colleague's 40%. That contrast is the lesson.

`{monthly_costs}` and `{minimum_month}` read the player's whole ledger in the month the
text shows, not a holding, so they need no window and work in any field.

**Capitals.** A token that starts the text, or follows a full stop, question mark or
exclamation mark, has its first letter capitalised: "Down 22%. It was 20,000, not
everything."

**Fallback.** Dropping the sentence that holds the token keeps the rest of the text
true. If nothing is left of a deferred text, the callback does not fire, and none of its
effects apply (§10 rule 28). If nothing is left of an immediate text, the immediate screen
is skipped; the decision itself still applies. A sentence ends at a full stop, question
mark or exclamation mark followed by a space, so figures such as 3.5% stay whole. The engine
and `text/` split sentences with the same function, so a callback the engine lets land
always has text to show.

**Phase 0 samples.** The Phase 0 harness has no engine, so `scripts/xlsx_to_json.py`
fills tokens in test decisions with the figures readers saw before v8. The script
mirrors this table and stops if a token in a test decision has no sample.

| Option | Field | Token | Phase 0 sample |
|---|---|---|---|
| D01-C | deferred | `{retirement_balance}` | 41,000 |
| D16-A | immediate | `{equity_change_pct}` | down 2% |
| D16-A | deferred | `{equity_down_months}` | four |
| D16-A | deferred | `{equity_balance}` | 78,000 |
| D16-A | deferred | `{equity_contributed}` | 70,000 |
| D20 | situation | `{equity_change_pct}` | up 9% |
| D28 | situation | `{monthly_costs}` | 34,000 |
| D20-A | immediate | `{equity_change_pct}` | up 7% |
| D20-A | deferred | `{equity_change_pct}` | down 22% |
| D20-B | deferred | `{equity_change_pct}` | down 22% |

---

## 11. The league score

Net worth is unbounded, so it cannot be averaged with three 0 to 100 bars directly.
Log-scale it against a benchmark:

```
nw_index = clamp(100 × ln(max(net_worth, ref) / ref) / ln(target / ref), 0, 100)

score = 0.35 × nw_index
      + 0.25 × safety
      + 0.20 × freedom
      + 0.20 × life
```

`ref` and `target` are chapter-dependent. §13 defines them per chapter.

**Check against your own design rule.** You wrote that it must be possible to have the
highest net worth in your league and still lose.

| Player | NW index | Safety | Freedom | Life | Score |
|---|---|---|---|---|---|
| A, maximiser | 100 | 45 | 30 | 25 | 57.3 |
| B, balanced | 72 | 78 | 65 | 70 | 71.7 |

A has the highest net worth in the league and loses by 14 points. The rule holds.

---

## 12. Tuning constants

Every number a designer might change, in one place. Nothing here is calibrated yet.

**Named exception to ENGINE.md rule 1: authored month-by-month data.** Rule 1 says every
number the engine uses comes from this table or the sheet. The market scripts in §7 are
the exception. They are not tuning dials but authored data, one value per month, so they
do not belong in a constants table. They live in `data/market-script.json`, generated from
§7 by `scripts/export_market_script.py`, and the engine imports the same data from
`engine/market-script.js`. §7 stays the human-readable source and the generator is the
single path from the doc to the engine, just as `engine/constants.js` is generated from
this table. The long-run figures in §7 ("about 11% long run") are commentary, not data;
the step 7 calibration harness checks whether the scripts actually produce them.

| Constant | Value | Controls |
|---|---|---|
| `SAFETY_TARGET_MONTHS` | 6 | Runway for full marks |
| `SAFETY_DANGER_MONTHS` | 1 | Runway below which the Safety bar shows as danger, whatever it did this month, §4. Display only: no score reads it |
| `EQUITY_CRISIS_HAIRCUT` | 0.60 | How unreachable equity is in an emergency |
| `SMALL_CAP_CRISIS_HAIRCUT` | 0.45 | How unreachable small caps are in an emergency, §4 |
| `GOLD_CRISIS_HAIRCUT` | 0.85 | How unreachable gold is in an emergency, §4 |
| `SAFETY_RUNWAY_WEIGHT` | 70 | Safety points for runway, §4. The three Safety weights sum to 100 |
| `SAFETY_HEALTH_WEIGHT` | 18 | Safety points for health cover, §4 |
| `SAFETY_TERM_WEIGHT` | 12 | Safety points for term cover, §4 |
| `SAFETY_HEALTH_COVER_MULTIPLE` | 0.5 | Health cover, as a multiple of annual income, for full health points |
| `HEALTH_COVER_START` | 300000 | Health cover at game start, the company policy. Stated to the player in D09, rule 16 |
| `SAFETY_TERM_COVER_MULTIPLE` | 10 | Term cover, as a multiple of annual income, for full term points once someone depends on you |
| `NOISE_DAMPING` | 0.25 | Noise multiplier inside a lesson window, §7. Lower means the script wins more surely |
| `FD_BREAK_PENALTY` | 0.05 | Early exit cost |
| `LIFE_DRIFT` | 0.12 | How fast Life returns to baseline. Higher means choices fade faster |
| `LIFE_BASELINE_FLOOR` | 40 | Where a joyless life settles |
| `LIFE_SCORE_START` | 60 | Life score at game start, §6. Above the floor, below the baseline ceiling of 70 |
| `DISCRETIONARY_TARGET` | 0.15 | Share of net income for full Life baseline |
| `LIFE_DISCRETIONARY_WEIGHT` | 30 | Life baseline points above the floor at full discretionary spending, §6 |
| `SAVING_FULL_SHARE` | 0.30 | Share of the yardstick income (§6) deliberately saved in a month at which all spending above a normal month counts as gone, so the Life baseline sits at the floor. Below it, spending above normal shrinks in proportion. Ruled 27 September 2026, option L3-30 (§14) |
| `SAVING_ONE_OFF_SPREAD_MONTHS` | 12 | Months over which a one-off put into saving or investment counts as saved for the Life baseline, §6. Ruled 27 September 2026 with `SAVING_FULL_SHARE` |
| `SALARY_NET_START` | 41300 | In-hand salary at game start. Stated to the player in D01, rule 16 |
| `LIVING_COSTS_START` | 22600 | Monthly living costs at game start, excluding rent, §2. Derived from D28 on the reference path, accepted in v12 |
| `NORMAL_LIVING_START` | 20200 | A normal month's living costs at game start, excluding rent, §2. Spending above it is discretionary, §6. Derived from D04-B on the reference path |
| `MINIMUM_LIVING_START` | 11700 | Essential part of living costs at game start, §2. Derived from D28-A on the reference path, accepted in v12. Checked against D28-A, rule 16 |
| `FREEDOM_CEILING_RATIO` | 0.70 | Committed ratio at which Freedom hits zero |
| `SAFETY_GOOD_MONTHS` | 3 | Runway at the good mark on Home's Safety bar, with health and term cover full, §4. Display only: no score reads it. Ruled 30 September 2026 (`ONBOARDING.md` section 5) |
| `FREEDOM_GOOD_COMMITTED` | 0.40 | Committed ratio at the good mark on Home's Freedom bar, §5. Display only. Ruled 30 September 2026 |
| `LIFE_GOOD` | 55 | Where the good mark sits on Home's Life bar: the middle of the baseline, `LIFE_BASELINE_FLOOR` plus half `LIFE_DISCRETIONARY_WEIGHT`, §6. Display only. Ruled 30 September 2026 |
| `INFLATION_MONTHLY_RATE` | 0.00486755 | Monthly inflation on living costs and rent renewals, §2. Multiplied 12 times it gives 6.00% a year, the figure stated to the player in D13, rule 16. Replaces `INFLATION_ANNUAL` |
| `LEAK_DISCRETIONARY_SHARE` | 0 | Share of the leak that counts as discretionary spending for Life, §6. 0 since step 7: money that dribbles away unspent is not a life lived |
| `CASH_LEAK_RATE` | 0.35 | Share of this month's unallocated cash lost to discretionary spending, §2.1 |
| `CARD_MONTHLY_RATE` | 0.035 | Credit card. Stated to the player in D17-C and month 11's concept card, rule 16 |
| `PERSONAL_LOAN_MONTHLY_RATE` | 0.012 | Personal loan, §8 |
| `TWO_WHEELER_LOAN_MONTHLY_RATE` | 0.009 | Two wheeler and consumer loans, §8 |
| `HOME_LOAN_MONTHLY_RATE` | 0.007 | Home loan, §8. Chapter 4 |
| `DEBT_FUND_ANNUAL_SIGMA` | 0.005 | Yearly volatility of a debt fund, §7 |
| `LIQUID_FUND_ANNUAL_RATE` | 0.055 | Liquid fund return, §7 |
| `LIQUID_FUND_ANNUAL_SIGMA` | 0.002 | Yearly volatility of the liquid fund, §7 |
| `GOLD_ANNUAL_RATE` | 0.08 | Gold return, §7 |
| `GOLD_ANNUAL_SIGMA` | 0.14 | Yearly volatility of gold, §7 |
| `GOLD_EQUITY_CORRELATION` | 0.2 | How much gold's noise moves with broad equity's, §7. A judgement call, §14 |
| `PROPERTY_ANNUAL_RATE` | 0.06 | Property return, §7. Chapter 4 |
| `PROPERTY_ANNUAL_SIGMA` | 0.04 | Yearly volatility of property, §7. Chapter 4 |
| `EQUITY_ANNUAL_SIGMA` | 0.13 | Yearly volatility of broad equity, the noise around its script, §7. 0.16 until 27 September 2026, ruled down for the D16-A target (§14) |
| `SMALL_CAP_ANNUAL_SIGMA` | 0.3 | Yearly volatility of small caps, the noise around their script, §7 |
| `FD_ANNUAL_RATE` | 0.065 | FD, RD and debt fund return, §7. Stated to the player in D16-B, rule 16 |
| `SAVINGS_ANNUAL_RATE` | 0.03 | Savings account return, §7. Stated to the player in D07-A, rule 16 |
| `CARD_LIMIT` | 200000 | Most a card can carry, §9 step 4. Stated to the player in D17, rule 16 |
| `CARD_MINIMUM_FLOOR` | 500 | Card balance below which the next payment clears the card entirely, §8. Without it a card on minimum payments never reaches zero |
| `CARD_MIN_PAYMENT_PCT` | 0.05 | Minimum payment on a revolving card balance, §8. Stated to the player in D17-C, rule 16 |
| `TAX_PRODUCT_ANNUAL_RATE` | 0.05 | UNVERIFIED placeholder. Annual return on `tax_product_balance`, the D18-A product, §7. The copy gives no figure. Must not be treated as real until set on purpose, §14 |
| `ENDOWMENT_EFFECTIVE_RETURN` | 0.045 | Effective annual return on the D05-A endowment, §7. Stated to the player in its callback, rule 16 |
| `RETIREMENT_CONTRIBUTION_MONTHLY` | 4000 | UNVERIFIED placeholder. Employee plus employer retirement contribution credited each month with a salary, §2 step 2. Not checked against EPFO rules. Must not be treated as real until verified, §14 |
| `RETIREMENT_ANNUAL_RATE` | 0.08 | UNVERIFIED placeholder. Annual interest on `retirement_fund`, §2 step 7. Not checked against the declared EPF rate. Must not be treated as real until verified, §14 |
| `LAYOFF_SEVERANCE_MONTHS` | 1 | Months of salary paid as severance when the layoff lands, §9. Stated to the player in D28, rule 16 |
| `FAMILY_LIFE_PENALTY` | 2 | Life lost once per episode of months in which family covers a shortfall, §9 step 5. From D28-D's life of -2 |
| `FAMILY_REPAYMENT_MONTHS` | 12 | Months over which a family bailout is repaid, as a debt at 0%, §9 step 5 |
| `NO_COST_EMI_MARKUP` | 0.08 | The cash discount a no-cost EMI hides, as a share of the EMI total, §8. D11 and D22 quote cash prices that must agree with it, rule 16 |
| `PHONE_DEPRECIATION_ANNUAL` | 0.45 | Straight-line depreciation of a phone, §3 |
| `PHONE_VALUE_FLOOR` | 0.05 | Lowest value of a phone, as a share of its price, §3 |
| `TWO_WHEELER_DEPRECIATION_ANNUAL` | 0.2 | Straight-line depreciation of a two wheeler, §3 |
| `TWO_WHEELER_VALUE_FLOOR` | 0.15 | Lowest value of a two wheeler, as a share of its price, §3 |
| `CAR_DEPRECIATION_ANNUAL` | 0.18 | Straight-line depreciation of a car, §3 |
| `CAR_VALUE_FLOOR` | 0.12 | Lowest value of a car, as a share of its price, §3 |
| `SEED` | per player | Reproducibility |

---

## 13. Calibration targets

Before writing content for Chapter 2, play the four deterministic player types below and
check they land in these ranges. **Ruled 27 September 2026: the targets are judged against
the player types, not random play.** Random play is not a model of a human player: it takes
the expensive option at D02, D10, D19 and D23 about two times in three. The 1,000 random
playthroughs are still run and reported, as a secondary measure of the spread of outcomes.

Chapter 1 is read twice. Month 21 is how the chapter went, before the layoff. Month 24 is
how the crisis went, so its targets expect the layoff and sit lower. The month 21 targets
are the original month 24 targets, unchanged.

**Where the month 24 targets come from.** Proposed from the step 7 run, not invented: each
month 21 target moved by the change the layoff actually caused in that run between month
21 and month 24.

| Target | Measured change, month 21 to 24 | Month 21 target | Month 24 target |
|---|---|---|---|
| Net worth, weak | -1,14,867, the median change for players ranked in the bottom 20% at month 21 | under 50k | 50,000 - 1,14,867 = -64,867, under -65k |
| Net worth, median | -83,423, players ranked 40 to 60% | 2.5L | 2,50,000 - 83,423 = 1,66,577, 1.7L |
| Net worth, strong | -55,697, players ranked in the top 20% | 6L | 6,00,000 - 55,697 = 5,44,303, 5.4L |
| Safety, all three | -13%, the median relative change for the 244 players who had any runway at month 21 | under 20, 45, 75 | under 17, 39, 65. The two weak targets are now 30, ruled 27 September 2026, below |

Safety uses the relative change of players with runway because most random players have
none at month 21: their Safety is already 30, the cover points alone, and the layoff cannot
take away what is not there. Their measured change is 0, which would have left the month 24
Safety targets equal to month 21's.

| Checkpoint | Weak play | Median | Strong play |
|---|---|---|---|
| Month 21 net worth | Negative to 50k | 2.5L | 6L |
| Month 21 Safety | 30 | 73 | 100 |
| Month 24 net worth | under -65k | 1.7L | 5.4L |
| Month 24 Safety | 30 | 47 | 74 |
| Month 120 net worth | 8L | 45L | 1.2Cr |
| Month 240 net worth | 25L | 2.2Cr | 6Cr |
| Month 240 Life | 40 | 55 | 68 |

**Which player type each target is judged against.** Ruled 27 September 2026. The targets stay
as written. The types show the content is close to right: at month 21 Cautious ends at 3.2L and
Balanced at 2.0L, bracketing the 2.5L median, while Spender ends at -3.9L.

| Target | Judged against | Met when |
|---|---|---|
| Weak play | Spender | The type's figure is in range: below an "under" or "negative to" target, or within 20% of a single value |
| Median, net worth | Balanced and Cautious | The two bracket the target, or either is within 20% of it |
| Median, Safety | Balanced | Balanced is within 20% of the target. Cautious is not used, below |

**Why Safety's median is not bracketed.** Ruled 27 September 2026. Cautious picks the option
that leaves the most runway, so it holds full runway and reads 100 at month 21 and month 24 by
definition. No median Safety target below 100 can have Cautious on its far side, so bracketing
can never work for Safety. Month 24 appears to bracket 39 only because Balanced happens to sit
just below it, at 38.4. For Safety the median is judged by whether Balanced is in range.
Bracketing stays the rule for net worth, where Balanced and Cautious genuinely sit either side
of the median.
| Strong play | Maximum saving | In range, as for weak play |

Each type's figure is its median over seeds 1 to 100. Months 120 and 240 wait for Chapters 2
to 6, as before.

**The weak Safety targets are 30, ruled 27 September 2026.** They were "under 20" at month 21
and "under 17" at month 24, derived above. Those described a state the chapter cannot produce.
Health cover points (18) and term cover points (12, full while no one depends on the player)
give 30 with no runway at all. Every player keeps the company health cover, and no sensible
player loses it, so 30 is the floor for weak play. The targets were wrong, not the content.

**The median and strong Safety targets are 73 and 100 at month 21, and 47 and 74 at month 24,
ruled 29 September 2026,** derived from months of runway after the D13 raise of v31: 3.7 months,
1.5 months, 6 months and 3.8 months. The derivation is in §14, rulings of 29 September 2026. The
two paragraphs below record the targets they replace.

**The month 21 median Safety target was 65, ruled 27 September 2026.** It was 45, and 45 was
never derived: it came over from the original month 24 target. Worked back through §4, 45 is
the 30 cover points plus 15 runway points, and 15 of the 70 runway points is 15/70 of
`SAFETY_TARGET_MONTHS`, about 1.3 months of runway. That is too little to ask of a median
player who has been earning for twenty-one months.

65 is derived from months of runway, not from what any player type measured. A median player
at month 21 should hold three months of essential costs. Three months is 3/6 of the six-month
target, so 3/6 of the 70 runway points is 35, and with the 30 cover points that is 65. The
figure would be 65 whatever Balanced had measured. It happens that Balanced reads 67.8 at month
21 with the opening cash. That is a coincidence to be aware of, not the source.

Measured after the change (`calibration/REPORT-2026-09-27d.md`): Balanced 67.8 and Cautious
100.0. Both are above 65, so the two types do not bracket it. Balanced is within 20% of it, so
the median verdict is "in range", not "bracketed". Nothing else in the report moved.

The month 24 median stays 39. Worked back the same way, 39 is 9 runway points, about 0.8 months
of runway, a fair expectation straight after the layoff.

**Strong Safety above its target is not a miss.** A maximum saver should have full runway. Ruled
27 September 2026 against the old strong targets of 75 and 65; it still holds for 74 at month 24,
where Maximum saving reads 95.8. At month 21 the strong target is now 100, full runway, so it
cannot be exceeded.

**Strong Net Worth at month 21 is a content gap, recorded and left.** Maximum saving reaches
about 4.5L against 6L. Chapter 1 has nothing more for a saver to save into. That is the same
missing content validation 1 waits on (§14), and Chapter 2 is where it gets fixed, not the
target.

**League score benchmarks.** §11 needs a `ref` and a `target` for each chapter.
`ref` is the weak play net worth at the chapter's end month and `target` is the strong
play net worth, so `nw_index` reads 0 for weak play and 100 for strong. Weak play at month
24 is "negative to 50k", so its `ref` is the top of that range: the log needs a positive
`ref`, and any net worth below it scores 0. These benchmarks were set before the month 24
targets were split in step 7. They now match the month 21 targets, and the chapter 1 league
still scores at month 24 against them (§14).

| Checkpoint | `ref` | `target` | Median `nw_index` |
|---|---|---|---|
| Month 24 | 50,000 | 6,00,000 | 65 |
| Month 120 | 8,00,000 | 1,20,00,000 | 64 |
| Month 240 | 25,00,000 | 6,00,00,000 | 68 |

The median lands near 65 at every checkpoint, so the index means the same thing across
chapters.

Chapter end months come from the days-per-chapter table in the product spec
(`HANDOFF.md` section 4): 24, 36, 48, 48, 48 and 36 sessions, one month each.

| Chapter | End month | Between checkpoints | `ref` | `target` |
|---|---|---|---|---|
| 1 | 24 | Checkpoint | 50,000 | 6,00,000 |
| 2 | 60 | 24 and 120 | 1,41,000 | 18,50,000 |
| 3 | 108 | 24 and 120 | 5,66,000 | 82,50,000 |
| 4 | 156 | 120 and 240 | 11,30,000 | 1,94,00,000 |
| 5 | 204 | 120 and 240 | 17,80,000 | 3,70,00,000 |
| 6 | 240 | Checkpoint | 25,00,000 | 6,00,00,000 |

Chapters 2 to 5 end between checkpoints, so their values are interpolated geometrically,
since net worth grows by compounding, and rounded to three significant figures:

```
value(m) = value(m1) × (value(m2) / value(m1)) ^ ((m - m1) / (m2 - m1))

chapter 2 ref    = 50,000      × (8,00,000 / 50,000)          ^ (36 / 96)  = 1,41,421
chapter 2 target = 6,00,000    × (1,20,00,000 / 6,00,000)     ^ (36 / 96)  = 18,45,175
chapter 3 ref    = 50,000      × (8,00,000 / 50,000)          ^ (84 / 96)  = 5,65,685
chapter 3 target = 6,00,000    × (1,20,00,000 / 6,00,000)     ^ (84 / 96)  = 82,51,872
chapter 4 ref    = 8,00,000    × (25,00,000 / 8,00,000)       ^ (36 / 120) = 11,26,017
chapter 4 target = 1,20,00,000 × (6,00,00,000 / 1,20,00,000)  ^ (36 / 120) = 1,94,47,879
chapter 5 ref    = 8,00,000    × (25,00,000 / 8,00,000)       ^ (84 / 120) = 17,76,172
chapter 5 target = 1,20,00,000 × (6,00,00,000 / 1,20,00,000)  ^ (84 / 120) = 3,70,22,032
```

Like every value in this section, these are only as good as the three checkpoints they
come from, which are not yet calibrated.

Four validation tests the engine must pass:

1. **No dominant strategy.** Maximum-saving play must not top the league score. If it
   does, Life drift is too weak. **Not passable in Chapter 1.** No Chapter 1 decision costs a
   maximum saver real money, so the test measures missing content, not the score (§14). The
   harness still measures and reports it, marked not passable, and makes it live again by
   itself once the sheet holds a Chapter 2 decision. A test that can never pass gets ignored,
   which is worse than not having it.
2. **No free lunch.** Every option must cost something on some bar. Run it through the
   engine, not the sheet: the `safety` and `freedom` columns are being deleted (§10), and
   the engine is what now decides those effects. For each option, run the same starting
   state with and without it, through its last deferred callback, and flag any option
   whose computed change to Net Worth, Safety, Freedom and Life is non-negative on all
   four.
3. **Shocks are survivable.** A prepared player must survive every scripted shock
   without step 4 of the cascade. If not, the shock is too large.
4. **Compounding is visible.** The gap between starting a SIP at month 10 and month 40
   must be obvious at month 240. If it is not, the drift is too low or the amounts are
   too small.

**How the harness measures this.** `calibration/run.js` runs the playthroughs and prints
the report. It changes nothing: constants change by ruling, and a proposal is tried by
naming it on the command line, such as `node calibration/run.js 1000 CASH_LEAK_RATE=0.1`,
which leaves this section and §12 untouched. It reads the targets above straight from this
section. As ruled for step 7:

| Question | How it is measured |
|---|---|
| Which checkpoints | Month 21 and month 24, both reported. Months 120 and 240 need Chapters 2 to 6 and are reported blank. Validation test 4 still runs to month 240, since it needs only the equity script |
| Random choices | Every decision, every option equally likely, seeds 1 to N. Each playthrough runs to month 30 so every callback lands. Checkpoints are read at the end of their month |
| Weak play, median, strong play | Judged against the player types, as ruled 27 September 2026: Spender, Balanced and Cautious, Maximum saving (above). Random play is reported second, read as the 10th, 50th and 90th percentiles, with the 25th and 75th. A single-value target counts as met within 20% |
| League score | §11 with the month 24 `ref` and `target` above |
| Maximum-saving play, test 1 | At each decision in month order, the option that leaves the most Net Worth at month 24, with every later decision on its quiet option. The league is the maximum-saving player plus the random players |
| Quiet option | The option that moves the least money, one-off plus 24 months of monthly amounts |
| No free lunch, test 2 | From the quiet path to the decision's month, each option against skipping the decision, with nothing else decided, through its last callback. A skipped decision still lands its `income_event`, so D14's bonus arrives either way. D29 is not judged, because every D29 option restarts salary and skipping it never does |
| Prepared player, test 3 | At least `SAFETY_TARGET_MONTHS` of runway the month before a Shock decision (D13, D28, D30). Watched from the shock month until its callback lands and, after the layoff, salary is back. The maximum-saving player is reported beside it |
| Compounding, test 4 | 5,000 a month into broad equity from month 10 against from month 40, on 100 funded seeds, read at month 240 |

**Deterministic player types.** The primary measure since 27 September 2026. Random play is a
weak proxy for people, so the report leads with four fixed rules, with `typePlaythrough` in `calibration/harness.js`. Nothing about them
is random. A type and a seed always give the same run. Each rule is applied at every decision
in month order, on the state the player is in when the decision arrives. To score an option the
harness applies it to a copy of that state with `applyDecision`, before the month runs, and
reads the result. No rule looks at a later month, a callback or a later decision.

| Type | At each decision it picks | Scored on |
|---|---|---|
| Cautious | The option that leaves the most runway | `runway_months` from `explainSafety` (§4) in the state right after the option is applied: reachable money over essential monthly costs. Higher wins |
| Spender | The option with the highest Life effect | The sheet's `life` column plus its `def_life` column, the immediate and the deferred Life the sheet authors for the option. Not the engine's Life bar, which an option only starts to move. Higher wins |
| Balanced | The option closest to the middle on net worth at month 24, within two limits | Net Worth (§3) at the end of month 24, with the option applied and every later decision on its quiet option, as maximum saving scores it. The middle is the halfway point between the lowest and the highest that any option of this decision gives. Balanced takes the option nearest it among those that, right after being applied, commit no more than 60% of income (`committed_ratio`, §5) and leave at least one month of runway (§4, card debt netted). Ruled 30 September 2026; see below |
| Maximum saving | The option that leaves the most Net Worth at month 24 | As defined for validation 1: decisions taken in month order, each tried against every option with all later decisions on their quiet option, on seed 1 |

**Balanced by habits, ruled 30 September 2026.** A balanced player is not someone who picks the
middle number thirty times; they have limits they will not cross. Two earlier definitions failed
because each optimised a single figure. Net worth the moment it chose made borrowing look free.
Net worth at month 24 alone committed 98% of income by month 21, since locked products keep
their value in net worth. The limits are `BALANCED_COMMITTED_LIMIT` (0.6) and
`BALANCED_RUNWAY_LIMIT` (1 month) in `calibration/harness.js`: they define a player type, not the
engine, so they are not §12 constants.

*When every option crosses a limit,* Balanced takes the options that cross the fewest limits and,
among them, the one nearest the middle: the least bad option. It does not flee to the option that
keeps the most runway: that is cautious play, and Cautious already models it.

*D02 always triggers this.* Every flat leaves under a month of runway once its deposit and first
rent are paid in month 1: the studio's 20,000 deposit, the shared flat's 12,000 and the room's
8,000 all come out of the 20,000 of opening cash in the same month as the rent. That is true of a
real 22-year-old moving into a first flat, not a flaw in the rule. Balanced takes the shared flat.
The fallback also triggers at D30 on 42 seeds of 100, at D27 on 4 and at D26 on 1, the months
after the layoff, when runway is thin whatever the choice.

*Its targets stay as derived.* Balanced lands just below the Safety median targets (56.3 against
73 at month 21, 35.2 against 47 at month 24) and just above the month 24 net worth target (2.13L
against 1.7L). The targets were derived from months of runway, not from any player type; a type
landing near but outside a derived target is the target doing its job.

Ties, in order: the option that moves less money (the quiet option's measure above), then the
option that comes first on the sheet. Maximum saving's choices are found once, on seed 1, and
then played on each seed's market. The other three choose again on every seed, since their
scores read the state.

The report gives each type's four bars at months 21 and 24 for seed 1, and the median over
seeds 1 to 100, plus each type's month 24 league score (§11) for seed 1. Since the choices
mostly do not depend on the market, the medians sit close to seed 1.

**The D16-A target.** The report also gives the share of 200 seeds on which the D16-A balance
is above the money put in at the end of month 24, on a path that keeps D16-A running: D16-A
chosen, every other decision on its quiet option among those that do not redirect or cancel D16-A
(D20-A and D28-B are left out). Target: at least 80% (§14).

---

### Chapter 2's opening, months 25 to 30 (sheets v35 and v36, measured 30 October 2026)

`calibration/REPORT-2026-10-30b.md`, after v36; `REPORT-2026-10-30.md` is v35's. Ten decisions,
D31 to D40, with placeholder copy. Chapter 1's figures are unchanged by them, checked against
`REPORT-2026-09-30c.md`: the same month 21 and 24 results and the same chapter 1 choices for every
player type. Chapter 1's decisions are still scored at month 24; a decision after it is scored at
month 30, the last month the sheet has decisions in (`OPENING_END` in `calibration/harness.js`),
because month 24 cannot see it.

**Chapter two's opening has no ruled target.** This section sets none between month 24 and month
120. The month 30 figures below are derived by its own rule for a month between checkpoints,
geometric interpolation, to show where the opening lands. A verdict against them is a reading,
not a pass or a failure. Weak play cannot be interpolated that way, because its month 24 target is
negative, so it uses the league `ref`. There is no Safety target after month 24 to derive one from.

| Month 30 net worth | Derived from | Derived target | Judged against | Measured | Reading |
|---|---|---|---|---|---|
| Weak | `ref` 50,000 at month 24 to 8,00,000 at 120 | under 59,460 | Spender | -9,38,656 | In range |
| Median | 1.7L at month 24 to 45L at 120 | 2,08,628 | Balanced, Cautious | 1,19,709 and 4,42,562 | Bracketed |
| Strong | 5.4L at month 24 to 1.2Cr at 120 | 6,55,493 | Maximum saving | 8,91,423 | Above, by 36%: recorded and left |

- **Strong play above its derived target: recorded and left, ruled 30 October 2026,** because the
  target is interpolated, not ruled. Maximum saving is already 11% above at month 24 (5,98,969
  against 5.4L) and adds about 40,000 a month through the opening, its salary restarted at month
  24 and its costs low; the opening adds D37's 50,000 bonus and two raises. The geometric line from
  5.4L assumes slow growth this early, so the gap is partly the target's shape.
- **D40, term insurance (v36), costs a saver money every month and cannot be avoided by choosing:**
  1 crore for 1,000, 50 lakh for 600, or 2,500 to the parents. Maximum saving takes 50 lakh for
  600. Scored at month 30 it has paid twice, so validation 1 barely moves: maximum saving scores 77.0
  (77.2 before) and 1 random player of 1,000 still scores above it, on the interpolated league
  benchmark (`ref` 59,460, `target` 7,23,545). The cost is real from month 29 on; month 30 shows
  little of it. The cover itself moves no bar: the term component counts only while `dependents`
  is above zero (§4), and nothing in the sheet can set `dependents` without an engine change. Open.
- **Validation 3, after D36-A went from 70,000 to 50,000 (v36), with chapter 1's shock windows
  unchanged:** D28's window passes, 0 of 7 prepared players at step 4 or 5. D30's still fails, 1
  of 5: seed 811 reaches family money in month 28. It began month 28 with nothing reachable, no
  cash, liquid fund or equity: salary had only restarted at month 27, after D32-A's trip, D35-A's
  80,000 and a liquid fund drawn down. With nothing reachable, any cash purchase goes to family
  money, so the laptop's price no longer decides it. D30's window runs to its month 30 callback,
  so it counts chapter 2's choices. Reported, not adjusted.
- **Validation 2: no new free lunch.** D38-B was flagged on v35's first run, a raise with weekends
  kept and no cost, and carries Life -1 for longer weekdays since; a content fix, not a target. The
  eight flags left are chapter 1's own.
- **Balanced holds no runway through the opening.** Its Safety reads 30, the cover points alone, at
  every month from 25 to 30. It comes out of the layoff on D29-C's freelance money with no cash.
- **Maximum saving takes D35-C, the payment plan.** Scored at month 30 it has paid 6 of 12
  instalments, 42,000 against 80,000 at once, so it looks cheaper than it is (84,000 in all). A
  scoring horizon effect, not a choice a saver would make with the whole plan in view.

## 14. Where I am not confident

Flagging these rather than stating them as settled.

| Item | Concern |
|---|---|
| Retirement fund rate and contribution rules, UNVERIFIED | `RETIREMENT_CONTRIBUTION_MONTHLY` (4,000) and `RETIREMENT_ANNUAL_RATE` (0.08) are placeholders chosen to be plausible, not checked against EPFO rules or the declared rate. The contribution is a flat amount, so it does not change with salary, which real contributions do. Your own handoff says getting this wrong destroys trust permanently. Check both against a primary source before any figure that uses them reaches a player. The export marks them UNVERIFIED and an engine test fails if that mark is removed without the test being changed on purpose |
| Tax model | The doc assumes a simplified deduction. Old versus new regime, slab boundaries and standard deduction all need verifying before Chapter 1 ships, for the same reason |
| Equity crisis haircut of 0.60 | Defensible as a design choice, not derived from anything. It may be too punishing. Test it |
| The 0.35 / 0.25 / 0.20 / 0.20 score weights | Chosen to satisfy your design rule in §11 and nothing more. Expect to move them once you see real play |
| Life drift of 0.12 | Entirely a feel number. It is the single constant most likely to need changing after the first playtest |
| Freedom above 100% committed is shown as it is | A player who reaches month 25 in debt with almost no income can have commitments of more than twice their income: Home reads "242% committed" beside an empty Freedom bar. That is deliberate. It is the true state the engine computes (§5), and capping or softening it would be the UI misstating the engine. The bar itself is clamped at 0; the figure beside it is not |
| The timeline shows cost by month, not by choice | The progress timeline shows each month's net-worth change and, for each choice, the result line the player saw. It does not put a figure against each choice. A month's change is the sum of every choice made in it, earlier choices still running, salary, living costs, returns and any shock, and the engine keeps no attribution of the change to the choice that caused it. A per-choice figure would be an attribution the UI invented. If one is wanted, it has to be an engine measure defined here first |
| Life is the one bar with no figure the player can see | Home shows the figure behind Safety (months of runway) and Freedom (share of income committed). Life has no number behind it: it is a score that drifts toward a baseline (§6), not a quantity in the player's life, and any words for it would be the UI writing copy. Its space on Home is left empty. A known gap: it needs either a content decision (words from the sheet) or a derived measure that means something to the player |
| Inflation at a flat 6% | Real inflation is lumpy. Flat is simpler and probably fine for 240 months, but it makes the late game slightly too kind |
| Small cap drift and sigma | The script's long-run 13% and `SMALL_CAP_ANNUAL_SIGMA` are chosen to be higher and much rougher than broad equity. Not derived from anything |
| Small caps falling alone | In months 17 to 22 small caps fall while broad equity stays mildly positive. Real small caps rarely fall that far on their own |
| All monthly drift values in §7 | Placeholder numbers chosen to produce the described regimes and the D20 callback. Calibrate against §13 |
| The market script has been patched twice to fit written copy | The months 11 to 12 dip was added so D16-A's early red months have a scripted direction. The whole small cap script was added so D20 has something to invest in and its month 22 callback has a fall to report. Both were deliberate. Recording them so the pattern is visible: if copy needs the market bent a third time, decide explicitly whether the copy or the market should give way |
| Social events and overwork | Both were plausible Life inputs and both were removed because nothing produced them. Adding them back needs a sheet column that tags options as social or overwork, and a stated rule for how long each counts |
| D28-A's "Costs down to 22,000" is still a stated term | It includes rent, so it depends on the player's path in exactly the way D28's 34,000 did, and it is still checked against the D02-B reference path. By the v12 ruling that made D28's figure `{monthly_costs}`, it is an outcome. Not changed, pending a ruling |
| Where a do-nothing player's Life sits | With `LEAK_DISCRETIONARY_SHARE` at 0 and the fixed yardstick, a do-nothing player's baseline is 51.6 at month 1 and at month 21, with or without rent, just below the middle of 55. Before step 7, at 0.4, it was 64.3 without rent and 58.2 with D02-B. `DISCRETIONARY_TARGET` and `CASH_LEAK_RATE` were deliberately left alone because both carry weight elsewhere |
| `NORMAL_LIVING_START` is read from words, not a figure | 20,200 comes from reading D04-B's "Two of the next four months will be tight" as a normal month sitting exactly at what a 12,000 transfer leaves. A different reading of "tight" moves it. It is not in the stated terms check because there is no number to check |
| The copy settled when monthly money starts | §10 said monthly money runs "from this month". The engine started it the month after, and D11-C's copy agreed: twelve EMI payments ending with "Final EMI paid" at month 18 only works if they run months 7 to 18. The doc was changed to match the copy (§10 rule 21). Rent is the one exception, starting in the same month |
| D07-B: the engine found a contradiction, and rule 16 caught the ruling that followed | D07-B's copy and its schema each looked correct on their own. The option said "One year fixed deposit" and "Locked for twelve months", the sheet said a 12 month term, and the callback said the FD was broken early at month 22. Only running the months showed the FD had already matured at month 16, so the penalty removed nothing. That is the reason the step 7 calibration harness matters: contradictions between copy, schema and timing do not show up by reading, only by running the maths across every path. The first fix was also wrong. v14 changed the term to 24 to keep the penalty, choosing the sheet over the copy, when rule 16 says a stated term in the copy wins. Rule 16 caught that error in the ruling, not only the engine's. v15 put the term back to 12 and rewrote the callback instead, because the callback was the part that did not match what happens: it now says the money sat locked for twelve months, with no penalty. The stated terms check now covers D07-B's term, so the same change would fail |
| The Python lesson-window test was deleted in v16 | `scripts/test_lesson_windows.py` checked the windows with Python's own gaussian. Once the engine's noise became the sum of uniform draws, that test was checking noise the game does not use, and passing it proved nothing about the game. `engine/test/market.test.js` runs the same 200 seed check through the engine itself |
| `GOLD_EQUITY_CORRELATION` of 0.2 | A judgement call. §7 wanted gold "weakly correlated with equity on purpose" and nothing defined how weakly. 0.2 is weak by intent, not derived from anything |
| No-cost EMI cost, settled in v17 | D11-C's copy priced the phone at 79,000 against 79,200 in EMIs, a hidden cost of 200, so a no-cost EMI looked almost free. The phone is now 73,000 in cash, a hidden cost of 6,200. 72,000 was considered, but its 9.1% markup would not have agreed with `NO_COST_EMI_MARKUP` at 8%, so 73,000, at 7.8%, was chosen. D22-A already agreed |
| Content gap: how long a card takes to clear | A card on minimum payments keeps 98.5% of its balance each month and takes 291 months to clear 40,000, about 24 years. That is true and it is the lesson, but nothing in Chapter 1 shows it. D17-C teaches that the balance barely moves, and its callback says so after six months, but the player never sees how long it actually takes. A later callback on D17-C or D28-C, or a later chapter decision, should surface the full length |
| D28-C's card partly undercuts the D17 refusal | D28-C gives a card, so a D17-D player who refused one at month 11 can still put the layoff gap on a card at month 22. That is realistic, because people apply for cards under pressure, but refusing the card at D17 now costs less than intended. Revisit when Chapter 2 introduces credit score consequences |
| D29-A is survivable within Chapter 1, for every housing choice | Chapter 1 ends at month 24. Across all 1,296 combinations of D02, D17, D24, D27, D28 and D29, with the option that moves the least money everywhere else, no player reaches `CARD_LIMIT` by month 24. The highest balance is 1,61,761, for D02-A, D17-C, D24-A, D27-B, D28-C and D29-B (1,71,081 before the D13 raise of v31). `engine/test/shocks.test.js` asserts this, so it stays true as content changes. Recovery after month 24 is a Chapter 2 problem: an unprepared D02-A studio player on D29-A reaches the limit at month 40, and an unprepared shared-flat player's cash peaks at month 49 and then falls, because costs keep inflating and Chapter 1 contains no raise or job change after D29. Chapter 2 needs one |
| A heavy spender can reach the card limit inside Chapter 1 | The test above covers housing and layoff paths only. Choosing the option that spends the most at every decision reaches `CARD_LIMIT` at month 13, and 1,971 of 5,000 random playthroughs reach it before month 24, mostly through large one-offs such as D14, D19 and D22-B taken without the cash. Whether that is too many is for step 7's calibration |
| D04-B needs a second sentence that does not depend on the savings figure | D04-B's deferred text is one sentence, "{total_saved} saved, but you borrowed back twice." When nothing was saved, the sentence drops and under rule 28 the callback does not happen at all. In 300 random playthroughs that was 58 D04-B players. That player, who set a 12,000 transfer and saved nothing, is exactly the one the lesson is for. A second sentence with no token, about borrowing back, would keep the callback for them. D04-A empties the same way, 69 times in 300, but it rewards saving, so skipping it for a player who saved nothing loses less |
| D16-A's month 24 callback shows a loss too often. Step 7 calibration target | Month 24 comes right after the months 17 to 22 fall (§7). On a path that keeps D16-A running, the balance is below the 70,000 put in on 72 of 200 seeds, 36%, with 3 to 12 red months out of fourteen and 7 the median. Seed 1 shows 65,000 on 70,000 with seven red. The Phase 0 sample was 78,000 with four red. **Target: the D16-A balance is above money put in at month 24 on at least 80% of seeds.** Chapter 1 is where a player decides whether investing is worth continuing, and closing it with a loss a third of the time teaches the opposite of the product's premise. Being down sometimes is honest and should stay. **The fix must come from the general drift level in months 13 to 30, not a new scripted bump.** A bump for this callback would be the third patch to the market script to protect a piece of copy, after the two recorded below. **Met, ruled 27 September 2026:** `EQUITY_ANNUAL_SIGMA` 0.16 to 0.13 and broad equity drift in months 13 to 30 from +0.9% to +1.2% a month, the general level of the whole regime, not a bump. 161 of 200 seeds, 81% |
| D29-B's 10 LPA, settled in v20; 10.5 LPA since v31, when the D13 raise made the base pay higher | The callback said 12 LPA, but its +25,000 on 41,300 is 66,300 in hand, and at D01's ratio of 52,000 to 41,300 that is 83,477 a month, 10.0 LPA. The copy changed to 10 LPA and the amount stayed. Matching 12 LPA would have needed +38,100, a 92% rise in pay, which would make waiting for D29-B far better than every other layoff choice. The stated terms check now covers it |
| D28-C borrows even with savings in the bank | By design, a D28-C player who waits for D29-B puts about 1,48,000 on the card at 3.5% a month while 3,00,000 sits in cash. That is the lesson, but it is a large hit to Net Worth for one choice. Watch it in calibration |
| **Step 7 baseline.** Everything that follows is measured against it | 1,000 random playthroughs on §12 as written at step 7. Month 24: median Net Worth -30,777. 93% of playthroughs reach family money, step 5 of the cascade, by month 24. 53% are at the 2,00,000 card limit at some month up to month 30, and 86% of the 619 players who ever held a card. Freedom is 0 for 94% of players. Safety is exactly 30, cover points with no runway, for 66%, and 30 is the p25, p50 and p75. At month 21: median Net Worth 53,420, Safety exactly 30 for 76%, Freedom 0 for 72%. The ruling quoted 84% maxing a card and Safety pinned for over 90%, which the run does not show. The figures here are measured. Rerun with `node calibration/run.js` |
| The month 21 targets are out of reach of §12 | Month 21 Net Worth is -1,56,205 at p10, 53,420 at the median and 2,21,443 at p90, against under 50k, 2.5L and 6L. No plausible §12 change closes it. Trial runs at month 24: `CASH_LEAK_RATE` 0 moves the median to -15,012, `LIVING_COSTS_START` 20,200 to 33,055, both together to 45,135. The cause is content: a random player takes about 2.3 lakh of one-off spending and 4.3 lakh of recurring costs by month 24, against about 3.4 lakh of room after living costs |
| Chapter 1's league scores at month 24 against month 21 benchmarks | §13's `ref` 50,000 and `target` 6,00,000 are the month 21 weak and strong targets. The month 24 targets are now under -65k and 5.4L. The league score was not part of the step 7 rulings, so it is unchanged |
| Validation 1 is not passable in Chapter 1. A content gap: nothing in Chapter 1 costs a saver money | At step 7 the maximum-saving player scored 78.2 at month 24 against the best random player's 73.6. After the leak share and yardstick fixes it is 77.5 against 73.5, and no random player scores higher. The §11 weights stay as they are: reweighting would hide the problem, not fix it. Life is ruled at O0. The lead is Net Worth alone: at month 24 it is worth 5.8 points, more than the whole 4.0 point lead, set out below this table. Ruled at step 7: marked not passable in Chapter 1, because no Chapter 1 decision costs a maximum saver real money. It goes live again when Chapter 2 introduces decisions with real money consequences for hoarding |
| Validation 2 fails: sixteen options cost nothing | At step 7 eleven options moved no bar down against skipping the decision: D01-A, D04-C, D05-C, D15-A, D15-B, D16-A, D17-A, D18-B, D20-C, D26-B, D30-C. Most are good choices the copy means to reward, such as D01-A's tax declaration. D15-A, D15-B and D16-A gain because allocated money does not leak, which is intended (§2.1). D16-A also costs no Safety, because the quiet path is broke by the layoff whether or not it invests. With `LEAK_DISCRETIONARY_SHARE` at 0 five saving options join them: D04-A, D07-A, D07-C, D14-B and D16-B. They used to cost a little Life, because saving shrank the leak that counted toward the baseline. Now saving costs no bar at all, which is the gap the open question on choices feeding Life has to close. Six more change nothing: D03-C, D09-C, D17-B, D17-D, D18-C, D21-B |
| Validation 3 is barely tested | Only 3 of 1,000 random players have 6 months of runway before the layoff, 1 before D30, and none before D13 at month 8. Those few, and the maximum-saving player (12.9 months before the layoff), never reach step 4. The test passes, but on almost no players, because random play is broke by month 22 |
| Validation 4 passes | Starting at month 10 ends ahead of month 40 on all 100 seeds. The medians at month 240 are 26,63,733 and 21,02,770, and the median gap between the two on the same seed is 5,42,662, 3.6 times the 1,50,000 more put in. The worst seed's ratio is 1.13. Whether that is obvious enough is a judgement, not a measurement |
| D16-B's callback claims something the player cannot see | "It grew exactly as promised. Inflation took most of it." is true in real terms, but the player only ever sees nominal Net Worth, which rises. Net Worth stays nominal, ruled at step 7: it is what a person recognises as their own money, and inflation is felt through what money buys, which the ledger shows through rising living costs. Real Net Worth would not change any ranking in any case, since every player at the same month is divided by the same index. A content decision for later, not an engine one: either the copy changes, or the concept card that unlocks at that moment explains real against nominal |
| Tax product rate, UNVERIFIED | `TAX_PRODUCT_ANNUAL_RATE` (0.05) is a placeholder. The copy for D18-A gives no return figure. The export marks it UNVERIFIED |
| Endowment and tax product compounding | Both convert `annual / 12` like deposits, so the endowment's stated 4.5% compounds to about 4.59% a year |
| Which savings count as committed | §5 counts savings into locked destinations and not liquid ones. A design choice, not derived from anything |

**Calibration review, 21 September 2026. Measured and proposed only: nothing in §12 or the
sheet changed.** Full report: `calibration/REPORT-2026-09-21.md`. Trials: `calibration/trial.mjs`.

*What moved since the step 7 baseline.* Nothing. The rerun on the current engine and sheet (v26)
is identical to the baseline, figure for figure.

| Measure | Step 7 baseline | Today |
|---|---|---|
| Month 21 median Net Worth | 53,420 | 53,420 |
| Month 24 median Net Worth | -30,777 | -30,777 |
| Reach family money (step 5) by month 24 | 93% | 93% |
| At the card limit by month 30 | 53% | 53% |
| Freedom 0 at month 21 and 24 | 72% and 94% | 72% and 94% |
| Safety exactly 30 at month 21 and 24 | 76% and 66% | 76% and 66% |
| Maximum saving, league score | 77.5 against best random 73.5 | 77.5 against 73.5 |
| D16-A above money put in at month 24 | 128 of 200, 64% | 128 of 200, 64% |

*The four player types, seed 1 (§13).* Medians over seeds 1 to 100 are within 1% of these for
Cautious, Spender and Maximum saving, and within 8% for Balanced.

| Player | Net Worth 21 | Safety 21 | Freedom 21 | Life 21 | Net Worth 24 | Safety 24 | Freedom 24 | Life 24 | League 24 |
|---|---|---|---|---|---|---|---|---|---|
| Cautious | 3,20,996 | 100.0 | 87.9 | 37.6 | 2,91,114 | 100.0 | 0.0 | 28.4 | 55.5 |
| Spender | -3,85,231 | 30.0 | 0.0 | 63.2 | -5,86,555 | 30.0 | 0.0 | 55.4 | 18.6 |
| Balanced | 2,05,317 | 39.2 | 14.9 | 51.2 | 1,13,245 | 30.0 | 0.0 | 41.7 | 27.3 |
| Maximum saving | 4,82,062 | 100.0 | 79.2 | 42.2 | 5,48,987 | 96.6 | 66.2 | 32.0 | 77.5 |

Read against the §13 targets, the types line up better than random play does. Spender sits
under the weak targets (-3.9L at 21, -5.9L at 24). Maximum saving sits on the strong month 24
target (5.4L) and under the month 21 one (6L). Balanced is the median player: 2.0L at 21 against
2.5L, Safety 44.8 at 21 against 45 (medians over 100 seeds), and 1.07L at 24 against 1.7L. The
targets read like people. Random play is the outlier, because it takes the expensive option at
D02, D10, D19 and D23 about two times in three.

*Where each step 7 problem comes from.* Marginal figures are Net Worth at month 24 from taking
each option with every other decision on its quiet option, against the quiet path (2,18,289),
seed 1.

| Problem | Caused by | Evidence |
|---|---|---|
| Median Net Worth far below target | **Random play first, then decisions, then the constants** | A random player takes the expensive option often. The mean option costs against the quiet path: D02 -95k, D19 -63k, D23 -47k, D06 -38k, D10 -23k, D14 -15k, D25 -14k, D08 -12k, D11 -12k. Balanced play reaches 2.0L at month 21. Constants move the median but cannot close it: the best single change reaches 1.08L at month 21 |
| 93% reach family money | **Decisions D02 and D10, meeting a constant.** Not random play, and mostly not the layoff | 67.5% of random players reach step 5 in month 1, every one of them on D02-A or D02-B (studio at 18,000, shared flat at 9,000). The game opens with 0 cash (`NET_WORTH_START`), D02's deposits are 20,000 and 12,000 and its copy never mentions them, so month 1 costs 60,600 (studio) or 43,600 (shared flat) against 41,300 of salary. Another 16% first arrive at month 6, on D10-A (60,000 for the wedding) or D10-B, with D11. Under 3% first arrive at the layoff. The quiet path never gets there |
| Safety stuck at 30 | **Random play, with decisions.** Not the constants | Safety is 30 when reachable money is 0. Cautious ends at 100 and maximum saving at 96.6, so the formula works. Balanced play holds 44.8 at month 21 and drops to 30 after the layoff. No constant unpins it: `SAFETY_TARGET_MONTHS` 3 changes nothing, and the best combination of the trials below still leaves 54% pinned at month 24 |
| Maximum saving beats everyone | **Decisions.** Already ruled: content, not passable in Chapter 1 | The saver's lead over the best random player is 4.0 league points, all of it Net Worth. Its largest gains against the quiet path are D04-B +59k, D29-A +43k, D15-A +33k, D26-A +25k, D16-B +18k and D05-A +17k, and D15-A and D16-B are validation 2 free lunches. Cautious takes none of the paying ones and finishes at 2.9L, a league score of 55.5, 22 points behind. Nothing in the constants makes saving cost |
| First investment down at month 24 | **The constants, through the market's noise.** Not a decision and not random play | It is measured on a fixed path. `EQUITY_ANNUAL_SIGMA` 0.16 is 4.6% a month of noise on a +0.9% drift, and 14 months is too short to average it out |

*Proposed fixes, ranked by how far each moves the month 24 median Net Worth.* Each trial is
1,000 random playthroughs on §12 as written except the one change. None is applied. Baseline:
median Net Worth 53,420 at month 21 and -30,777 at 24; step 5 by month 24 93%; Safety pinned at
30 at months 21 and 24, 76% and 66%; D16-A up 64%; the maximum saver's lead over the best
random player 4.0.

| # | Change | Median NW 21 | Median NW 24 | Step 5 | Safety pinned 21, 24 | Saver's lead | What it touches |
|---|---|---|---|---|---|---|---|
| 1 | `LIVING_COSTS_START` 22,600 to 20,200, the value of `NORMAL_LIVING_START` | 1,07,762 | 33,055 | 82% | 63%, 60% | 1.2 | Every month. Derived from D28 (§12), so the stated terms check has to pass before it is ruled |
| 2 | `LAYOFF_SEVERANCE_MONTHS` 1 to 2 | 53,420 | 16,987 | 92% | 76%, 61% | 1.6 | Month 24 only. D28 states one month's severance, so its copy changes too (rule 16) |
| 3 | `NET_WORTH_START` 0 to 40,000 | 98,394 | 14,037 | 75% | 67%, 62% | 1.4 | Month 1 step 5 goes from 68% to 0. The sheet README says Net Worth starts at 0, so the sheet changes. At 20,000: 75,954 and -9,349, step 5 82%, saver's lead 1.7 |
| 4 | `CASH_LEAK_RATE` 0.35 to 0.10 | 66,395 | -19,356 | 91% | 73%, 65% | 2.4 | Small. At 0: 70,334 and -15,012. §14 says the rate carries weight elsewhere |
| 5 | D02's three deposits removed (money_once 20,000, 12,000, 8,000). A sheet change | 51,911 | -33,215 | 87% | 75%, 66% | 3.6 | Month 1 step 5 goes from 68% to 0, and the median does not rise: family money is a 0% loan, so avoiding it costs the median a little |
| 6 | `SAFETY_TARGET_MONTHS` 6 to 3 | 53,420 | -30,777 | 93% | 76%, 66% | 2.8 | Nothing moves. Pinned players have no runway, so a lower target cannot help them |

*The D16-A target, separately, since nothing above moves it.* Every one of these leaves median
Net Worth within 1,000 of the baseline.

| Change | D16-A up at month 24 |
|---|---|
| `EQUITY_ANNUAL_SIGMA` 0.16 to 0.13 | 68% |
| `EQUITY_ANNUAL_SIGMA` 0.16 to 0.10 | 79% |
| Broad equity drift, months 13 to 30, +0.9% to +1.2% a month | 74% |
| Broad equity drift, months 13 to 30, +0.9% to +1.5% a month | 82% |
| `EQUITY_ANNUAL_SIGMA` 0.13 and drift +1.2%, months 13 to 30 | 81% |

The drift is not a §12 constant. It is the authored script in §7, so changing it means changing
`data/market-script.json`. This section already rules that the fix comes from the general drift
level, not a bump. Sigma 0.10 makes every equity holding's ride smoother, and drift +1.5% is 18
months at 19.6% a year, so the two-part change is the one that clears 80% without either.

*Combinations.* The median does not reach the month 24 target of 1.7L on constants alone.

| Change | Median NW 21 | Median NW 24 | Step 5 | Safety pinned 21, 24 | Saver's lead |
|---|---|---|---|---|---|
| Start cash 20,000 and leak 0.10 | 87,977 | 3,192 | 80% | 69%, 63% | 1.9 |
| Start cash 20,000, leak 0.10 and living costs 20,200 | 1,42,232 | 68,057 | 68% | 56%, 54% | -0.2 |
| D02 deposits removed, leak 0.10 and living costs 20,200 | 1,20,593 | 46,674 | 73% | 58%, 55% | 0.6 |

The last two rows are about the most that changing these constants can do, 40% of the month 24
target. They also let a random player outscore the maximum saver, which comes from lifting random
players, not from saving costing anything.

*Recommendation, for a ruling.* (a) Judge the targets against the four types instead of random
percentiles: weak is Spender, median is Balanced, strong is Maximum saving. No constant changes,
and it matches the targets better than random play does. (b) Give the player opening cash or
remove D02's unstated deposits, since month 1 is where two thirds of the 93% comes from. (c) Take
the D16-A fix from sigma 0.13 with drift +1.2% in months 13 to 30. (d) Leave Safety and
validation 1 alone: the first is random play, the second is ruled.

**Calibration rulings, 27 September 2026.** Four rulings on the review above. Full report:
`calibration/REPORT-2026-09-27.md`. Formula trials: `calibration/trial-formulas.mjs`, which
measures each option on a patched copy of the engine and never touches the engine itself.

| # | Ruling | Status |
|---|---|---|
| 1 | The §13 targets stay as written and are judged against the player types, not random play. Random play is secondary | Applied. §13 records it, and the report leads with the types |
| 2 | Saving costs nothing, and that is the real bug. Propose how deliberate saving should lower the Life baseline | Proposed below. L3-30 applied in the second set |
| 3 | Freedom reads 0 for 94% at month 24 because of the layoff, which makes the bar meaningless on the chapter report | Proposed below. F1 applied in the second set |
| 4 | Apply the D16-A fix: `EQUITY_ANNUAL_SIGMA` 0.13 and broad equity drift +1.2% in months 13 to 30 | Applied, §7 and §12. D16-A is up on 161 of 200 seeds, 81%, against the 80% target |

Review items (b), opening cash or D02's unstated deposits, and (d), leaving Safety and
validation 1 alone, have no ruling yet.

*Ruling 1: the targets against the player types.* Median over seeds 1 to 100, after ruling 4.

| Checkpoint | Weak target | Spender | Median target | Balanced | Cautious | Strong target | Maximum saving |
|---|---|---|---|---|---|---|---|
| Month 21 net worth | Negative to 50k | -3,87,728, in range | 2.5L | 2,02,203 | 3,20,996 | 6L | 4,51,110, below |
| Month 21 Safety | under 20 | 30.0, above | 45 | 45.9 | 100.0 | 75 | 100.0, above |
| Month 24 net worth | under -65k | -5,88,330, in range | 1.7L | 1,08,855 | 2,95,341 | 5.4L | 5,23,281, in range |
| Month 24 Safety | under 17 | 30.0, above | 39 | 30.0 | 100.0 | 65 | 96.6, above |

Net worth is met at both checkpoints except strong play at month 21, where Maximum saving is
25% under 6L. Two Safety findings, reported and not fixed:

1. **The weak Safety targets cannot be met by anyone who keeps the company health cover.**
   Health points (18) and term points (12, full while no one depends on the player) give 30
   with no runway at all. Under 20 needs a player to lose cover or take on a dependent without
   term cover. Spender sits at exactly 30.
2. **Strong play reads above 75 and 65** because Maximum saving holds full runway. Whether
   "above" the strong target is a miss is a judgement for the ruling, not a measurement.

*Ruling 4: what else the D16-A change moved.* Against the 21 September run, the same seeds.

| Measure | 21 September | Now |
|---|---|---|
| D16-A above money put in at month 24 | 128 of 200, 64% | 161 of 200, 81% |
| Random median Net Worth, month 21 and 24 | 53,420 and -30,777 | 54,250 and -30,752 |
| Random p90 Net Worth, month 24 | 1,64,188 | 1,66,142 |
| At the card limit by month 30 | 532 | 529 |
| Balanced, Cautious, Spender, median Net Worth at month 24 | 1,06,854, 2,95,093, -5,88,486 | 1,08,855, 2,95,341, -5,88,330 |
| Maximum saving, seed 1, Net Worth at month 24 | 5,48,987 | 5,22,913 |
| Maximum saving, league score, and lead over the best random player | 77.5, lead 4.0 | 79.1, lead 5.6 |
| Maximum saving, runway before the layoff | 12.9 months | 8.5 months |
| D16-A in validation 2, Net Worth gain | 15,217 | 18,449 |
| Validation 4, early SIP gap at month 240 | 5,42,662, 3.6 times the extra put in | 5,94,500, 4.0 times |

Every engine, text and calibration test still passes, including the four lesson windows over
200 seeds, and the browser run is still bit-identical. The one real change of behaviour is the
maximum saver. Its greedy search now takes D14-B, D16-C, D21-C and D30-B in place of D14-C,
D16-B, D21-B and D30-C. With better equity, keeping half the bonus invested beats keeping it
all as cash, and the Net Worth search ends lower but with more Freedom and Life, so the league
score rises. Two consequences worth knowing:

1. **It now takes D30-B, 5,000 into the scam,** because the loss lands at month 30 and the
   search reads Net Worth at month 24. That is a limit of the §13 definition, which looks no
   further than month 24, not a market effect.
2. **It reaches cascade step 3 at month 16,** selling some of its equity to pay D22-B's scooter
   in cash. Before, the same shortfall broke a deposit, step 2. Neither is a shock failure:
   validation 3 still has it at step 0 after the layoff and D30.

*Ruling 2: deliberate saving should lower the Life baseline.* The cause is as stated in the
ruling. Discretionary spending is living costs above a normal month, 2,400 at month 1 and about
2,645 at month 21 for every player, so no choice moves the baseline (§6). The baseline gives
40 at the floor and 51.6 for every salaried player. Saving options carry no Life cost of their
own: D04-A, D07-A, D07-C and D16-B have `life` and `def_life` of 0, and D16-A has +2. So saving
is free on all four bars.

Four ways to make money the player deliberately allocates to saving or investment come out of
discretionary spending. The baseline formula itself is unchanged. "Recurring saving" is every
saving commitment that pays this month, whatever its destination: D01-C, D04-A, D04-B, D05-A,
D16-A, D16-B, D21-C, D27-B and D27-C. The retirement credit on salary is not deliberate and does
not count.

| Option | Discretionary this month | New constant |
|---|---|---|
| L1 | Spending above normal, less recurring saving, rupee for rupee, never below 0 | None |
| L2-20 | Spending above normal, shrunk by the share of the yardstick saved: × (1 - saving / (0.20 × `reference_income`)), never below 0 | A full-saving share, 0.20 |
| L2-30 | As L2-20, with the whole band gone at 30% saved | The same, 0.30 |
| L3-30 | As L2-30, also counting one-offs into saving or investment (D07, D14-B, D14-D, D15, D18-A, D20-B, D30-A, D30-B), each spread over 12 months | The same, 0.30 |

Life for each type at months 21 and 24, seed 1. The medians over seeds 1 to 100 are the same
to one decimal, and the types' choices do not change, since none of them picks on Life except
Spender, which reads the sheet.

| Option | Cautious 21 | Cautious 24 | Balanced 21 | Balanced 24 | Spender 21 | Spender 24 | Max saving 21 | Max saving 24 |
|---|---|---|---|---|---|---|---|---|
| Now | 37.6 | 28.4 | 49.8 | 41.4 | 63.2 | 55.4 | 44.1 | 34.5 |
| L1 | 37.6 | 28.4 | 49.8 | 41.4 | 52.7 | 48.3 | 33.5 | 25.9 |
| L2-20 | 37.6 | 28.4 | 49.8 | 41.4 | 54.7 | 49.7 | 33.5 | 25.9 |
| L2-30 | 37.6 | 28.4 | 49.8 | 41.4 | 57.6 | 51.6 | 33.5 | 25.9 |
| L3-30 | 37.1 | 28.1 | 45.2 | 38.3 | 54.0 | 49.1 | 33.5 | 25.9 |

| Option | League score at 24: Cautious, Balanced, Spender, Max saving | Best random player | Saver's lead | Validation 1 | Validation 2, options that cost nothing | Random Life median, 21 and 24 | Random players at the Life floor, 21 and 24 |
|---|---|---|---|---|---|---|---|
| Now | 55.6, 26.9, 18.6, 79.1 | 73.5 | 5.6 | 0 of 1,000 above the saver | 16 | 51.6, 44.7 | 0%, 13% |
| L1 | 55.6, 26.9, 17.2, 77.4 | 71.8 | 5.6 | 0 | 13 | 41.4, 37.4 | 33%, 72% |
| L2-20 | 55.6, 26.9, 17.4, 77.4 | 71.8 | 5.6 | 0 | 13 | 42.5, 38.2 | 26%, 65% |
| L2-30 | 55.6, 26.9, 17.8, 77.4 | 71.9 | 5.5 | 0 | 13 | 43.8, 39.0 | 21%, 57% |
| L3-30 | 55.5, 26.3, 17.3, 77.4 | 71.9 | 5.5 | 0 | 8 | 42.0, 37.7 | 27%, 69% |

Validation 2 in detail. Life change against skipping the decision, through the last callback:

| Option | Now | L1 | L2-20 | L2-30 | L3-30 |
|---|---|---|---|---|---|
| D04-A, auto-transfer 6,000 | 0.0 | -6.2 | -4.4 | -2.9 | -2.9 |
| D04-B, auto-transfer 12,000 | -1.3 | -7.5 | -7.5 | -7.2 | -7.2 |
| D16-A, 5,000 into equity | +1.8 | -4.2 | -1.6 | -0.5 | -0.5 |
| D16-B, 5,000 into a deposit | 0.0 | -6.0 | -3.3 | -2.2 | -2.2 |
| D01-C, raise the retirement contribution | 0.0 | -10.4 | -3.1 | -2.1 | -2.1 |
| D05-A, endowment 3,000 | -0.6 | -10.3 | -3.9 | -2.8 | -2.8 |
| D07-A and D07-C, savings account and liquid fund | 0.0 | 0.0 | 0.0 | 0.0 | -1.1 |
| D14-B, pay half, keep half invested | +0.2 | +0.2 | +0.2 | +0.2 | -4.2 |
| D15-A, the gold | +0.4 | +0.4 | +0.4 | +0.4 | -2.6 |

Under L1, L2-20 and L2-30, D04-A, D16-A and D16-B stop being free lunches. L3-30 also removes
D07-A, D07-C, D14-B, D15-A and D15-B. The eight left under L3-30 are not saving: D01-A, D04-C,
D05-C, D17-A, D18-B, D20-C, D26-B and D30-C, mostly good choices the copy means to reward. D04-C,
"save whatever is left", saves by not spending rather than by allocating, so no option here
reaches it.

What the measurements show:

1. **Only players who commit to saving are touched.** Cautious and Balanced keep their Life
   under L1 and L2, because neither makes a recurring saving commitment before month 21.
   Cautious saves through D04-C, whatever is left, and waits at D16-C. Its one commitment,
   D27-B at month 21, runs into the layoff, where the baseline is the floor anyway. Maximum
   saving loses 10.6 Life at month 21 under every option, because it saves more than 30% of
   the yardstick and so reaches the floor in all four. Spender is hit too: it picks D05-A's
   endowment and D16-A for their authored Life, and both are recurring saving.
2. **None of them moves validation 1.** The saver's league score falls 1.7, but the best
   random player, seed 507, is itself a saver and falls by the same. The lead stays 5.5 to 5.6.
   The most any saver can lose is the band between 51.6 and the floor of 40, 11.6 baseline
   points, since spending above normal is only 2,400 to 2,645. It stays ruled not passable in
   Chapter 1.
3. **L1 is too blunt.** Almost any recurring saving is about as large as the 2,400 to 2,645
   band, so any saver drops to the floor at once. D01-C's 2,600 a month then costs more Life
   than D04-B's 12,000 (-10.4 against -7.5), only because it starts earlier. L2 is graded: a
   small saver loses a little.
4. **L3 reaches one-offs, but D07 has no unsaved choice.** Every D07 option puts the 20,000
   somewhere, so all four lose the same Life and D07 becomes no cheaper to answer one way than
   another. What L3 adds that matters is D14 and D15, investing a windfall instead of spending it.
5. **A small double count.** D04-B (-1, -1), D18-A (-1, -1), D21-C (0, -1) and D27-B (-1, 0)
   already carry an authored Life cost for saving, so under any option it counts twice. It is
   small beside the baseline effect. Whether those values stay is a content call for the product
   owner, flagged and not changed.

**Recommendation: L2-30.** It prices exactly what the ruling names, pay-yourself-first, in
proportion to how much is set aside. It needs one new §12 constant, and it clears the three
recurring-saving free lunches. L3-30 is the stronger option if investing a windfall should cost
Life too. Validation 1 moves under none of them, so it stays a content gap for Chapter 2.

**Was the O0 ruling wrong? Partly, yes.** O0 was right about spending, and that part stands.
Counting option spending in the baseline would count its Life twice, once in the `life` column
and again in the baseline. Recurring spending would also swamp anything the column can do. What
was wrong is the conclusion recorded with it in §6: "Nothing a player chooses moves the baseline
any more... That is intended." Spending's Life is carried by the `life` column. Saving has
almost none there: the plain saving options are authored at 0, and D16-A at +2. With the
baseline blind as well, saving was free by construction. The validation 2 row above had already
said so ("Now saving costs no bar at all, which is the gap the open question on choices feeding
Life has to close"). The ruling closed the question without closing that gap. The options here
do not reverse O0. They count saving, not spending, and that fits O0's own reading of the
baseline as a standard of living: money set aside before the month starts is money not lived on.

*Ruling 3: Freedom when there is no salary.* Today, with no salary, income is 0 and Freedom is
0 (§5). The layoff at month 22 reaches everyone, and D29's earliest restart, D29-A's, is at
month 24, so most players are at 0 at month 24. Cautious falls from 87.9 at month 21 to 0.

| Option | Freedom with no salary |
|---|---|
| F1 | The committed ratio against the last salary earned, `salary_net_last_job`, which already exists for Safety (§4) and includes raises folded in at the layoff |
| F2 | Frozen at its value in the last month with a salary |
| F3 | Not applicable. The chapter report shows no bar, and the league score spreads Freedom's 0.20 over the other three bars in proportion |

Seed 1. Medians over seeds 1 to 100 match to one decimal, except Balanced at month 24 under F1,
29.6.

| Option | Cautious 21 | Cautious 24 | Balanced 21 | Balanced 24 | Spender 24 | Max saving 24 | League at 24: Cautious, Balanced, Spender, Max saving | Random Freedom 0 at 24 | Random not applicable at 24 | Validation 2, cost nothing |
|---|---|---|---|---|---|---|---|---|---|---|
| Now | 87.9 | 0.0 | 36.0 | 0.0 | 0.0 | 74.9 | 55.6, 26.9, 18.6, 79.1 | 94% | . | 16 |
| F1 | 87.9 | 84.8 | 36.0 | 30.5 | 0.0 | 74.9 | 72.5, 33.0, 18.6, 79.1 | 82% | . | 15 |
| F2 | 87.9 | 87.9 | 36.0 | 36.0 | 0.0 | 74.9 | 73.1, 34.1, 18.6, 79.1 | 76% | . | 15 |
| F3 | 87.9 | n/a | 36.0 | n/a | n/a | 74.9 | 69.4, 33.6, 23.2, 79.1 | 27% | 67% | 16 |

Maximum saving is back in work at month 24 on D29-A, so it is untouched, and validation 1 does
not move under any option: 0 of 1,000 random players score above it. Spender stays at 0 under
F1 and F2 because it is over-committed against any salary. That is the bar working.

Freedom change in validation 2, against skipping the decision:

| Option | Now | F1 | F2 |
|---|---|---|---|
| D28-C, the gap on the card | 0.0 | -22.2 | 0.0 |
| D28-D, family covers it | 0.0 | +4.3 | 0.0 |
| D29-A, 5.8 LPA job | +27.8 | -2.3 | -8.2 |
| D29-B, wait for 10 LPA | +58.2 | +28.1 | +22.2 |
| D16-B, recurring deposit | 0.0 | -17.3 | -17.3 |

**Recommendation: F1.** It keeps the bar meaning what §5 says: how much of the player's pay is
already spoken for. It keeps moving on what the player does while out of work. Under F1,
D28-C's card balance costs 22 points of Freedom against skipping and D28-D's family money
gains 4. D28-B stopping a recurring deposit would raise it, since a paused commitment is not
committed. F2 holds the bar still through the whole layoff, so the D28 choices show nothing. D29 then reads honestly: D29-A's
lower pay leaves the player slightly less free than before the layoff, and D29-B's higher pay
more. F1 needs no new state and no new constant, and the league score is unchanged in form. F3
is the most literal, but it blanks the bar for two thirds of players on the chapter report, the
last screen they see, and needs a second scoring rule. F2 has a smaller cost: a stored value.
One copy question under F1, for the product owner: Home's "64% committed" beside Freedom would
then be a share of the last salary, not of this month's income, while there is none.

Nothing in §5, §6 or §12 changed for rulings 2 and 3 at the time. Both were applied later the same day, as L3-30 and F1, in the second set below.

**Calibration rulings, 27 September 2026, second set.** Five rulings on the proposals above.
Full report after them: `calibration/REPORT-2026-09-27b.md`. Opening cash trials:
`calibration/trial.mjs` with `"types": true`.

| # | Ruling | Status |
|---|---|---|
| 1 | Life and saving: L3-30 | Applied. §6, and `SAVING_FULL_SHARE` 0.30 and `SAVING_ONE_OFF_SPREAD_MONTHS` 12 in §12. The spread needs its own constant, since the engine holds no numbers of its own. §6 records that O0 was half right |
| 2 | Freedom: F1, and "64% of your last salary committed" while there is no salary | Applied. §5. The wording is in `text/render.js` (`formatCommitted`), not the UI |
| 3 | Weak Safety targets are wrong, not the content: 30 at months 21 and 24. Strong play above 75 and 65 is not a miss | Applied. §13 |
| 4 | Strong play at month 21, 4.5L against 6L: a content gap | Recorded, §13. Same missing content as validation 1 |
| 5 | D02's deposit is unstated, which breaks rule 16. State it, check it, then propose opening cash | Deposit stated in sheet v27 and checked. Opening cash proposed below, not applied |

*Rulings 1 and 2, measured together.* Seed 1, against the engine after the first set of rulings.

| Player | Life 21 | Life 24 | Freedom 21 | Freedom 24 | League 24 |
|---|---|---|---|---|---|
| Cautious, before | 37.6 | 28.4 | 87.9 | 0.0 | 55.6 |
| Cautious, now | 37.1 | 28.1 | 87.9 | 84.8 | 72.4 |
| Balanced, before | 49.8 | 41.4 | 36.0 | 0.0 | 26.9 |
| Balanced, now | 45.2 | 38.3 | 36.0 | 30.5 | 32.4 |
| Spender, before | 63.2 | 55.4 | 0.0 | 0.0 | 18.6 |
| Spender, now | 54.0 | 49.1 | 0.0 | 0.0 | 17.3 |
| Maximum saving, before | 44.1 | 34.5 | 85.2 | 74.9 | 79.1 |
| Maximum saving, now | 33.5 | 25.9 | 85.2 | 74.9 | 77.4 |

The two rulings touch different players. L3-30 takes 10.6 Life from Maximum saving at month 21,
9.2 from Spender (D05-A's endowment and D16-A are its picks) and 4.6 from Balanced (one-offs such
as D07 and D14). Cautious loses 0.5, because it saves by not spending. F1 gives Cautious back its
Freedom after the layoff, 84.8 in place of 0, and Balanced 30.5. Nothing else moved: Net Worth
and Safety are the same for every type.

| Validation | Before | Now |
|---|---|---|
| 1, no dominant strategy | Saver 79.1, best random 73.5, lead 5.6. 0 of 1,000 above | Saver 77.4, best random 71.9 (seed 507), lead 5.5. 0 of 1,000 above. Still not passable in Chapter 1 |
| 2, no free lunch | 16 options cost nothing. 6 change nothing | 8 cost nothing: D01-A, D04-C, D05-C, D17-A, D18-B, D20-C, D26-B, D30-C. 5 change nothing: D03-C, D09-C, D17-B, D17-D, D18-C |
| 3, shocks survivable | D28 3 prepared, D30 1, D13 none | The same |
| 4, compounding visible | Pass, gap 4.0 times | The same |

Random play: Life median 42.0 at month 21 and 37.7 at 24, from 51.6 and 44.7. Freedom 0 at
month 24 falls from 94% to 82%. What still pins most random players at 0 is over-commitment
against any salary, card minimums above all, which is the bar working.

*Ruling 5: D02's deposit.* Each D02 option charges a deposit in month 1, 20,000, 12,000 and
8,000, as `money_once` into a deposit asset. No copy mentioned it, which broke rule 16. Sheet v27
appends it to each option label: "The studio near office, 18,000, deposit 20,000", "Shared 2BHK,
9,000 your half, deposit 12,000", "Room 40 minutes out, 6,000, deposit 8,000". The deposits
themselves are unchanged. The stated terms check holds each figure to `money_once` (30 terms).
The wording was drafted by an assistant and approved as written by the product owner. D02 is a Phase 0 test
decision, so the Phase 0 export changed on purpose. The game's decision screen fits at 320, 360
and 390. The Phase 0 harness at 320 by 568 has not been rechecked.

*Ruling 5: opening cash, proposed and not applied.* Month 1 on each D02 option, before the leak:

| D02 option | Month 1 out: deposit + rent + living costs | Against 41,300 of salary |
|---|---|---|
| Studio | 20,000 + 18,000 + 22,600 = 60,600 | 19,300 short |
| Shared flat | 12,000 + 9,000 + 22,600 = 43,600 | 2,300 short |
| Room out of town | 8,000 + 6,000 + 22,600 = 36,600 | 4,700 over |

Today the game starts with 0 (`NET_WORTH_START`), so two of the three D02 options put the
player on family money in the first month. That is where 68% of random players first reach step
5. Three figures, each a plausible start for a 22-year-old in a first job:

| Figure | What it stands for |
|---|---|
| 20,000 | Help with the deposit, or a little saved from before. It is D02's largest deposit and just covers the studio's month 1 gap |
| 40,000 | About a month's take-home, saved from an internship or college |
| 60,000 | About a month and a half. A comfortable start |

Medians over seeds 1 to 100, on the engine with every ruling above applied.

| Opening cash | Balanced NW 21 | Balanced NW 24 | Balanced Safety 21 | Balanced Safety 24 | Cautious NW 21, 24 | Spender NW 21, 24 | Max saving NW 21, 24 | Random, family money by month 24 | Random, family money in month 1 |
|---|---|---|---|---|---|---|---|---|---|
| 0, today | 2,02,203 | 1,08,855 | 45.9 | 30.0 | 3,20,996, 2,95,341 | -3,87,728, -5,88,330 | 4,51,110, 5,23,281 | 93% | 68% |
| 20,000 | 2,46,232 | 1,61,774 | 67.8 | 38.4 | 3,42,072, 3,16,576 | -3,68,463, -5,69,167 | 4,72,281, 5,45,465 | 82% | 0% |
| 40,000 | 2,65,460 | 1,81,595 | 80.1 | 46.6 | 3,63,149, 3,37,811 | -3,48,074, -5,48,705 | 4,94,441, 5,69,824 | 75% | 0% |
| 60,000 | 2,80,338 | 1,95,738 | 81.4 | 47.4 | 3,84,226, 3,59,047 | -3,27,587, -5,28,205 | 5,16,425, 5,93,803 | 69% | 0% |

Life barely moves with opening cash. Maximum saving's Freedom at month 21 falls at 40,000 and
60,000, to 79.2 and 73.6 from 85.2, because its greedy search picks differently with more cash.
By type, family money by month 24: Spender on
every seed at every figure, since it takes the studio, the full wedding and more. Cautious,
Balanced and Maximum saving never, at any figure. The saver's league lead over the best random
player is 5.5, 4.1, 4.2 and 3.2.

What the trials show:

1. **Any opening cash ends month 1 family money.** 20,000 takes it from 68% of random players to
   0. Beyond that, extra cash only lifts players who were never in trouble.
2. **20,000 puts Balanced on the median targets.** 2.46L against 2.5L at month 21, 1.62L against
   1.7L at month 24, and Safety 38.4 against 39 at month 24. 40,000 and 60,000 overshoot Safety at
   month 21 (80.1 and 81.4 against 45) and move Net Worth past 1.7L at month 24. **Corrected when
   applied:** 20,000 overshoots Safety at month 21 too, 67.8 against 45, above the 20% band. It
   puts Balanced on the median targets for Net Worth at both checkpoints and for Safety at month
   24 only. This point first said "on the median targets" without that exception.
3. **Balanced gains more than the cash.** 20,000 adds 44,000 to Balanced at month 21, because
   the month 1 shortfall no longer triggers the cascade, and so no family debt. Spender gains
   19,000, about the cash itself: it still reaches family money later, through its own choices.
4. **Spender still reaches family money.** That is its choices, not the start, and it should.

**Ruled 27 September 2026: 20,000.** Not yet applied: first, where the player is told. **Recommendation, as proposed:** 20,000. It is the one figure that removes the month 1 problem without
lifting the median past its targets, and it has the plainest story: someone helped with the
deposit. Two things follow if it is ruled:

1. **Rule 16 applies to it.** A starting balance the player never hears about is the same
   problem D02's deposit was. The copy needs to say so, in D01 or D02 or on the landing screen.
   That is the product owner's copy to write.
2. **The sheet README says Net Worth starts at 0**, so the sheet changes with it, and Home's
   month 1 figure starts at the opening cash.

**Applied 27 September 2026, sheet v28.** The README's Starting net worth is 20,000. D02's
situation tells the player before the deposit is charged, in the product owner's words: "You
need a place. You have 20,000 saved from before. A studio near office is 18,000. A shared 2BHK
is 9,000 for your half. A room 40 minutes out is 6,000." Saved, not given by parents, because
D12, D19 and D23 are about family asking the player for money. A chapter that opens with
parents handing over 20,000 would soften all three, and it assumes a start not every player
has. The stated terms check holds the 20,000 to the README row (31 terms). The do-nothing
baseline rose from 3,00,877 to 3,22,113: the 20,000, plus 1,236 of savings interest on it.
Full report: `calibration/REPORT-2026-09-27c.md`.

| Target | Spender | Balanced | Cautious | Maximum saving |
|---|---|---|---|---|
| Month 21 net worth: negative to 50k, 2.5L, 6L | -3,68,463, in range | 2,46,232 | 3,42,072 | 4,72,281, below |
| Month 21 Safety: 30, 45, 75 | 30.0, in range | 67.8 | 100.0 | 100.0, above, not a miss |
| Month 24 net worth: under -65k, 1.7L, 5.4L | -5,69,167, in range | 1,61,774 | 3,16,576 | 5,45,465, in range |
| Month 24 Safety: 30, 39, 65 | 30.0, in range | 38.4 | 100.0 | 96.6, above, not a miss |

The median is bracketed by Balanced and Cautious on Net Worth at both months and on Safety at
month 24. Safety at month 21 was above: both types are over 45, Balanced at 67.8. The target was
then re-derived as 65 from three months of runway (§13), and Balanced is in range of it. The one miss
left in net worth is strong play at month 21, the recorded content gap. Random players reaching
family money by month 24: 82%, none of them in month 1. Validation 1: the saver 78.0 against the
best random 73.9, still not passable in Chapter 1. Validation 2: 8 options still cost nothing.
Validation 3 now has 6 prepared players at the layoff and 3 at D30, all passing.

**Rulings of 29 September 2026: sheet v31.** Applied: D03-C costs 5,000, spent. D13's appraisal
is real: D13-A and D13-C +3,304 a month, D13-B +3,904, salary changes from month 9. D26 quotes
the pay its options give, 9.5 and 7.3 LPA for a player who took D13-A, and no longer names
what staying pays. D29 keeps its amounts, so a shared-flat player still survives D29-A, and its
words follow the raise: 6.3 and 10.5 LPA. The stated terms check now holds D13's 8% and 1.5%,
and D26's and D29's LPA figures for a named pay path (37 terms, all passing). Rule 29, options
that cannot apply, is recorded in §10 and not yet built.

`engine/test/shocks.test.js` still passes: across all 1,296 housing and layoff paths no player
reaches the card limit by month 24, and the highest balance fell from 1,71,081 to 1,61,761,
because the raise leaves every path more money before the layoff.

*The calibration after v31* (`calibration/REPORT-2026-09-29.md`), medians over seeds 1 to 100:

| Target | Spender | Balanced | Cautious | Maximum saving |
|---|---|---|---|---|
| Month 21 net worth: negative to 50k, 2.5L, 6L | -3,29,334, in range | 2,77,329 | 3,71,138 | 5,15,966, in range |
| Month 21 Safety: 30, 65, 75 | 30.0, in range | 82.8, above | 100.0 | 100.0 |
| Month 24 net worth: under -65k, 1.7L, 5.4L | -5,26,674, in range | 1,95,553 | 3,48,027 | 5,98,969, in range |
| Month 24 Safety: 30, 39, 65 | 30.0, in range | 50.0, above | 100.0 | 95.8 |

Net worth: Balanced and Cautious now both sit above the median targets, so they no longer
bracket them, but Balanced is within 20% of both: in range. Strong play at month 21 is now in
range too, 5.16L against 6L, where it was the recorded content gap. Random players reaching family
money: 79%. Validation 1: the saver 79.4 against the best random 75.8, still not passable in
Chapter 1. Validation 2: 8 options cost nothing; D03-C no longer changes nothing, so 4 do.
Validation 3: 10 prepared players at the layoff and 6 at D30, all passing.

*Safety targets, derived from months of runway. Applied 29 September 2026 (§13).* Safety is 30 cover points
plus runway points: 70 × months of runway / 6. The derivation is set out first; where Balanced
lands follows it and was not used to set it.

1. **Month 21, median.** 65 was three months of runway for a player whose pay never rose. The
   raise adds 3,304 a month for the 13 months from month 9 to month 21: 42,952. Assume the
   median player keeps half of new money, 21,476, and spends the rest; that half is the one
   judgement in the derivation. A month of essential costs after month 21, on the reference
   path (the shared flat, every other decision on its quiet option), is 32,393: 12,893 of
   minimum living and 19,500 of commitments, from `explainSafety`. So the raise buys 21,476 /
   32,393 = 0.66 of a month. Three months becomes 3.7. **Target: 30 + 70 × 3.7 / 6 = 73.**
2. **Month 24, median.** The product owner ruled 39 fair after the layoff: three months at month
   21 becomes 0.8 at month 24, so the layoff uses 2.2 months of runway. It uses the same months
   now. 3.7 - 2.2 = 1.5 months. **Target: 30 + 70 × 1.5 / 6 = 47.5, so 47.**
3. **Strong play.** Strong must stand above the median, and 75 at month 21 no longer does. Strong
   play holds the full `SAFETY_TARGET_MONTHS`, six months: **100 at month 21.** After the same
   2.2 months of layoff, 3.8 months: **30 + 70 × 3.8 / 6 = 74 at month 24.**
4. **Weak play** stays 30: the cover points, the floor for anyone who keeps the company cover.

| Target | Now | Proposed | Months of runway |
|---|---|---|---|
| Month 21 median | 65 | 73 | 3.7 |
| Month 24 median | 39 | 47 | 1.5 |
| Month 21 strong | 75 | 100 | 6 |
| Month 24 strong | 65 | 74 | 3.8 |

With half of the raise kept as the judgement, other readings move the month 21 median: keeping
none of it leaves 65; keeping all of it gives 4.3 months, 80.

Measured against the proposal, after it was set: Balanced 82.8 at month 21 is within 20% of 73,
and 50.0 at month 24 is within 20% of 47, so both would read in range. Maximum saving, 100 and
95.8, would read in range of strong at month 21 and above it at month 24.

**Step 7: the maximum-saving player's four bars, as first measured.** Seed 1, against the
median of 1,000 random players, before the leak share went to 0 and before the fixed
yardstick. The corrected figures are in the next block.

| Player | Month | Net Worth | Safety | Freedom | Life | Life baseline |
|---|---|---|---|---|---|---|
| Maximum saving | 21 | 4,82,062 | 100.0 | 79.2 | 43.0 | 55.7 |
| Random median | 21 | 53,420 | 30.0 | 0.0 | 52.2 | 51.7 |
| Maximum saving | 24 | 5,48,987 | 96.6 | 66.2 | 35.1 | 49.1 |
| Random median | 24 | -30,777 | 30.0 | 0.0 | 48.6 | 53.4 |

Life is the bar that should punish maximum saving, and its baseline does not. At month 21
the saver's baseline, 55.7, is above the random median's 51.7 and above the §6 middle
target of 55. The baseline reads discretionary spending: living costs above a normal month,
about 2,645 at month 21 and the same for everyone because living costs are fixed, plus 40%
of the leak. The saver has a surplus, so some of it leaks, and the leak counts as a life
being lived. A broke random player has nothing to leak. So the baseline rewards the saver for
money it never chose to spend.

The saver's Life still falls, from 57.5 in month 1 to 35.1 at month 24, but through the
options' own Life effects, which sum to -43 across its 30 choices, not through the baseline.
At a weight of 0.20, a Life 13.5 points below the random median at month 24 costs 2.7 points
of league score, against a Net Worth index of 96.4. Trial runs of `LIFE_DRIFT` 0.25,
`DISCRETIONARY_TARGET` 0.25, and `LIFE_DISCRETIONARY_WEIGHT` 45 with `LIFE_BASELINE_FLOOR`
25 all leave the saver on top.

**Step 7: how a player's own choices could feed Life. Ruled O0.** Option spending does not
feed the baseline. The baseline stays a description of standard of living, and choices move
Life only through the `life` column, which is authored and visible.

**Why O1 to O4 were rejected.** Under every one of them, recurring spending outweighs anything
the `life` column can do. D06-A's 5,000 a month on lunches delivers 19.2 points of Life through
the baseline under O2, and 33.0 under O1, against a `life` value of 2. Cutting that value to 0
still leaves eating out daily the strongest Life choice in Chapter 1. A recurring spend keeps
the baseline raised every month it runs, and over 240 months that compounds, while a one-off
is spread over at most 12. No cut to a life column can offset that. The measurements behind
the ruling follow.

Measured after the leak share went
to 0 and after the two denominator bugs were fixed (§6): the ratio now divides by a fixed
yardstick, and a player with no salary sits at the floor. With both fixes every salaried
player has the same baseline, 51.6, so the maximum-saving player's baseline at month 21 rose
from 48.6 to 51.6: part of its low baseline had been D26-A's raise. Nothing a player chooses
moves the baseline yet.

Five options, measured on the same 1,000 random playthroughs and the maximum-saving player by
re-running Life over each month the engine recorded. For O0 the re-run reproduces the
corrected engine's Life and baseline exactly, for all 1,001 players. No engine logic or §12
value changed to measure them.

| Option | What counts as discretionary, on top of living costs above normal |
|---|---|
| O0 | Nothing. As ruled |
| O1 | Money classed `spent` from Temptation decisions, in the month it is paid: one-offs, callbacks and monthly costs |
| O2 | As O1, with each one-off spread evenly over 12 months |
| O3 | All money classed `spent`, from every decision, in the month it is paid. Includes rent, premiums and family obligations |
| O4 | As O2, adding Obligation decisions: money given to family |

| Option | Saver Life, 21 | Saver baseline, 21 | Median Life, 21 | Median baseline, 21 | Saver Life, 24 | Saver baseline, 24 | Median Life, 24 | Median baseline, 24 | Saver league score, 24 | Top random score, 24 | Random at ceiling, 21 | Random at ceiling, 24 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| O0 | 42.2 | 51.6 | 51.6 | 51.6 | 32.0 | 51.6 | 44.7 | 40.0 | 77.5 | 73.5 | 0% | 0% |
| O1 | 44.2 | 51.6 | 61.8 | 70.0 | 33.4 | 51.6 | 52.3 | 40.0 | 77.8 | 75.7 | 60% | 26% |
| O2 | 45.0 | 56.0 | 65.5 | 70.0 | 34.5 | 56.0 | 54.4 | 40.0 | 78.0 | 76.1 | 68% | 28% |
| O3 | 59.3 | 70.0 | 68.8 | 70.0 | 45.9 | 70.0 | 57.0 | 40.0 | 80.3 | 76.3 | 100% | 33% |
| O4 | 45.0 | 56.0 | 67.9 | 70.0 | 34.5 | 56.0 | 56.3 | 40.0 | 78.0 | 76.2 | 97% | 32% |

In every row the top random player is seed 507, and no random player scores above the saver.
The median baseline at month 24 is 40 in every row because most random players have no salary
at month 24, so they sit at the floor whatever they spend.

What the corrected measurements show:

1. **O1, O2 and O4 separate the saver from the median at month 21**, by 17.6, 20.5 and 22.9
   Life points, against 9.4 under O0. O3 does not, because counting rent lifts the saver to
   the ceiling too.
2. **None of them passes validation 1 on its own.** The top random player is a near-saver
   itself. Under O2 its Life at month 24 is 56.8 against the saver's 34.5, and it still scores
   76.1 against 78.0. The saver's lead comes from Net Worth, Safety and Freedom.
3. **Counting spending saturates the baseline.** Under O1 60% of random players sit at the
   ceiling at month 21, under O2 68%, because `DISCRETIONARY_TARGET` of 15% was set for the
   above-normal tier alone. Any option that counts spending needs the target recalibrated,
   a §12 change.

**The double count, and how much the life values would need to fall.** Counting an option's
spending in the baseline while keeping its `life` column counts its Life twice (§0). To size
it, each spending option's baseline effect is converted to life-column points. A baseline
raised by b for one month adds `LIFE_DRIFT × b` to Life, which then decays like any option
effect, so an option's equivalent is `LIFE_DRIFT` × the sum, over the months to month 24, of
how much its own spending raised the baseline. Averaged over the random players who chose it:

| Option | Label | `life` + `def_life` now | O1 | O2 | O4 | Proposed `life` under O2 |
|---|---|---|---|---|---|---|
| D06-A | Join every day | 2 + 0 | 33.0 | 19.2 | 5.8 | 0 |
| D06-B | Twice a week | 1 + 0 | 17.1 | 13.5 | 4.8 | 0 |
| D10-A | Go, do it properly | 3 + 1 | 0.7 | 12.2 | 2.6 | 0 |
| D10-B | Go, but train and shared room | 2 + 1 | 0.8 | 8.2 | 2.3 | 0 |
| D25-A | Attend all four | 3 + 0 | 0.9 | 2.4 | 0.1 | 1 |
| D25-B | Pick the two closest to you | 1 + 0 | 0.9 | 1.5 | 0.1 | 0 |
| D27-A | Upgrade the flat | 2 + 0 | 1.1 | 0.4 | 0.0 | 2 |
| D27-C | Split it half and half | 1 + 1 | 0.3 | 0.1 | 0.0 | 1 |
| D22-C | Keep taking autos | -1 + 0 | 3.1 | 2.4 | 0.1 | -1 |
| D10-C | Skip it, send a gift | -3 + -1 | 0.9 | 2.0 | 0.7 | -3 |
| D11-A | Repair it, 3,000 | -1 + 0 | 0.0 | 0.6 | 0.2 | -1 |
| D25-C | Send gifts to all four, attend none | -2 + -2 | 0.8 | 0.8 | 0.0 | -2 |
| D08-A | Lend the full 25,000 | 1 + -2 | not counted | not counted | 2.9 | 1 |
| D08-B | Give 10,000 and call it a gift | 0 + 1 | not counted | not counted | 1.5 | 0 |
| D12-A | Pay the full 8,000 | 2 + 0 | not counted | not counted | 0.3 | 2 |
| D12-B | Pay half, ask her to tell your parents | 1 + 1 | not counted | not counted | 0.2 | 1 |
| D14-A | Give her the full coaching fee, 80,000 | 2 + 1 | not counted | not counted | 1.5 | 2 |
| D14-B | Pay half, keep half invested | 1 + 0 | not counted | not counted | 1.5 | 1 |
| D14-D | Spend a third on a trip, invest the rest | 2 + -1 | not counted | not counted | 1.4 | 2 |
| D19-A | Pay the full 1.4 lakhs | 2 + 2 | not counted | not counted | 0.6 | 2 |
| D19-B | Send 50,000 and tell them that is what you have | 0 + 1 | not counted | not counted | 0.4 | 0 |
| D23-A | Take over the full 14,000 EMI | 2 + 1 | not counted | not counted | 0.2 | 2 |
| D23-B | Take half, 7,000 | 1 + 1 | not counted | not counted | 0.3 | 1 |

The proposed column applies one rule under O2: lower a positive immediate `life` by its
equivalent, rounded, never below 0. `def_life` is left alone, because a callback is a
consequence that comes later, not the pleasure of the spending. A negative `life` is left
alone, because it is the cost of going without, not a reward for spending. Obligation options
keep their values under O2, since O2 does not count their money.

What the double count table shows:

1. **The column cannot absorb it for recurring spending.** Under O2, D06-A's lunches deliver
   19.2 points of Life through the baseline against a `life` of 2. Setting the column to 0
   still leaves D06-A the strongest Life choice in Chapter 1, because 5,000 a month keeps the
   baseline raised for twenty months. A recurring cost counted in the baseline outweighs any
   one-off column value. Under O4 the same lunches are worth 5.8, lower only because other
   spending has already pushed the player to the ceiling.
2. **Spreading changes which options it hits.** Under O1 a one-off lifts one month and is
   worth under 1 point, so trips and weddings barely double count and lunches dominate. Under
   O2 the 60,000 trip in D10-A is worth 12.2 points, so its `life` of 3 would go to 0.
3. **The sizes depend on saturation.** An option's equivalent is small whenever the player is
   already at the ceiling for other reasons. If `DISCRETIONARY_TARGET` is recalibrated, every
   figure in this table moves and has to be measured again before any `life` value changes.

**Step 7: what drives maximum saving's lead in the league.** With Life settled at O0, the
maximum-saving player still tops the league. Each score broken into its four parts, §11,
against the best random player at that month. Month 21 is scored with the month 24 `ref` and
`target`, the only Chapter 1 benchmark (§13).

| Month | Player | Net Worth | NW index | Net Worth part, 0.35 | Safety | Safety part, 0.25 | Freedom | Freedom part, 0.20 | Life | Life part, 0.20 | Score |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 21 | Maximum saving | 4,82,062 | 91.2 | 31.9 | 100.0 | 25.0 | 79.2 | 15.8 | 42.2 | 8.4 | 81.2 |
| 21 | Best random, seed 612 | 2,95,868 | 71.5 | 25.0 | 100.0 | 25.0 | 77.6 | 15.5 | 46.6 | 9.3 | 74.9 |
| 21 | Saver's lead | 1,86,194 | 19.6 | **6.9** | 0.0 | 0.0 | 1.6 | 0.3 | -4.4 | -0.9 | 6.3 |
| 24 | Maximum saving | 5,48,987 | 96.4 | 33.7 | 96.6 | 24.1 | 66.2 | 13.2 | 32.0 | 6.4 | 77.5 |
| 24 | Best random, seed 507 | 3,63,514 | 79.8 | 27.9 | 95.1 | 23.8 | 65.2 | 13.0 | 43.7 | 8.7 | 73.5 |
| 24 | Saver's lead | 1,85,472 | 16.6 | **5.8** | 1.5 | 0.4 | 1.0 | 0.2 | -11.6 | -2.3 | 4.0 |

What it shows:

1. **The lead is Net Worth, and only Net Worth.** It is worth 6.9 points at month 21 and 5.8 at
   month 24, more than the whole lead. Safety and Freedom together add 0.3 and 0.6. Life takes
   0.9 and 2.3 away. The saver has the highest Net Worth part of all 1,000 random players at
   both months.
2. **Safety and Freedom cannot tell the two apart.** Both players are at or near the top of
   both bars. At month 21 both have Safety of 100: the saver's 12.9 months of runway earns no
   more than 6. Safety and Freedom are capped, so saving beyond the cap is neither rewarded nor
   punished by them.
3. **The log scaling in §11 is not the cause. It narrows the lead.** On a straight line from
   `ref` to `target` the saver's Net Worth index would lead by 33.9 and 33.7, not 19.6 and
   16.6, and the whole score lead would be 11.3 and 10.0 instead of 6.3 and 4.0. The log gives
   less for each extra rupee, which is already working against the saver.
4. **The best random player is itself a saver.** Seed 612 at month 21 and seed 507 at month 24
   both hold full Safety and high Freedom. The competition at the top is between two savers,
   and the one who saved more wins on Net Worth.
5. **What Life would need to do.** For the best random player to draw level at month 24, the
   saver's Life would have to fall a further 20 points, from 32.0 to about 12, with no other
   change. Under O0 Life already sits 11.6 points below that player.

Nothing in §12 or the §11 weights was changed to measure this.

**Step 7: the Net Worth index curve at Chapter 1's `ref` and `target`.** §11 with `ref`
50,000 and `target` 6,00,000, against a straight line between the same two points:

| Net Worth | `nw_index`, §11 log | Straight line |
|---|---|---|
| 50,000 | 0.0 | 0.0 |
| 1,00,000 | 27.9 | 9.1 |
| 2,00,000 | 55.8 | 27.3 |
| 3,00,000 | 72.1 | 45.5 |
| 3,63,514, best random player at month 24 | 79.8 | 57.0 |
| 4,00,000 | 83.7 | 63.6 |
| 5,00,000 | 92.7 | 81.8 |
| 5,48,987, maximum-saving player at month 24 | 96.4 | 90.7 |
| 6,00,000 | 100.0 | 100.0 |

The log compresses the top. The step from 1 to 2 lakh is worth 27.9 points and the step from
5 to 6 lakh is worth 7.3. The saver's 1,85,472 more Net Worth, 51% more than the best random
player, is worth 16.6 index points on the log and would be worth 33.7 on a straight line. So
the log is not creating the saver's advantage. It is already halving a real gap.

**Step 7: no decision in Chapter 1 puts a money cost on maximum saving. The dominant strategy
is a content gap, not a scoring bug.** Every one of the maximum-saving player's 30 choices was
checked for an actual cost, money it loses, not Life:

| What the saver does | What it costs in money |
|---|---|
| Refuses family and friends: D08-C, D12-C, D14-C, D19-C, D23-C, D30-C | Nothing. Each costs Life only. D19-C's family take a loan against their house and D14-C's cousin loses her seat, but no rupee ever comes back to the player |
| Skips social spending: D06-C tiffin, D10-C wedding gift, D25-C gifts instead of attending | Only the small gifts it chooses to send. The missing out is Life only |
| Skips cover: D09-B, D21-B | D09-B's dengue bill is covered by the company policy, so nothing. D21-B waits for term cover and pays 900 a month more when it buys, the one real money cost on the path, and a cost of waiting, not of saving |
| Holds cash and low-return savings: D04-B, D05-A endowment at 4.5%, D16-B deposit | Nothing on the score. Net Worth is nominal, so the 6% inflation that D16-B's callback says "took most of it" never lowers Net Worth. A low return still adds to it |
| Buys assets that hold value: D15-A gold, D22-B scooter in cash, D18-A tax product | Nothing lost on Net Worth: the money becomes a holding or an asset. D22-B's callback, "a scooter and no runway", has no bite for a player with 12.9 months of runway |

There is no decision in Chapter 1 where hoarding money loses money. Refusing to help costs a
relationship but never rupees, idle cash is not eroded in the number the score reads, and no
opportunity passed up has a price. So validation 1 is measuring something Chapter 1 cannot
pass yet: a maximum-saving player tops a league of random players because nothing it refuses
ever costs it money. That is a content gap, for Chapter 2. The score is reading the content correctly. Fixing it
belongs in content with real money consequences, not in the score, and not in Life values
written to lose a test, which was ruled out at step 7. It stays true whatever is decided about
reporting Net Worth in real terms, which is a separate question.

**Deliberate. Do not fix.** These look like mistakes and are not.

| Item | Why it stays |
|---|---|
| D17-B gets no card | Its callback closes the card for non-use by month 20, before the layoff. The card sat unused in a drawer, so there is nothing to borrow on. Ruled correct at v19 |
| The colleague's 40% in D20 is true | The small cap script really did return about 40% in the year to month 14. The lesson is not that he lied. It is that last year's return says nothing about next year's, and that he stops mentioning it once it turns |
| The small cap bottom lands on the layoff month | Month 22 is both the bottom of the small cap fall and the D28 layoff. A D20-A player who needs cash sells small caps at the bottom once gold and equity are gone (§9 step 3), and a D20-A player gets there fast. The two lessons are meant to stack |
| Step 3 sells gold before small caps | This softens D20. A D20-A player who also holds gold (D15-A, D15-B) raises cash from gold first and may never have to sell small caps at the month 22 bottom. Kept deliberately: the order follows the §4 haircuts, so Safety's estimate and the cascade agree. The alternative is to sell the most fallen asset first, measured against what was paid in, which is what most people actually do under pressure, and which would put D20-A's small caps first in the queue. Worth knowing when choosing: studies of ordinary investors also find the opposite habit, holding losers and selling winners, so neither order is the one true behaviour |
| Lesson windows damp noise and never clamp it | At `NOISE_DAMPING` 0.25 a lesson can still reverse on a rare seed. Measured in the engine's own market over 2,000,000 seeds: 169 reversals for `D16A_EARLY_RED`, about 1 in 12,000, and 122 for `D20_SMALL_CAP`, about 1 in 16,000. Neither crash window reversed once. The earlier figures of 1 in 10,000 and 1 in 17,000 assumed a true gaussian, which the engine does not use. Do not clamp. A clamped market is a market that never surprises, and the failure rate is low enough that the honesty is worth more |
| The noise is bounded at plus or minus 6, and that is not a clamp | The §7 noise can never go beyond plus or minus 6 standard units, so an extreme month is impossible where a true gaussian would allow it once in a very long while. That bound is a side effect of making the market bit-identical in every browser, not a decision to stop the market surprising. It limits single months, not lessons: windows still reverse at the rates above. It does not reverse the damp-never-clamp ruling |
| `LIFE_DISCRETIONARY_WEIGHT` stays at 30, and the §13 Life targets moved instead | The baseline runs from `LIFE_BASELINE_FLOOR` 40 up to 40 + 30 = 70. The old targets of under 30, 60 and 75 were written for the first draft's baseline of 25 to 85, before its social and overwork terms were removed. Holding 75 on a 70 baseline needs +0.68 Life every month for 240 months, and holding under 30 needs -1.36 every month against an average Chapter 1 option of -0.23. The targets moved to 40, 55 and 68. Raising the weight to get back to 85 was rejected: it makes discretionary spending the only route to Life, so the bar would reward spending instead of living, which inverts what it is for |

---

## 15. Build phases

| Component | Phase |
|---|---|
| Ledger, monthly order of operations | MVP |
| Net Worth, Safety, Freedom, Life formulas | MVP |
| Scripted market for months 1 to 24 | MVP |
| Debt engine, no-cost EMI modelling | MVP |
| Shock cascade | MVP |
| Sheet columns, §10 | Done. First complete in `chapter1_decisions_v10.xlsx`, columns added through v26, the current sheet |
| Full 240 month market script | Phase 1 |
| League score | Phase 1 |
| Credit score model | Phase 1 |
| Property, home loan | Phase 2 |
| 1,000-run calibration harness | Phase 1, but build the hooks in MVP |
| New Game Plus difficulty modifiers | Phase 3 |
