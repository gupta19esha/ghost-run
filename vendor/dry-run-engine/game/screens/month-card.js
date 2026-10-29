// The month card: where the player is in their life, and what this month pays. It opens a
// session and leaves by itself after 2 seconds (UI.md screens table). No artboard exists;
// it is built from the tokens.
//
// Copy: "Month 14. You are 23." is UI.md's and the Phase 0 harness's. The salary line is
// HANDOFF's core loop, "Salary credited. 52,000 in.", shown only when there is salary.
//
// No net worth here (ruled 29 September 2026). It was added the day before and taken out: the
// month card's job is where you are and what is coming, and net worth as the month begins
// does not yet hold the salary the line below says was credited. Net worth is on the
// decision screen, whose job is what you have (UI.md rule 1).

import { leaveAfter } from "./timed.js";

// month and age from the engine. salary: the money, already formatted by text/, or null.
export function monthCardScreen({ month, age, salary, holdMs, hold, onDone }) {
  const screen = document.createElement("section");
  screen.className = "screen month-card";
  screen.dataset.screen = "month";

  const line = document.createElement("p");
  line.className = "month-line";
  line.textContent = `Month ${month}. You are ${age}.`;
  screen.append(line);

  if (salary !== null) {
    const pay = document.createElement("p");
    pay.className = "salary-line";
    const money = document.createElement("span");
    money.className = "money";
    money.textContent = salary;
    pay.append("Salary credited. ", money, " in.");
    screen.append(pay);
  }

  return leaveAfter(screen, { holdMs, hold, tappable: false, onDone });
}
