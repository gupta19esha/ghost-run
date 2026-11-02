// The player's character on the road: a girl or a boy, flat shapes in the palette's tokens, drawn on
// the hero's figure's own artboard, so it stands wherever that figure stood. The choice is the
// save's. The pale form is the ghost's: the same shapes, in the ghost's colours.
//
// No DOM here: the markup is a string, for the game's road and the ghost's alike.

export const CHARACTERS = [
  { id: "girl", name: "Girl" },
  { id: "boy", name: "Boy" },
];
export const DEFAULT_CHARACTER = "girl";
export const CHARACTER_VIEWBOX = "529 224 38 76";

const FULL = { head: "var(--ink)", hair: "var(--bone)", girl: "var(--marigold)", boy: "var(--teal)", legs: "var(--bone)" };
const PALE = { head: "var(--ghost-fill, #E6EEF9)", hair: "var(--paper-line)", girl: "var(--ghost-fill, #E6EEF9)", boy: "var(--ghost-fill, #E6EEF9)", legs: "var(--paper-line)" };

export function characterMarkup(id, { pale = false } = {}) {
  const c = pale ? PALE : FULL;
  const head = `<circle cx="548" cy="238" r="12" fill="${c.head}"/>`;
  if (id === "boy") {
    return `<rect x="534" y="282" width="12" height="18" fill="${c.legs}"/><rect x="550" y="282" width="12" height="18" fill="${c.legs}"/>` +
      `<path d="M531 286v-16a17 17 0 0 1 34 0v16Z" fill="${c.boy}"/>${head}` +
      `<path d="M536 238a12 12 0 0 1 24 0c-7-5-17-5-24 0Z" fill="${c.hair}"/>`;
  }
  return `<rect x="539" y="286" width="6" height="14" fill="${c.legs}"/><rect x="551" y="286" width="6" height="14" fill="${c.legs}"/>` +
    `<path d="M534 238a14 14 0 0 1 28 0v16h-28Z" fill="${c.hair}"/>` +
    `<path d="M539 256h18l11 34h-40Z" fill="${c.girl}"/>${head}` +
    `<path d="M536 238a12 12 0 0 1 24 0c-7-4-17-4-24 0Z" fill="${c.hair}"/>`;
}
