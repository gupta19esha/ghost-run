# Illustrations, batch 5: D26 to D30

The last five, and the hardest: a job fork, lifestyle creep, a layoff, a job search and a
scam. All states rather than objects.

Tokens only, muted derived. No new colours.

---

## Two fixes first

Both are the same error as D16's teal seedling: colour picking a side before the player
has read the options.

**D04, the transfer.** The coin in the destination box is teal, which colours the saving
side "went up". Change `var(--teal)` to `var(--marigold)` on that circle. Money is
marigold, and the coin is money.

**D24, the two doors.** The near door has a marigold knob, the far one grey. Only one
choice is coloured, and it is the expensive one. Change the marigold circle to
`var(--paper-shadow)`, so both knobs match.

---

## D26, month 20: two offers, and the job you have

A fork in a road. Three ways, none marked.

```svg
<circle cx="322" cy="66" r="76" fill="var(--deep-raised)"/>
<path d="M164 286V196l-62-76" stroke="var(--bone)" stroke-width="26" fill="none" stroke-linejoin="round"/>
<path d="M164 196l62-76" stroke="var(--bone)" stroke-width="26" fill="none" stroke-linejoin="round"/>
<path d="M164 196v-96" stroke="var(--bone)" stroke-width="26" fill="none"/>
<g stroke="var(--deep)" stroke-width="3" stroke-dasharray="10 12">
  <path d="M164 286v-90"/>
  <path d="M164 196l-62-76"/>
  <path d="M164 196l62-76"/>
  <path d="M164 196v-96"/>
</g>
<circle cx="102" cy="112" r="13" fill="var(--paper-dim)"/>
<circle cx="164" cy="92" r="13" fill="var(--paper-dim)"/>
<circle cx="226" cy="112" r="13" fill="var(--paper-dim)"/>
```

## D27, month 21: the income went up, the investing did not

Two stacks. One has grown, the other has not.

```svg
<circle cx="68" cy="62" r="70" fill="var(--deep-raised)"/>
<g fill="var(--bone)">
  <rect x="96" y="212" width="94" height="22" rx="4"/>
  <rect x="96" y="184" width="94" height="22" rx="4"/>
  <rect x="96" y="156" width="94" height="22" rx="4"/>
  <rect x="96" y="128" width="94" height="22" rx="4"/>
  <rect x="96" y="100" width="94" height="22" rx="4"/>
</g>
<g fill="var(--paper-dim)">
  <rect x="216" y="212" width="94" height="22" rx="4"/>
  <rect x="216" y="184" width="94" height="22" rx="4"/>
</g>
<rect x="86" y="240" width="114" height="5" rx="2" fill="var(--paper-shadow)"/>
<rect x="206" y="240" width="114" height="5" rx="2" fill="var(--paper-shadow)"/>
<path d="M143 86V62" stroke="var(--paper-shadow)" stroke-width="4" stroke-linecap="round"/>
<path d="M135 70l8-10 8 10" stroke="var(--paper-shadow)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
```

## D28, month 22: Friday, 3pm

A desk, cleared. A box on it, and one thing left behind.

```svg
<circle cx="326" cy="228" r="74" fill="var(--deep-raised)"/>
<rect x="56" y="180" width="278" height="12" rx="4" fill="var(--bone)"/>
<rect x="74" y="192" width="14" height="66" fill="var(--paper-shadow)"/>
<rect x="302" y="192" width="14" height="66" fill="var(--paper-shadow)"/>
<path d="M132 108h116l-10 72H142Z" fill="var(--paper-dim)"/>
<path d="M124 96h132v16H124Z" fill="var(--bone)"/>
<path d="M162 96v84M218 96v84" stroke="var(--paper-shadow)" stroke-width="3"/>
<rect x="266" y="150" width="46" height="30" rx="3" fill="var(--bone)"/>
<circle cx="289" cy="165" r="8" fill="var(--paper-dim)"/>
<rect x="286" y="136" width="6" height="16" fill="var(--paper-shadow)"/>
```

## D29, month 23: two months, and one offer on the table

A door, slightly open, with light behind it. Another door beside it, shut.

```svg
<circle cx="66" cy="60" r="70" fill="var(--deep-raised)"/>
<rect x="72" y="70" width="118" height="180" fill="var(--paper-dim)"/>
<rect x="88" y="86" width="86" height="164" fill="var(--deep)"/>
<circle cx="160" cy="172" r="6" fill="var(--paper-shadow)"/>
<rect x="216" y="70" width="112" height="180" fill="var(--bone)"/>
<path d="M232 86h80v164h-80Z" fill="var(--deep)"/>
<path d="M232 86l34 14v136l-34 14Z" fill="var(--bone)"/>
<circle cx="256" cy="172" r="5" fill="var(--deep)"/>
<rect x="60" y="250" width="280" height="5" rx="2" fill="var(--paper-shadow)"/>
```

## D30, month 24: paid on time for eight months

A chain of coins, each one holding up the next. The last one has nothing under it.

```svg
<circle cx="324" cy="64" r="74" fill="var(--deep-raised)"/>
<g fill="var(--marigold)">
  <circle cx="82" cy="206" r="26"/>
  <circle cx="134" cy="184" r="26"/>
  <circle cx="186" cy="162" r="26"/>
  <circle cx="238" cy="140" r="26"/>
</g>
<circle cx="290" cy="118" r="26" fill="none" stroke="var(--paper-shadow)" stroke-width="3" stroke-dasharray="7 9"/>
<g stroke="var(--bone)" stroke-width="3" stroke-linecap="round">
  <path d="M74 198h16M74 206h16M82 206c5 0 7 2 7 5 0 3-3 5-7 5l10 8"/>
  <path d="M126 176h16M126 184h16M134 184c5 0 7 2 7 5 0 3-3 5-7 5l10 8"/>
  <path d="M178 154h16M178 162h16M186 162c5 0 7 2 7 5 0 3-3 5-7 5l10 8"/>
  <path d="M230 132h16M230 140h16M238 140c5 0 7 2 7 5 0 3-3 5-7 5l10 8"/>
</g>
<rect x="56" y="240" width="182" height="5" rx="2" fill="var(--paper-shadow)"/>
```

---

## Notes

**D26 is the only illustration with no object in it at all.** Three roads, three dots,
nothing to say which is which. Every other drawing has a thing in it. If that reads as
empty rather than open, the alternative is three envelopes, which is duller but concrete.

**D28 has the box already packed.** Not the moment of being told, the moment after. The
thing left on the desk is a photo frame, face down, which is the only sentimental object
in thirty drawings and may be one too many. Removing it leaves a cleared desk, which is
bleaker and probably better.

**D30's last coin is an outline, on nothing.** Four coins each holding the next up, and a
fifth that is only a dotted edge with no ground beneath it. That is a Ponzi scheme drawn
honestly, and it is the closest this batch comes to showing the answer. It is also the
one decision where the answer should probably be visible, since the lesson is that it was
visible all along.

**No vermilion in this batch.** The five hardest months are drawn in bone, paper and
marigold only. Nothing here is coloured as a warning, because the decisions have to feel
open at the moment of choosing.

That is all thirty.

**Changed after review:** D29's light wedge is bone, not marigold. Marigold coloured the
open door, one option's object, and left the shut door plain. Light through a door is bone.
