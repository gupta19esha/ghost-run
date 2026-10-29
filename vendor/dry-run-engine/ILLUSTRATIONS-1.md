# Illustrations, batch 1: D02 to D07

Six flat geometric SVGs for `game/screens/illustrations.js`, in D01's vocabulary:
rectangles, circles and simple paths on a solid colour block, no gradients, no shadows.

Each is a `0 0 390 286` viewBox filling the top third of the decision screen.

**The muted form is derived, not drawn.** D01 already does this: same shapes, the muted
palette. Apply the same swap to each of these rather than drawing a second version.

| Full | Muted |
|---|---|
| `#1B3A5C` ground | `#14293F` |
| `#22486E` | `#1B3A5C` |
| `#F2ECE0` | `#8C8578` |
| `#F0A830` | `#8A6524` |
| `#D6402C` | `#7A2C20` |
| `#4FB79E` | `#3A7568` |
| `#B9BECD` | `#6E7280` |

---

## D02, month 1: where to live

A building, seen flat. The lit windows are the ones that matter.

```svg
<svg width="390" height="286" viewBox="0 0 390 286" fill="none" aria-hidden="true">
  <rect width="390" height="286" fill="#1B3A5C"/>
  <circle cx="330" cy="58" r="84" fill="#22486E"/>
  <rect x="96" y="54" width="128" height="196" fill="#F2ECE0"/>
  <rect x="224" y="98" width="76" height="152" fill="#E0D9CB"/>
  <rect x="114" y="74" width="28" height="30" fill="#1B3A5C"/>
  <rect x="156" y="74" width="28" height="30" fill="#F0A830"/>
  <rect x="114" y="120" width="28" height="30" fill="#F0A830"/>
  <rect x="156" y="120" width="28" height="30" fill="#1B3A5C"/>
  <rect x="114" y="166" width="28" height="30" fill="#1B3A5C"/>
  <rect x="156" y="166" width="28" height="30" fill="#1B3A5C"/>
  <rect x="240" y="120" width="22" height="26" fill="#1B3A5C"/>
  <rect x="272" y="120" width="22" height="26" fill="#1B3A5C"/>
  <rect x="240" y="166" width="22" height="26" fill="#F0A830"/>
  <rect x="272" y="166" width="22" height="26" fill="#1B3A5C"/>
  <rect x="140" y="212" width="40" height="38" fill="#D6402C"/>
  <rect x="60" y="238" width="270" height="12" fill="#22486E"/>
</svg>
```

## D03, month 2: the 24th

A calendar. The month is nearly gone and one square is marked.

```svg
<svg width="390" height="286" viewBox="0 0 390 286" fill="none" aria-hidden="true">
  <rect width="390" height="286" fill="#1B3A5C"/>
  <circle cx="58" cy="228" r="66" fill="#22486E"/>
  <rect x="96" y="46" width="198" height="194" rx="4" fill="#F2ECE0"/>
  <rect x="96" y="46" width="198" height="30" rx="4" fill="#22486E"/>
  <circle cx="130" cy="40" r="6" fill="#F2ECE0"/>
  <circle cx="260" cy="40" r="6" fill="#F2ECE0"/>
  <g fill="#B9BECD">
    <rect x="114" y="92" width="22" height="16" rx="2"/>
    <rect x="146" y="92" width="22" height="16" rx="2"/>
    <rect x="178" y="92" width="22" height="16" rx="2"/>
    <rect x="210" y="92" width="22" height="16" rx="2"/>
    <rect x="242" y="92" width="22" height="16" rx="2"/>
    <rect x="114" y="118" width="22" height="16" rx="2"/>
    <rect x="146" y="118" width="22" height="16" rx="2"/>
    <rect x="178" y="118" width="22" height="16" rx="2"/>
    <rect x="210" y="118" width="22" height="16" rx="2"/>
    <rect x="242" y="118" width="22" height="16" rx="2"/>
    <rect x="114" y="144" width="22" height="16" rx="2"/>
    <rect x="146" y="144" width="22" height="16" rx="2"/>
    <rect x="178" y="144" width="22" height="16" rx="2"/>
  </g>
  <rect x="210" y="144" width="22" height="16" rx="2" fill="#D6402C"/>
  <g fill="#E4DED2">
    <rect x="242" y="144" width="22" height="16" rx="2"/>
    <rect x="114" y="170" width="22" height="16" rx="2"/>
    <rect x="146" y="170" width="22" height="16" rx="2"/>
    <rect x="178" y="170" width="22" height="16" rx="2"/>
    <rect x="210" y="170" width="22" height="16" rx="2"/>
    <rect x="242" y="170" width="22" height="16" rx="2"/>
  </g>
  <circle cx="221" cy="212" r="14" fill="#F0A830"/>
</svg>
```

## D04, month 2: pay yourself first

Money leaving one place for another on the day it arrives.

```svg
<svg width="390" height="286" viewBox="0 0 390 286" fill="none" aria-hidden="true">
  <rect width="390" height="286" fill="#1B3A5C"/>
  <circle cx="336" cy="228" r="74" fill="#22486E"/>
  <rect x="44" y="94" width="120" height="100" rx="6" fill="#F2ECE0"/>
  <rect x="62" y="116" width="84" height="8" rx="2" fill="#B9BECD"/>
  <rect x="62" y="134" width="56" height="8" rx="2" fill="#B9BECD"/>
  <circle cx="104" cy="168" r="14" fill="#F0A830"/>
  <rect x="226" y="94" width="120" height="100" rx="6" fill="#F2ECE0"/>
  <circle cx="286" cy="144" r="26" fill="#F0A830"/>
  <path d="M276 134h20M276 142h20M286 142c7 0 9 3 9 6 0 4-4 6-9 6l13 11" stroke="#F2ECE0" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <path d="M176 144h34" stroke="#F0A830" stroke-width="6" stroke-linecap="round"/>
  <path d="M200 132l14 12-14 12" stroke="#F0A830" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
</svg>
```

## D05, month 3: the policy

A document with a seal. It looks official, which is the point.

```svg
<svg width="390" height="286" viewBox="0 0 390 286" fill="none" aria-hidden="true">
  <rect width="390" height="286" fill="#1B3A5C"/>
  <circle cx="72" cy="52" r="70" fill="#22486E"/>
  <rect x="112" y="40" width="176" height="212" rx="4" fill="#F2ECE0"/>
  <rect x="136" y="70" width="128" height="12" rx="2" fill="#22486E"/>
  <g fill="#B9BECD">
    <rect x="136" y="102" width="128" height="7" rx="2"/>
    <rect x="136" y="120" width="128" height="7" rx="2"/>
    <rect x="136" y="138" width="96" height="7" rx="2"/>
    <rect x="136" y="156" width="128" height="7" rx="2"/>
    <rect x="136" y="174" width="72" height="7" rx="2"/>
  </g>
  <circle cx="242" cy="212" r="26" fill="#D6402C"/>
  <circle cx="242" cy="212" r="17" fill="none" stroke="#F2ECE0" stroke-width="2.5"/>
  <path d="M232 238l-6 26 16-9 16 9-6-26" fill="#D6402C"/>
  <rect x="136" y="206" width="62" height="7" rx="2" fill="#B9BECD"/>
  <rect x="136" y="222" width="44" height="7" rx="2" fill="#B9BECD"/>
</svg>
```

## D06, month 3: lunch, every day

A thali. Four katoris and rice, seen from above.

```svg
<svg width="390" height="286" viewBox="0 0 390 286" fill="none" aria-hidden="true">
  <rect width="390" height="286" fill="#1B3A5C"/>
  <circle cx="330" cy="240" r="72" fill="#22486E"/>
  <circle cx="195" cy="143" r="102" fill="#F2ECE0"/>
  <circle cx="195" cy="143" r="92" fill="none" stroke="#B9BECD" stroke-width="2"/>
  <circle cx="152" cy="106" r="26" fill="#F0A830"/>
  <circle cx="238" cy="106" r="26" fill="#D6402C"/>
  <circle cx="134" cy="172" r="26" fill="#4FB79E"/>
  <circle cx="212" cy="184" r="30" fill="#E4DED2"/>
  <circle cx="212" cy="184" r="20" fill="#F2ECE0"/>
  <circle cx="262" cy="166" r="18" fill="#F0A830"/>
</svg>
```

## D07, month 4: where the emergency money sits

A box with a lid, and what goes in it.

```svg
<svg width="390" height="286" viewBox="0 0 390 286" fill="none" aria-hidden="true">
  <rect width="390" height="286" fill="#1B3A5C"/>
  <circle cx="64" cy="58" r="68" fill="#22486E"/>
  <circle cx="196" cy="86" r="24" fill="#F0A830"/>
  <path d="M186 76h20M186 84h20M196 84c7 0 9 3 9 6 0 4-3 6-9 6l13 11" stroke="#1B3A5C" stroke-width="3.5" stroke-linecap="round" fill="none"/>
  <circle cx="148" cy="100" r="16" fill="#F0A830" opacity="0.7"/>
  <circle cx="246" cy="100" r="16" fill="#F0A830" opacity="0.7"/>
  <rect x="106" y="140" width="178" height="110" rx="6" fill="#F2ECE0"/>
  <rect x="96" y="124" width="198" height="30" rx="4" fill="#E4DED2"/>
  <rect x="176" y="182" width="38" height="46" rx="4" fill="#22486E"/>
  <circle cx="195" cy="198" r="7" fill="#F2ECE0"/>
  <rect x="192" y="202" width="6" height="14" rx="2" fill="#F2ECE0"/>
</svg>
```

---

## Notes

**D02 is the only one showing a choice.** Two buildings of different sizes, because the
decision is which one to live in. Everything else shows the situation, not the options,
per the illustration rules.

**D06 has no rupee symbol and no money at all.** It is a plate of food. The decision is
about 5,000 a month, but drawing the money would say the quiet part loud.

**D03's marked square is vermilion.** That is the only use of vermilion outside a falling
bar, and it is a date on a calendar rather than a judgement. If that reads as the game
telling the player they have already failed, change it to marigold.

Twenty-three decisions still have none after this batch: D08 to D30.

**Changed after review (batch 5):** D04's destination coin is marigold, not teal. Teal
coloured the saving side "went up" before the player read the options.
