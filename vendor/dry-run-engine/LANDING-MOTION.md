# Landing motion: five directions

30 September 2026. Proposals only. Nothing in the game changed. UI.md's motion record says no
animation is added until the product owner decides, with the numbers in front of them: the landing
has none today, 0 seconds of movement in the first ~20 seconds of the game.

**What every direction shares.** Plays once when the landing opens, then is still, so it never
competes with reading and costs no battery. Nothing loops except where said. With reduced motion
on, each shows its end state at once, as the bars and the count already do. Everything moves by
opacity and position, which a cheap phone draws without effort; nothing uses blur, filters or
video.

**The room there is.** The landing's spare height, measured today: **11 px at 320 by 568**, 91 px
at 360 by 640, 117 px at 390 by 844. Anything that animates what is already there costs no height.
Anything added above the title has to take the mark's place (68 px at 320 by 568) or wait for
taller phones.

**Sizes.** The illustrations are already downloaded when the game opens (the decision screen
imports them): 31 KB, 6.4 KB compressed. Reusing them costs no bytes.

---

## The five

| | Direction | What the player sees | Adds | Build | Rule 4 | Cheap Android at 320 by 568 |
|---|---|---|---|---|---|---|
| **A** | **The mark comes alive** | The 24 ticks draw themselves round the circle, one month at a time, and the first nine turn marigold in order. About 1.5 s, then still | ~0.8 KB | Half a day | **Survives.** Marigold is the mark's own colour, not a change; no teal or vermilion appears. Nine ticks filling in is what the mark already means, months played | Yes. 24 short lines, no height added |
| **B** | **A life in pictures** | A band above the title fades through four illustrations from across the chapter, say the flat (D02), the wedding (D10), the first investment (D16) and the scooter (D22), about 2.5 s each, stopping on the last | ~1 KB of code, no drawings | A day, plus fitting | **Survives,** as the drawings already do under rule 7: their colours are what the objects look like, and none is teal or vermilion to mean good or bad. Choose four whose colours carry no hint | The fades are cheap. **It does not fit at 320 by 568** unless the band replaces the mark and the text tightens, and then it is about 100 px tall. At 360 and up it fits |
| **C** | **The first salary counts in** | Under the title, the first salary counts up from ₹0 to ₹41,300 in marigold, the month close's count, 1.2 s | ~1 KB, shared with the month close | Half a day, plus a label | **Survives only in marigold, with no chip and no arrow.** A teal rise before the player has done anything would say rising is good, which is the one thing rule 4 keeps for change. The figure comes from the engine, so it cannot drift from the game | One text element, cheap. Adds a line of large type: **does not fit at 320 by 568** without giving up the mark. It also needs a label, the product owner's words |
| **D** | **A figure** | A flat, faceless person in the illustrations' shapes, holding up the first payslip; the coin drops beside them. About 1.5 s, then still. Sketch: `LANDING-MOTION-figure.svg` | ~2 KB drawing, ~0.5 KB motion | One to two days, with review | **Survives** in the sketch's neutral tones. The payslip's vermilion header is D01's object colour, as in every illustration | Cheap to draw. At 320 by 568 the figure is about 60 px tall in a 100 px band, which reads as an icon, and it takes the mark's place |
| **E** | **The words arrive** | The three title lines rise into place one after another, then the lede and the bullets fade in, each 0.1 s after the last. About 1 s | ~0.3 KB | Two hours | **Survives.** No colour changes at all | Yes. No height added |

## What each costs besides size

- **A** is the smallest change that makes the screen feel alive, and it gives the logo a meaning a
  first-time player can see: months passing. Alone it is small; with E it is a sequence.
- **B** shows what the game is before a word is read, which no line of copy can. Its cost is
  room: on the smallest phone it means losing the mark, or showing the band only on phones 640 px
  tall or more and keeping the landing as it is below that.
- **C** makes the landing's first moving thing money, which fits rule 3, "money is the largest type
  and animates when it changes". But the first thing a new player sees would be a number, which
  pulls toward a finance app and away from a life, and the number means nothing yet.
- **D** looks right in the style: the sketch uses nothing the illustrations do not already use. The
  cost is not drawing time, it is what a figure says. The illustrations are objects, with one
  exception: D12, "your sister asked you first", draws two faceless figures, the sister and the
  player, inside that one decision. (This note first said people were never drawn; that was wrong,
  corrected 30 September 2026.) A figure on the landing is different: it stands for the player. It
  makes the player somebody, with a body, clothes and a skin tone, where UI.md says the player
  steps into a life rather than entering their own details. Faceless neutral tones soften that and
  do not remove it. And once the landing has a person, the decision illustrations will look empty
  without one, which is the change of direction the product owner has ruled out.
- **E** is the cheapest and the most invisible. On its own it can look like any website. As the
  lead-in to A, it is what makes A read as an opening rather than a decoration.

## Are the illustrations a missed opportunity on the landing?

Yes, at 360 by 640 and up. The illustrations are what makes the game look like itself, and the
landing is the one screen that has to say what the game is, and says it only in words. A player who
leaves in seconds, as the product owner did, never reaches the first illustration.

Two limits. At 320 by 568 there is no room without giving up the mark. And D01's payslip should not
be the one used: it is the first decision's picture, two screens later, and showing it first takes
away that moment. Drawings from later in the chapter show the range of a life, a flat, a wedding, a
scooter, which is the promise of "Twenty years of your money life" made visible.

## Recommendation

**A with E, for every phone,** and **B at 360 by 640 and up,** with the landing unchanged below that.
A and E cost no height, under a day together, and turn the first second into an opening: the words
arrive, then the mark counts its months. B answers the illustration question where there is room.

C and D are worth seeing, not building. C makes the first thing a number. D looks right in the
sketch and makes the player someone, which the product has so far avoided on purpose.

---

## Ruled 30 September 2026

A and E on every phone, B on 360 by 640 and up. Not C, not D. Intro skip is a real feature: the
opening plays in full once, then the landing appears in place, and any tap finishes it at once.

**Built:** A and E, with the intro skip. `game/screens/landing.js` and `game/style.css`. The seen
flag is its own `localStorage` key, `finance-sim-intro-seen`, apart from the save, so a dropped save
or a tester's Start again does not play it again. With reduced motion on it never plays. Checked in
the browser: plays the first time and ends after 1.8 s, appears in place the second time, a tap
mid-opening finishes it at once, and the landing still fits at all three sizes, unchanged.

**B, the four illustrations, awaiting approval before it is built:** in chapter order, none from D01
or D02, none whose colours hint at an answer (so not D20's rising chart or D30's growing coins).

| | Illustration | Month |
|---|---|---|
| 1 | D10, the wedding invitation | 6 |
| 2 | D16, the first investment, a seedling in a pot beside two empty ones | 10 |
| 3 | D22, the scooter | 16 |
| 4 | D26, the fork in the road | 20, and the one it stops on: the choices ahead |

Preview: `LANDING-MOTION-B.png`. One to weigh: D16's seedling could be read as "investing grows",
since it is the only drawing of the four about growth. If that is too close to a hint, D23, the
telephone (your mother asked, month 17), takes its place.

**B, ruled and built 30 September 2026:** D10, D23, D22, D26. D23 took D16's place: a seedling on
the landing hints that investing is the answer, and nothing on that screen should hint at any
answer. On phones 640 px tall or more, a band above the title, full width on the illustrations'
ground, taking the landing's free height up to 200 px: 73 px at 360 by 640, 118 px at 390 by 844
(the mark's top space is cut from 48 to 28 px on phones 800 px tall or more). Each picture fades in,
holds and fades into the next, 2.5 s apart; it stops on D26 at about 10 s. It plays with the
opening, the first time only; a tap ends it on D26, and later visits show D26 still. Below 640 px
there is no band. Checked in the browser: D10 at 1.3 s, D23 at 3.8 s, D22 at 6.3 s, D26 from 8.8 s
on; a tap at 3 s shows D26; the second visit shows D26 still. The landing fits at all three sizes.
