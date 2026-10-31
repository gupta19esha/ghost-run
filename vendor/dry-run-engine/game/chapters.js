// The six chapters as the product spec sets them: HANDOFF.md section 4, "Structure". Each
// one's ages and length, in months, one a day (the table's Days). The chapter start shows them
// (UI.md rule 11). Its name is the sheet's chapter_title where the sheet has decisions for it,
// spelt as Home, the turn and the card spell it, and the table's name where it has none yet.

import DECISIONS from "../engine/decisions.js";

export const CHAPTERS = [
  { number: 1, name: "First Salary", ages: { from: 22, to: 24 }, months: 24 },
  { number: 2, name: "Building", ages: { from: 24, to: 27 }, months: 36 },
  { number: 3, name: "Pressure", ages: { from: 27, to: 31 }, months: 48 },
  { number: 4, name: "The Big Ones", ages: { from: 31, to: 35 }, months: 48 },
  { number: 5, name: "Weight", ages: { from: 35, to: 39 }, months: 48 },
  { number: 6, name: "The Count", ages: { from: 39, to: 42 }, months: 36 },
];

// The chapter's row, with its name as the game shows it
export function chapterInfo(number) {
  const row = CHAPTERS.find((c) => c.number === number);
  if (!row) return null;
  const sheet = Object.values(DECISIONS).find((d) => d.chapter === number && d.chapter_title);
  return { ...row, name: sheet?.chapter_title ?? row.name };
}
