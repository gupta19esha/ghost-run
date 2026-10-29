// One illustration per decision, drawn as code (UI.md: flat geometric SVG, no sourced files).
// Each has two forms: the decision screen's, and the consequence screen's, which is the same
// moment desaturated. D01's are taken from design/Decision.html and design/Consequence.html.
// D02 to D30 are from the illustration batches (ILLUSTRATIONS-1.md to -5.md), and
// their muted form is derived, not drawn: the same
// shapes with every colour swapped for its muted one (MUTED below). Colours are tokens from
// game/tokens.css, never hex (UI.md build rule 5).
//
// All thirty Chapter 1 decisions have one. A decision with no entry here gets an empty colour
// block, never filler (UI.md rule 4).

const VIEWBOX = "0 0 390 286";

// The palette swap from ILLUSTRATIONS-1.md: each full colour and the muted colour it becomes
const MUTED = {
  "deep": "deep-muted",
  "deep-raised": "deep",
  "bone": "muted-paper",
  "marigold": "muted-marigold",
  "vermilion": "muted-vermilion",
  "teal": "muted-teal",
  "paper-line": "muted-line",
  "paper-side": "muted-paper-side",
  "paper-dim": "muted-paper-dim",
  "paper-shadow": "muted-paper-shadow",
};

// One pass over the drawing, so a swapped colour is never swapped twice
function mute(drawing) {
  return drawing.replace(/var\(--([a-z-]+)\)/g, (match, name) => {
    if (!(name in MUTED)) throw new Error(`No muted colour for --${name}`);
    return `var(--${MUTED[name]})`;
  });
}

function derived(full) {
  return { full, muted: mute(full) };
}

// D01: the first payslip, with a rupee coin beside it
const D01 = {
  full: `
    <circle cx="318" cy="52" r="96" fill="var(--deep-raised)"/>
    <rect x="86" y="62" width="176" height="184" rx="4" fill="var(--bone)"/>
    <rect x="86" y="62" width="176" height="34" rx="4" fill="var(--vermilion)"/>
    <rect x="104" y="74" width="74" height="10" rx="2" fill="var(--bone)" opacity="0.85"/>
    <rect x="104" y="116" width="94" height="8" rx="2" fill="var(--paper-line)"/>
    <rect x="216" y="116" width="28" height="8" rx="2" fill="var(--deep)"/>
    <rect x="104" y="140" width="72" height="8" rx="2" fill="var(--paper-line)"/>
    <rect x="208" y="140" width="36" height="8" rx="2" fill="var(--deep)"/>
    <rect x="104" y="164" width="86" height="8" rx="2" fill="var(--paper-line)"/>
    <rect x="212" y="164" width="32" height="8" rx="2" fill="var(--deep)"/>
    <rect x="104" y="196" width="140" height="2" rx="1" fill="var(--deep)" opacity="0.35"/>
    <rect x="104" y="212" width="58" height="14" rx="2" fill="var(--deep)"/>
    <rect x="186" y="210" width="58" height="18" rx="2" fill="var(--marigold)"/>
    <circle cx="62" cy="228" r="26" fill="var(--marigold)"/>
    <path d="M53 218h18M53 224h18M62 224c6 0 8 3 8 6 0 4-3 6-8 6l12 10" stroke="var(--deep)" stroke-width="3" stroke-linecap="round" fill="none"/>`,
  muted: `
    <circle cx="318" cy="52" r="96" fill="var(--deep)"/>
    <rect x="86" y="62" width="176" height="184" rx="4" fill="var(--muted-paper)"/>
    <rect x="86" y="62" width="176" height="34" rx="4" fill="var(--muted-vermilion)"/>
    <circle cx="62" cy="228" r="26" fill="var(--muted-marigold)"/>`,
};

// D02: where to live
const D02 = derived(`
    <circle cx="330" cy="58" r="84" fill="var(--deep-raised)"/>
    <rect x="96" y="54" width="128" height="196" fill="var(--bone)"/>
    <rect x="224" y="98" width="76" height="152" fill="var(--paper-side)"/>
    <rect x="114" y="74" width="28" height="30" fill="var(--deep)"/>
    <rect x="156" y="74" width="28" height="30" fill="var(--marigold)"/>
    <rect x="114" y="120" width="28" height="30" fill="var(--marigold)"/>
    <rect x="156" y="120" width="28" height="30" fill="var(--deep)"/>
    <rect x="114" y="166" width="28" height="30" fill="var(--deep)"/>
    <rect x="156" y="166" width="28" height="30" fill="var(--deep)"/>
    <rect x="240" y="120" width="22" height="26" fill="var(--deep)"/>
    <rect x="272" y="120" width="22" height="26" fill="var(--deep)"/>
    <rect x="240" y="166" width="22" height="26" fill="var(--marigold)"/>
    <rect x="272" y="166" width="22" height="26" fill="var(--deep)"/>
    <rect x="140" y="212" width="40" height="38" fill="var(--vermilion)"/>
    <rect x="60" y="238" width="270" height="12" fill="var(--deep-raised)"/>`);

// D03: the 24th
const D03 = derived(`
    <circle cx="58" cy="228" r="66" fill="var(--deep-raised)"/>
    <rect x="96" y="46" width="198" height="194" rx="4" fill="var(--bone)"/>
    <rect x="96" y="46" width="198" height="30" rx="4" fill="var(--deep-raised)"/>
    <circle cx="130" cy="40" r="6" fill="var(--bone)"/>
    <circle cx="260" cy="40" r="6" fill="var(--bone)"/>
    <g fill="var(--paper-line)">
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
    <rect x="210" y="144" width="22" height="16" rx="2" fill="var(--vermilion)"/>
    <g fill="var(--paper-dim)">
      <rect x="242" y="144" width="22" height="16" rx="2"/>
      <rect x="114" y="170" width="22" height="16" rx="2"/>
      <rect x="146" y="170" width="22" height="16" rx="2"/>
      <rect x="178" y="170" width="22" height="16" rx="2"/>
      <rect x="210" y="170" width="22" height="16" rx="2"/>
      <rect x="242" y="170" width="22" height="16" rx="2"/>
    </g>
    <circle cx="221" cy="212" r="14" fill="var(--marigold)"/>`);

// D04: pay yourself first
const D04 = derived(`
    <circle cx="336" cy="228" r="74" fill="var(--deep-raised)"/>
    <rect x="44" y="94" width="120" height="100" rx="6" fill="var(--bone)"/>
    <rect x="62" y="116" width="84" height="8" rx="2" fill="var(--paper-line)"/>
    <rect x="62" y="134" width="56" height="8" rx="2" fill="var(--paper-line)"/>
    <circle cx="104" cy="168" r="14" fill="var(--marigold)"/>
    <rect x="226" y="94" width="120" height="100" rx="6" fill="var(--bone)"/>
    <circle cx="286" cy="144" r="26" fill="var(--marigold)"/>
    <path d="M276 134h20M276 142h20M286 142c7 0 9 3 9 6 0 4-4 6-9 6l13 11" stroke="var(--bone)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M176 144h34" stroke="var(--marigold)" stroke-width="6" stroke-linecap="round"/>
    <path d="M200 132l14 12-14 12" stroke="var(--marigold)" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);

// D05: the policy
const D05 = derived(`
    <circle cx="72" cy="52" r="70" fill="var(--deep-raised)"/>
    <rect x="112" y="40" width="176" height="212" rx="4" fill="var(--bone)"/>
    <rect x="136" y="70" width="128" height="12" rx="2" fill="var(--deep-raised)"/>
    <g fill="var(--paper-line)">
      <rect x="136" y="102" width="128" height="7" rx="2"/>
      <rect x="136" y="120" width="128" height="7" rx="2"/>
      <rect x="136" y="138" width="96" height="7" rx="2"/>
      <rect x="136" y="156" width="128" height="7" rx="2"/>
      <rect x="136" y="174" width="72" height="7" rx="2"/>
    </g>
    <circle cx="242" cy="212" r="26" fill="var(--vermilion)"/>
    <circle cx="242" cy="212" r="17" fill="none" stroke="var(--bone)" stroke-width="2.5"/>
    <path d="M232 238l-6 26 16-9 16 9-6-26" fill="var(--vermilion)"/>
    <rect x="136" y="206" width="62" height="7" rx="2" fill="var(--paper-line)"/>
    <rect x="136" y="222" width="44" height="7" rx="2" fill="var(--paper-line)"/>`);

// D06: lunch, every day
const D06 = derived(`
    <circle cx="330" cy="240" r="72" fill="var(--deep-raised)"/>
    <circle cx="195" cy="143" r="102" fill="var(--bone)"/>
    <circle cx="195" cy="143" r="92" fill="none" stroke="var(--paper-line)" stroke-width="2"/>
    <circle cx="152" cy="106" r="26" fill="var(--marigold)"/>
    <circle cx="238" cy="106" r="26" fill="var(--vermilion)"/>
    <circle cx="134" cy="172" r="26" fill="var(--teal)"/>
    <circle cx="212" cy="184" r="30" fill="var(--paper-dim)"/>
    <circle cx="212" cy="184" r="20" fill="var(--bone)"/>
    <circle cx="262" cy="166" r="18" fill="var(--marigold)"/>`);

// D07: where the emergency money sits
const D07 = derived(`
    <circle cx="64" cy="58" r="68" fill="var(--deep-raised)"/>
    <circle cx="196" cy="86" r="24" fill="var(--marigold)"/>
    <path d="M186 76h20M186 84h20M196 84c7 0 9 3 9 6 0 4-3 6-9 6l13 11" stroke="var(--deep)" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <circle cx="148" cy="100" r="16" fill="var(--marigold)" opacity="0.7"/>
    <circle cx="246" cy="100" r="16" fill="var(--marigold)" opacity="0.7"/>
    <rect x="106" y="140" width="178" height="110" rx="6" fill="var(--bone)"/>
    <rect x="96" y="124" width="198" height="30" rx="4" fill="var(--paper-dim)"/>
    <rect x="176" y="182" width="38" height="46" rx="4" fill="var(--deep-raised)"/>
    <circle cx="195" cy="198" r="7" fill="var(--bone)"/>
    <rect x="192" y="202" width="6" height="14" rx="2" fill="var(--bone)"/>`);

// D08: a friend needs 25,000
const D08 = derived(`
    <circle cx="322" cy="62" r="80" fill="var(--deep-raised)"/>
    <rect x="128" y="112" width="134" height="72" rx="4" fill="var(--bone)"/>
    <rect x="128" y="112" width="134" height="72" rx="4" fill="none" stroke="var(--paper-line)" stroke-width="2"/>
    <circle cx="195" cy="148" r="20" fill="var(--marigold)"/>
    <path d="M187 140h16M187 146h16M195 146c5 0 7 2 7 5 0 3-3 5-7 5l10 8" stroke="var(--bone)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <rect x="140" y="122" width="14" height="6" rx="2" fill="var(--paper-line)"/>
    <rect x="236" y="168" width="14" height="6" rx="2" fill="var(--paper-line)"/>
    <path d="M36 176c0-14 10-22 24-22h44v44H60c-14 0-24-8-24-22Z" fill="var(--bone)"/>
    <rect x="36" y="198" width="68" height="16" rx="8" fill="var(--paper-shadow)"/>
    <path d="M354 176c0-14-10-22-24-22h-44v44h44c14 0 24-8 24-22Z" fill="var(--bone)"/>
    <rect x="286" y="198" width="68" height="16" rx="8" fill="var(--paper-shadow)"/>
    <path d="M118 216h154" stroke="var(--vermilion)" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 14"/>`);

// D09: more cover than you think you need
const D09 = derived(`
    <circle cx="66" cy="236" r="70" fill="var(--deep-raised)"/>
    <path d="M195 62c-62 0-112 44-112 98h224c0-54-50-98-112-98Z" fill="var(--bone)"/>
    <path d="M195 62c-24 0-42 44-42 98h84c0-54-18-98-42-98Z" fill="var(--paper-dim)"/>
    <path d="M83 160c14 0 14 18 28 18s14-18 28-18" stroke="var(--deep)" stroke-width="3" fill="none"/>
    <path d="M251 160c14 0 14 18 28 18s14-18 28-18" stroke="var(--deep)" stroke-width="3" fill="none"/>
    <rect x="190" y="52" width="10" height="16" rx="5" fill="var(--marigold)"/>
    <rect x="190" y="160" width="10" height="70" fill="var(--paper-shadow)"/>
    <path d="M195 230c0 14-10 20-20 20s-18-8-18-18" stroke="var(--paper-shadow)" stroke-width="10" stroke-linecap="round" fill="none"/>
    <g fill="var(--teal)">
      <rect x="112" y="204" width="6" height="22" rx="3"/>
      <rect x="144" y="228" width="6" height="22" rx="3"/>
      <rect x="248" y="212" width="6" height="22" rx="3"/>
      <rect x="284" y="236" width="6" height="22" rx="3"/>
    </g>`);

// D10: a wedding in Udaipur
const D10 = derived(`
    <circle cx="330" cy="232" r="74" fill="var(--deep-raised)"/>
    <rect x="84" y="40" width="222" height="212" rx="4" fill="var(--bone)"/>
    <rect x="96" y="52" width="198" height="188" rx="2" fill="none" stroke="var(--marigold)" stroke-width="3"/>
    <circle cx="195" cy="98" r="22" fill="var(--marigold)"/>
    <circle cx="195" cy="98" r="13" fill="var(--bone)"/>
    <circle cx="195" cy="98" r="5" fill="var(--vermilion)"/>
    <g fill="var(--paper-line)">
      <rect x="128" y="142" width="134" height="8" rx="2"/>
      <rect x="150" y="162" width="90" height="8" rx="2"/>
    </g>
    <rect x="136" y="190" width="118" height="10" rx="2" fill="var(--deep)"/>
    <g fill="var(--marigold)">
      <circle cx="116" cy="76" r="5"/>
      <circle cx="274" cy="76" r="5"/>
      <circle cx="116" cy="216" r="5"/>
      <circle cx="274" cy="216" r="5"/>
    </g>`);

// D11: the phone
const D11 = derived(`
    <circle cx="64" cy="58" r="72" fill="var(--deep-raised)"/>
    <rect x="132" y="34" width="126" height="224" rx="16" fill="var(--bone)"/>
    <rect x="142" y="52" width="106" height="182" rx="4" fill="var(--deep)"/>
    <path d="M172 52l26 62-34 18 40 44-18 58" stroke="var(--bone)" stroke-width="3" fill="none"/>
    <path d="M198 114l50-24M164 132l-22 20M204 176l44 24" stroke="var(--bone)" stroke-width="2" fill="none"/>
    <rect x="180" y="242" width="30" height="5" rx="2.5" fill="var(--paper-shadow)"/>
    <rect x="288" y="130" width="36" height="66" rx="5" fill="var(--paper-dim)"/>
    <rect x="292" y="140" width="28" height="42" rx="2" fill="var(--vermilion)"/>
    <rect x="298" y="124" width="16" height="8" rx="3" fill="var(--paper-dim)"/>`);

// D12: your sister asked you first
const D12 = derived(`
    <circle cx="326" cy="60" r="78" fill="var(--deep-raised)"/>
    <circle cx="132" cy="96" r="30" fill="var(--bone)"/>
    <path d="M92 250v-52c0-22 18-38 40-38s40 16 40 38v52Z" fill="var(--bone)"/>
    <circle cx="256" cy="130" r="24" fill="var(--paper-dim)"/>
    <path d="M224 250v-42c0-18 14-32 32-32s32 14 32 32v42Z" fill="var(--paper-dim)"/>
    <circle cx="256" cy="106" r="7" fill="var(--marigold)"/>
    <path d="M186 176h22" stroke="var(--paper-line)" stroke-width="3" stroke-linecap="round" stroke-dasharray="2 9"/>`);

// D13: the first appraisal, as an envelope
const D13 = derived(`
    <circle cx="326" cy="60" r="78" fill="var(--deep-raised)"/>
    <rect x="88" y="86" width="214" height="140" rx="4" fill="var(--bone)"/>
    <path d="M88 90l107 74 107-74" fill="none" stroke="var(--paper-line)" stroke-width="3"/>
    <path d="M88 222l82-58M302 222l-82-58" fill="none" stroke="var(--paper-shadow)" stroke-width="2"/>
    <rect x="128" y="104" width="134" height="52" rx="3" fill="var(--paper-dim)"/>
    <rect x="146" y="120" width="70" height="7" rx="2" fill="var(--paper-line)"/>
    <rect x="146" y="136" width="44" height="7" rx="2" fill="var(--paper-line)"/>
    <circle cx="238" cy="130" r="13" fill="var(--marigold)"/>`);

// D14: the bonus, and the thing not asked
const D14 = derived(`
    <circle cx="70" cy="58" r="72" fill="var(--deep-raised)"/>
    <rect x="46" y="150" width="298" height="12" rx="4" fill="var(--bone)"/>
    <rect x="62" y="162" width="14" height="72" fill="var(--paper-shadow)"/>
    <rect x="314" y="162" width="14" height="72" fill="var(--paper-shadow)"/>
    <circle cx="132" cy="126" r="30" fill="var(--bone)"/>
    <circle cx="132" cy="126" r="20" fill="var(--marigold)"/>
    <circle cx="212" cy="126" r="30" fill="var(--bone)"/>
    <circle cx="212" cy="126" r="20" fill="var(--paper-dim)"/>
    <circle cx="292" cy="130" r="22" fill="var(--paper-dim)"/>
    <rect x="266" y="60" width="52" height="58" rx="4" fill="var(--paper-shadow)"/>
    <rect x="272" y="66" width="40" height="46" rx="2" fill="var(--deep)"/>`);

// D15: gold, for a wedding nobody has mentioned
const D15 = derived(`
    <circle cx="322" cy="228" r="76" fill="var(--deep-raised)"/>
    <rect x="92" y="118" width="206" height="118" rx="8" fill="var(--bone)"/>
    <rect x="84" y="96" width="222" height="30" rx="6" fill="var(--paper-dim)"/>
    <rect x="110" y="140" width="170" height="78" rx="6" fill="var(--vermilion)"/>
    <circle cx="156" cy="180" r="30" fill="none" stroke="var(--marigold)" stroke-width="9"/>
    <circle cx="234" cy="180" r="30" fill="none" stroke="var(--marigold)" stroke-width="9"/>
    <circle cx="195" cy="180" r="18" fill="none" stroke="var(--marigold)" stroke-width="7"/>
    <rect x="186" y="88" width="18" height="12" rx="3" fill="var(--paper-shadow)"/>`);

// D16: the first monthly investment
const D16 = derived(`
    <circle cx="68" cy="60" r="70" fill="var(--deep-raised)"/>
    <g fill="var(--paper-dim)">
      <path d="M232 206h44l-6 44h-32Z"/>
      <path d="M290 206h44l-6 44h-32Z"/>
    </g>
    <path d="M104 196h74l-9 58h-56Z" fill="var(--bone)"/>
    <rect x="98" y="182" width="86" height="18" rx="4" fill="var(--bone)"/>
    <path d="M141 182v-46" stroke="var(--bone)" stroke-width="6" stroke-linecap="round"/>
    <path d="M141 152c-16 0-26-10-26-24 16 0 26 10 26 24Z" fill="var(--bone)"/>
    <path d="M141 140c16 0 26-10 26-24-16 0-26 10-26 24Z" fill="var(--bone)"/>
    <circle cx="141" cy="108" r="9" fill="var(--marigold)"/>
    <rect x="88" y="252" width="250" height="4" rx="2" fill="var(--paper-shadow)"/>`);

// D17: a card you did not ask for
const D17 = derived(`
    <circle cx="326" cy="62" r="78" fill="var(--deep-raised)"/>
    <rect x="74" y="110" width="192" height="102" rx="8" fill="var(--paper-dim)" transform="rotate(-6 170 161)"/>
    <rect x="96" y="82" width="196" height="120" rx="10" fill="var(--bone)"/>
    <rect x="96" y="106" width="196" height="24" fill="var(--deep)"/>
    <rect x="114" y="150" width="40" height="30" rx="5" fill="var(--marigold)"/>
    <path d="M114 160h40M134 150v30" stroke="var(--bone)" stroke-width="2"/>
    <g fill="var(--paper-line)">
      <rect x="170" y="158" width="28" height="7" rx="2"/>
      <rect x="206" y="158" width="28" height="7" rx="2"/>
      <rect x="242" y="158" width="28" height="7" rx="2"/>
      <rect x="170" y="176" width="54" height="7" rx="2"/>
    </g>
    <rect x="74" y="212" width="192" height="14" rx="4" fill="var(--paper-shadow)" transform="rotate(-6 170 219)"/>`);

// D18: march, and three weeks
const D18 = derived(`
    <circle cx="70" cy="234" r="72" fill="var(--deep-raised)"/>
    <rect x="96" y="70" width="158" height="188" rx="4" fill="var(--paper-dim)" transform="rotate(-7 175 164)"/>
    <rect x="120" y="58" width="158" height="188" rx="4" fill="var(--bone)"/>
    <g fill="var(--paper-line)">
      <rect x="142" y="88" width="114" height="8" rx="2"/>
      <rect x="142" y="108" width="114" height="8" rx="2"/>
      <rect x="142" y="128" width="82" height="8" rx="2"/>
      <rect x="142" y="162" width="114" height="8" rx="2"/>
      <rect x="142" y="182" width="66" height="8" rx="2"/>
    </g>
    <rect x="142" y="212" width="74" height="14" rx="3" fill="var(--deep)"/>
    <circle cx="292" cy="196" r="46" fill="var(--bone)"/>
    <circle cx="292" cy="196" r="38" fill="var(--paper-dim)"/>
    <path d="M292 196V168" stroke="var(--deep)" stroke-width="5" stroke-linecap="round"/>
    <path d="M292 196l24 12" stroke="var(--vermilion)" stroke-width="5" stroke-linecap="round"/>
    <circle cx="292" cy="196" r="5" fill="var(--deep)"/>`);

// D19: the roof, before the monsoon
const D19 = derived(`
    <circle cx="64" cy="56" r="66" fill="var(--deep-raised)"/>
    <rect x="116" y="146" width="164" height="106" fill="var(--bone)"/>
    <path d="M98 146L198 76l100 70Z" fill="var(--paper-dim)"/>
    <path d="M186 96l-26 18 30 14-24 18" stroke="var(--vermilion)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="146" y="180" width="42" height="42" fill="var(--deep)"/>
    <rect x="212" y="180" width="42" height="72" fill="var(--paper-shadow)"/>
    <g stroke="var(--teal)" stroke-width="5" stroke-linecap="round">
      <path d="M310 84v30"/>
      <path d="M338 106v30"/>
      <path d="M306 140v26"/>
      <path d="M342 166v24"/>
      <path d="M314 196v22"/>
    </g>`);

// D20: the colleague's screen
const D20 = derived(`
    <circle cx="70" cy="60" r="70" fill="var(--deep-raised)"/>
    <rect x="128" y="40" width="136" height="216" rx="16" fill="var(--bone)"/>
    <rect x="140" y="60" width="112" height="176" rx="4" fill="var(--deep)"/>
    <path d="M152 200l26-22 24 14 26-44 22-26" stroke="var(--marigold)" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="250" cy="122" r="7" fill="var(--marigold)"/>
    <g fill="var(--paper-line)">
      <rect x="152" y="76" width="44" height="7" rx="2"/>
      <rect x="152" y="92" width="28" height="7" rx="2"/>
    </g>
    <path d="M296 168c0-12 8-20 20-20h38v56h-38c-12 0-20-8-20-20Z" fill="var(--paper-dim)"/>
    <rect x="296" y="200" width="58" height="14" rx="7" fill="var(--paper-shadow)"/>`);

// D21: cover for people who do not exist yet
const D21 = derived(`
    <circle cx="326" cy="228" r="74" fill="var(--deep-raised)"/>
    <path d="M214 50c-8 0-14 6-16 14l-36 146 26 8 36-146c2-8-2-18-10-22Z" fill="var(--bone)"/>
    <path d="M188 218l26 8-6 20-26-8Z" fill="var(--paper-dim)"/>
    <path d="M178 246c-6 18 4 30 18 26" stroke="var(--paper-shadow)" stroke-width="9" stroke-linecap="round" fill="none"/>
    <rect x="176" y="104" width="34" height="9" rx="4" transform="rotate(14 193 108)" fill="var(--marigold)"/>
    <rect x="166" y="150" width="34" height="9" rx="4" transform="rotate(14 183 154)" fill="var(--marigold)"/>
    <path d="M214 46c0-8 6-14 14-14s14 6 14 14" stroke="var(--bone)" stroke-width="7" fill="none" stroke-linecap="round"/>
    <g fill="var(--paper-shadow)">
      <circle cx="92" cy="176" r="5"/>
      <circle cx="118" cy="212" r="5"/>
      <circle cx="86" cy="236" r="5"/>
    </g>`);

// D22: the scooter
const D22 = derived(`
    <circle cx="64" cy="58" r="68" fill="var(--deep-raised)"/>
    <circle cx="112" cy="196" r="38" fill="var(--paper-shadow)"/>
    <circle cx="112" cy="196" r="20" fill="var(--bone)"/>
    <circle cx="288" cy="196" r="38" fill="var(--paper-shadow)"/>
    <circle cx="288" cy="196" r="20" fill="var(--bone)"/>
    <path d="M112 196c0-34 18-54 48-58l58-6c16-2 26 6 30 20l10 34c4 14-4 24-18 24Z" fill="var(--marigold)"/>
    <path d="M160 138l-8-46h-26" stroke="var(--bone)" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M126 88h48" stroke="var(--bone)" stroke-width="9" stroke-linecap="round"/>
    <path d="M192 132h70c10 0 16 6 16 14h-86Z" fill="var(--bone)"/>
    <rect x="244" y="156" width="46" height="14" rx="6" fill="var(--paper-dim)"/>`);

// D23: your mother asked
const D23 = derived(`
    <circle cx="322" cy="62" r="76" fill="var(--deep-raised)"/>
    <rect x="110" y="150" width="176" height="86" rx="10" fill="var(--bone)"/>
    <rect x="132" y="170" width="132" height="46" rx="6" fill="var(--paper-dim)"/>
    <g fill="var(--paper-shadow)">
      <circle cx="154" cy="182" r="6"/><circle cx="176" cy="182" r="6"/><circle cx="198" cy="182" r="6"/>
      <circle cx="154" cy="204" r="6"/><circle cx="176" cy="204" r="6"/><circle cx="198" cy="204" r="6"/>
      <circle cx="232" cy="182" r="6"/><circle cx="232" cy="204" r="6"/>
    </g>
    <path d="M96 116c0-14 10-24 24-24h156c14 0 24 10 24 24v14h-46c0-10-8-18-18-18h-76c-10 0-18 8-18 18H96Z" fill="var(--bone)"/>
    <path d="M96 116h46v20H96Z" fill="var(--marigold)"/>
    <path d="M254 116h46v20h-46Z" fill="var(--marigold)"/>
    <g stroke="var(--paper-shadow)" stroke-width="4" fill="none" stroke-linecap="round">
      <path d="M320 132c10 0 18 8 18 18"/>
      <path d="M332 118c18 0 32 14 32 32"/>
    </g>`);

// D24: stay, or forty minutes further
const D24 = derived(`
    <circle cx="326" cy="228" r="72" fill="var(--deep-raised)"/>
    <rect x="56" y="76" width="96" height="160" rx="4" fill="var(--bone)"/>
    <rect x="72" y="96" width="64" height="140" fill="var(--deep)"/>
    <circle cx="122" cy="168" r="6" fill="var(--paper-shadow)"/>
    <rect x="250" y="112" width="78" height="124" rx="4" fill="var(--paper-dim)"/>
    <rect x="264" y="128" width="50" height="108" fill="var(--deep)"/>
    <circle cx="304" cy="184" r="5" fill="var(--paper-shadow)"/>
    <path d="M156 236h92" stroke="var(--paper-shadow)" stroke-width="5" stroke-linecap="round" stroke-dasharray="14 14"/>
    <g fill="var(--paper-line)">
      <rect x="172" y="196" width="10" height="24" rx="3"/>
      <rect x="196" y="186" width="10" height="34" rx="3"/>
      <rect x="220" y="204" width="10" height="16" rx="3"/>
    </g>`);

// D25: four weddings in six weeks
const D25 = derived(`
    <circle cx="66" cy="228" r="70" fill="var(--deep-raised)"/>
    <rect x="74" y="80" width="130" height="164" rx="4" fill="var(--paper-shadow)" transform="rotate(-9 139 162)"/>
    <rect x="102" y="70" width="130" height="164" rx="4" fill="var(--paper-dim)" transform="rotate(-4 167 152)"/>
    <rect x="130" y="62" width="130" height="164" rx="4" fill="var(--bone)"/>
    <rect x="158" y="56" width="130" height="164" rx="4" fill="var(--bone)"/>
    <rect x="170" y="68" width="106" height="140" rx="2" fill="none" stroke="var(--marigold)" stroke-width="3"/>
    <circle cx="223" cy="110" r="17" fill="var(--marigold)"/>
    <circle cx="223" cy="110" r="9" fill="var(--bone)"/>
    <g fill="var(--paper-line)">
      <rect x="186" y="146" width="74" height="7" rx="2"/>
      <rect x="200" y="162" width="46" height="7" rx="2"/>
    </g>
    <rect x="192" y="186" width="62" height="8" rx="2" fill="var(--deep)"/>`);

// D26: two offers, and the job you have
const D26 = derived(`
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
    <circle cx="226" cy="112" r="13" fill="var(--paper-dim)"/>`);

// D27: the income went up, the investing did not
const D27 = derived(`
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
    <path d="M135 70l8-10 8 10" stroke="var(--paper-shadow)" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);

// D28: friday, 3pm
const D28 = derived(`
    <circle cx="326" cy="228" r="74" fill="var(--deep-raised)"/>
    <rect x="56" y="180" width="278" height="12" rx="4" fill="var(--bone)"/>
    <rect x="74" y="192" width="14" height="66" fill="var(--paper-shadow)"/>
    <rect x="302" y="192" width="14" height="66" fill="var(--paper-shadow)"/>
    <path d="M132 108h116l-10 72H142Z" fill="var(--paper-dim)"/>
    <path d="M124 96h132v16H124Z" fill="var(--bone)"/>
    <path d="M162 96v84M218 96v84" stroke="var(--paper-shadow)" stroke-width="3"/>
    <rect x="266" y="150" width="46" height="30" rx="3" fill="var(--bone)"/>
    <circle cx="289" cy="165" r="8" fill="var(--paper-dim)"/>
    <rect x="286" y="136" width="6" height="16" fill="var(--paper-shadow)"/>`);

// D29: two months, and one offer on the table
const D29 = derived(`
    <circle cx="66" cy="60" r="70" fill="var(--deep-raised)"/>
    <rect x="72" y="70" width="118" height="180" fill="var(--paper-dim)"/>
    <rect x="88" y="86" width="86" height="164" fill="var(--deep)"/>
    <circle cx="160" cy="172" r="6" fill="var(--paper-shadow)"/>
    <rect x="216" y="70" width="112" height="180" fill="var(--bone)"/>
    <path d="M232 86h80v164h-80Z" fill="var(--deep)"/>
    <path d="M232 86l34 14v136l-34 14Z" fill="var(--bone)"/>
    <circle cx="256" cy="172" r="5" fill="var(--deep)"/>
    <rect x="60" y="250" width="280" height="5" rx="2" fill="var(--paper-shadow)"/>`);

// D30: paid on time for eight months
const D30 = derived(`
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
    <rect x="56" y="240" width="182" height="5" rx="2" fill="var(--paper-shadow)"/>`);

const ILLUSTRATIONS = {
  D01, D02, D03, D04, D05, D06, D07, D08, D09, D10, D11, D12, D13, D14, D15,
  D16, D17, D18, D19, D20, D21, D22, D23, D24, D25, D26, D27, D28, D29, D30,
};

// The colour block, with the drawing in it when the decision has one
export function illustration(decisionId, form) {
  const block = document.createElement("div");
  block.className = `illo illo-${form}`;
  const drawing = ILLUSTRATIONS[decisionId];
  if (drawing) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", VIEWBOX);
    // On a short screen the block is wider than the drawing's shape. The whole drawing fits
    // inside it rather than being cropped: the block is the ground colour, so the sides blend
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.setAttribute("fill", "none");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = drawing[form];
    block.append(svg);
  }
  return block;
}
