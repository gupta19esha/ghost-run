// The long version of each of the chapter's twenty concept cards, which opens when a player taps a
// collected idea (game/screens/ideas.js). The short cards stay the sheet's, shown at month close.
//
// Written by hand, not by a model: the concepts are fixed and the same for every player. They
// explain the board, never the moves, and read the same whatever was chosen. Every figure is the
// engine's, and each is held to it by scripts/check_stated_terms.py (rule 16), which reads this file
// as JSON from the first brace. {runway} is the one figure that is the player's own: their runway
// on the morning of month 22, filled by game/ideas.js.
//
// Keyed by the month whose card it deepens. Each title is that card's title.

export default {
  "1": {
    "title": "EPF",
    "paragraphs": [
      "The Employees' Provident Fund. A slice of every salary goes into a retirement account before the rest reaches you, and your employer puts in the same amount again.",
      "It is part of why the letter said 52,000 and the bank said 41,300. Tax and other deductions come out of that gap too. The EPF share is not spent, though. It is still yours, held where you cannot easily reach it.",
      "In this game the fund counts toward net worth and not toward Safety, because money you cannot reach does not help in the month the salary stops. Raising your contribution puts more there, and it counts against Freedom, because it leaves every salary before you see it.",
      "That is the point of it: hard to touch, so it is still there decades later. It is also why it cannot be an emergency fund."
    ]
  },
  "2": {
    "title": "Pay yourself first",
    "paragraphs": [
      "Saving at the start of the month instead of the end. The transfer goes out on salary day, before anything else can claim the money, and the month is lived on what is left.",
      "The difference is not discipline. Money left in an account does not sit still. It goes on small things nobody decides on: a delivery, a cab, a top-up. By the end of the month it is gone, and nothing in particular bought it.",
      "The game works the same way. At the end of each month, 35% of that month's money that was not paid out or moved anywhere leaks away. Money moved on salary day does not leak, so a transfer of 6,000 or 12,000 is saved in full. “Whatever is left at month end” meets the leak first.",
      "Same salary, same month, a different amount saved. The only difference is the order."
    ]
  },
  "3": {
    "title": "Insurance is not investment",
    "paragraphs": [
      "A policy that promises cover and returns in one product. It sounds like two good things at once. It usually does both jobs worse than either done alone.",
      "Cover is protection: a sum paid to the people who depend on you if you die. Investment is growth. A mixed product puts part of each premium toward each, takes its costs out of both, and pays back a return that rarely matches either.",
      "The policy offered in month 3 was 3,000 a month, paying out after 20 years. In this game it returns about 4.5% a year, where a recurring deposit returns about 6.5%. And because stopping it costs you the policy, its 3,000 counts against Freedom for every month it runs."
    ]
  },
  "4": {
    "title": "Emergency fund",
    "paragraphs": [
      "Money whose only job is to be there. Not to grow. To be reachable in the week something goes wrong.",
      "In month 4 the same 20,000 could go four places. A savings account pays about 3% a year. A one year fixed deposit pays about 6.5%, and breaking it early costs 5%. A liquid fund pays about 5.5%. Cash at home pays nothing.",
      "The Safety bar counts all four as reachable, the deposit after the 5% it would cost to break. So on Safety they sit close together. What separates them is what each earns while it waits, and how quickly it turns into money you can spend.",
      "An emergency fund is judged on the day it is needed, not on its return. The rest of the time it is money doing very little, on purpose."
    ]
  },
  "5": {
    "title": "Health cover",
    "paragraphs": [
      "Insurance that pays a hospital bill. The bill arrives without warning, and it is sized by what happened, not by what you have saved.",
      "In month 5 the company covered you for 3 lakhs, and offered 5 lakhs more for 450 a month. Cover that comes with a job lasts as long as the job.",
      "Health cover is part of the Safety bar, and that part is full once cover reaches half a year's pay. At the starting salary the company's 3 lakhs is already there. What a top-up buys is the money above it, for a bill larger than 3 lakhs.",
      "Cover is cheap while you are healthy and hard to buy once you are not. That is the whole shape of it."
    ]
  },
  "6": {
    "title": "No-cost EMI",
    "paragraphs": [
      "A purchase split into equal monthly payments, with the interest said to be zero. The interest is still there. It is in the price.",
      "In month 6 the phone was 73,000, or 6,600 a month for twelve months. Twelve payments of 6,600 come to 79,200. The 6,200 between them is the interest, renamed as a discount you did not get. It is about 8% of what the payments add up to.",
      "In this game the phone counts at its cash price and a debt opens for the same amount, so buying on EMI does not change net worth on the day. The 6,600 then leaves every month for a year. It counts against Freedom, and Safety counts it among what you must spend.",
      "Either way the phone loses value from the day it is bought: 45% of its price a year, in this game."
    ]
  },
  "8": {
    "title": "Real versus nominal",
    "paragraphs": [
      "Nominal is the number. Real is what the number buys. A raise is only a raise by as much as it beats rising prices.",
      "In month 8 the appraisal was 8%. Prices that year rose about 6%. In what it buys, the raise was about 2%, not 8%.",
      "In this game living costs, and rent when it is renewed, rise with prices every month, about 6% a year. A salary moves only when something moves it: an appraisal, a new job, a layoff.",
      "So a salary that stays the same falls a little every month. Nobody announces it."
    ]
  },
  "9": {
    "title": "A windfall is not income",
    "paragraphs": [
      "Money that arrives once: a bonus, a gift, a refund. It feels like extra, so it gets treated like extra.",
      "Income is planned around before it lands. Rent and bills are waiting for it. A windfall has no plan waiting, which is why it so often turns into a few good weeks and nothing anyone can point to later.",
      "In month 9 the bonus was 1.2 lakhs. In this game a bonus left where it lands loses 35% in that same month, the same leak as any money not moved anywhere. Money put somewhere on purpose, invested, given or spent, has been decided, and does not leak.",
      "A windfall asks the same question a salary does. It asks it once, all at once."
    ]
  },
  "10": {
    "title": "SIP and compounding",
    "paragraphs": [
      "A systematic investment plan: the same amount invested every month, whatever the market did that month.",
      "Compounding is returns earning returns. In the first years it is small and easy to dismiss. It grows with time more than with size, which is why starting early does more than starting big.",
      "In month 10 the choice was 5,000 a month into a broad equity index, 5,000 a month into a recurring deposit at about 6.5% a year, or waiting. The index rises and falls with the market. The deposit does not fall. Either amount goes out on salary day, so in this game it is saved in full before the month's leak."
    ]
  },
  "11": {
    "title": "Credit score",
    "paragraphs": [
      "A lender's record of how you have handled borrowing: whether you paid on time, and how much of your limit you use. Later loans are priced on it.",
      "A card bill has two numbers, the full amount and the minimum. Paying the full amount costs nothing. Paying the minimum keeps the record clean, and the rest of the balance carries over with interest.",
      "In this game the card charges 3.5% a month on what carries over, and the minimum is 5% of the balance. So a card on minimum payments keeps 98.5% of its balance each month. It shrinks, slowly.",
      "The 2 lakh limit is not money you have. On the Safety bar, anything owed on the card is taken off what you can reach."
    ]
  },
  "12": {
    "title": "Tax deductions",
    "paragraphs": [
      "Some money you put away reduces the income you are taxed on. Under the old tax regime, section 80C allows that for certain investments, up to a limit.",
      "The new regime has lower rates and drops most deductions. Which one leaves you more depends on your salary and on what you were going to do with the money anyway. It is a calculation, and it fits in an afternoon.",
      "In month 12 payroll said 46,000 would go to tax unless you showed investments, with three weeks left. That is the March version of a question month 1 already asked, with less time to answer it.",
      "A product bought for the deduction is still a product. Its lock-in and its return stay long after the deadline has passed."
    ]
  },
  "14": {
    "title": "Survivorship bias",
    "paragraphs": [
      "Judging by the ones still standing. The people who did well are visible, and they talk about it. The ones who did the same thing and lost are not, and they do not.",
      "A colleague's 40% year is real. It is also one year, one person, and the version of the story that gets told.",
      "In this game small companies swing far more than the broad index: their yearly volatility is set at 30%, the index's at 13%. A big year and a big fall are both ordinary for them. What month 14 showed was one side of that."
    ]
  },
  "15": {
    "title": "Term insurance",
    "paragraphs": [
      "Life cover and nothing else. If you die during the term, it pays a fixed sum to whoever you named. If you do not, it pays nothing. That is why it is cheap.",
      "The price depends on your age and health on the day you buy it, and it holds for the whole term. Bought young, it costs little for decades.",
      "In month 15 the offer was 1 crore of cover for about 800 a month. The plan that returns your premium was 2,400 a month for the same 1 crore, because the payments are saved and handed back later, at about 4.5% a year in this game.",
      "The Safety bar gives term cover full marks while nobody depends on your income, so it does not move either way until someone does. From then on the bar looks for cover of ten years' pay."
    ]
  },
  "16": {
    "title": "Depreciation",
    "paragraphs": [
      "The value something loses simply by being owned. A vehicle, a phone, a laptop: each is worth less every month, used or not.",
      "In this game a scooter loses 20% of its price each year, until it is worth 15% of what was paid. In month 16 it cost 95,000, or 8,600 a month for a year.",
      "Net worth counts the scooter at what it is worth now, not at what it cost. Paid in cash, the money becomes the scooter on the day, and then the scooter shrinks. Bought on EMI, it is the same scooter shrinking at the same rate, with a debt beside it.",
      "That is not a mistake. Getting around is worth something. It is spending, though, and net worth shows it month by month."
    ]
  },
  "17": {
    "title": "Committed income",
    "paragraphs": [
      "The part of your pay that is spoken for before it arrives: rent, EMIs, premiums, money sent home every month. It goes out whatever else happens.",
      "This is what the Freedom bar measures. It is full when nothing is committed and empty when 70% of your pay is. Its good mark sits at 40%.",
      "In month 17 the loan had 14,000 a month left to run for two years. Taking it on, or half of it, adds that amount to what is committed for as long as it runs.",
      "A large salary with large commitments leaves fewer choices than a small one with none. What changes is how much of the salary is still yours to decide about."
    ]
  },
  "18": {
    "title": "Time as money",
    "paragraphs": [
      "Time has a price, even though nobody sends a bill for it. A cheaper choice that costs hours is only cheaper if the hours were worth less than the money.",
      "In month 18 the landlord wanted 4,000 more. A similar place 40 minutes further out saved 5,000, and moving cost about 15,000. Forty minutes further out is forty minutes each way, every working day.",
      "The rent is on the lease. The hours are not on anything, which is how they get left out. In this game the move further out costs some Life: that is where the hours show up."
    ]
  },
  "20": {
    "title": "Opportunity cost",
    "paragraphs": [
      "The value of what you did not choose. Every choice is also a refusal of the others, and the refusal has a price too.",
      "In month 20 there were two offers: a large company at 9.5 LPA, and a six person startup at 7.3 LPA plus equity nobody could value yet. Staying was a third.",
      "Taking the large company gives up the startup's chance of something bigger. Taking the startup gives up the gap between the two salaries, every year, for that chance. Staying gives up both offers to keep what is known.",
      "None of these costs appears as a line anywhere. They are real anyway."
    ]
  },
  "21": {
    "title": "Lifestyle creep",
    "paragraphs": [
      "Spending rising to meet income without anyone deciding it should. Not one big purchase. A slightly better flat, a slightly better phone, more meals out, each reasonable on its own.",
      "It happens at the raise. The new money arrives with no plan, and the old plan did not need it, so it goes into living a little better. A year later that is simply what living costs.",
      "In this game the level the Life bar settles toward rises with day-to-day spending above a normal month, up to a point: it stops rising once that extra reaches 15% of the starting salary, kept in step with prices. Past that, more spending raises it no further, and still costs the same in net worth.",
      "Spending more as you earn more is not creep. Creep is when nobody chose it."
    ]
  },
  "22": {
    "title": "Runway",
    "paragraphs": [
      "How many months you survive with no income at all. Not how much you have saved. How long it lasts.",
      "The number is simple: what you can reach, divided by what you must spend. What you can reach means cash and anything you can turn into cash this week. It does not mean your EPF, which you cannot touch. In this game a deposit counts at 95%, after the penalty for breaking it early, and shares at 60%, what a hurried sale might bring. What you must spend is not what you usually spend. It is rent, food, bills, the EMI that does not care that you lost your job.",
      "Most people have never worked this number out about themselves, and they find out what it is in the week they most need to already know.",
      "In month 22 the job went. Whatever you had reachable that morning became the only thing standing between you and borrowing. If it was {runway}, you had {runway} to find the next job without changing anything. If it was less than one, the first missed salary was already a crisis.",
      "This is why the Safety bar counts runway and not savings. Two people with the same balance can have very different runways, because one of them has committed most of their salary before it arrives."
    ]
  },
  "24": {
    "title": "Guaranteed returns",
    "paragraphs": [
      "A return that is high and guaranteed at the same time. Real returns trade one against the other: the safe ones are low, and the high ones can fall.",
      "In month 24 the scheme promised 3% a month. Kept up for a year, that is over 42%. A deposit in this game pays about 6.5% a year.",
      "A scheme paying that much has to find the money somewhere. Usually it is the next person's deposit, which is why the early payers are paid on time, and why it stops when new money does. The cousin had been paid on time for eight months.",
      "Paid on time is not the same as safe. It only means the money has not run out yet."
    ]
  }
};
