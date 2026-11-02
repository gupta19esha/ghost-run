// The chapter's progress (UI.md rule 10, ruled 31 October 2026): "Month N of 24" and a bar,
// counted in the chapter, not the whole game. The months closed fill it; the month being played
// is the next slot, a step lighter. Widths are shares of the chapter, so a chapter of any length
// fills the same track.
//
// On a phone it is a strip across the top of every screen of a month and Home (createStrip);
// on a desktop window the rail holds it, under where the player is (game/rail.js). Its colours
// are neutral: marigold is money, and teal and vermilion are how a bar moved.
//
// It is the way onto the road: setOpen(fn) makes the whole of it a button, with the road's mark at
// its end. Its label is the progress's own words. A screen on a timer passes null: it would move
// on underneath the road.

const node = (tag, className) => {
  const el = document.createElement(tag);
  el.className = className;
  return el;
};

export const progressLabel = ({ index, length }) => `Month ${index} of ${length}`;

// place: the engine's chapterPlace for the month on screen. closed: the last month closed, 0
// for none. Returns what the bar draws: the month in the chapter, the chapter's length, and how
// many of its months are closed
export function chapterProgress(month, place, closed) {
  if (!place) return null;
  const first = month - place.index + 1;
  const done = Math.min(place.length, Math.max(0, closed - first + 1));
  return { index: place.index, length: place.length, done };
}

// The label and the track, for the strip and the rail alike. set(progress) draws it; null hides it
export function createProgress(className) {
  const element = node("div", `chapter-progress ${className}`);
  const label = node("span", "chapter-progress-label");
  const track = node("div", "chapter-progress-track");
  track.setAttribute("role", "progressbar");
  track.setAttribute("aria-valuemin", "0");
  const open = node("button", "chapter-progress-open");
  open.type = "button";
  open.hidden = true;
  let onOpen = null;
  open.addEventListener("click", () => onOpen?.());
  const roadMark = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  roadMark.setAttribute("class", "chapter-progress-road");
  roadMark.setAttribute("viewBox", "0 0 14 14");
  roadMark.setAttribute("aria-hidden", "true");
  roadMark.innerHTML = `<rect x="3" width="8" height="14" rx="1" fill="currentColor" opacity="0.28"/><rect x="6.2" y="1" width="1.6" height="3" fill="currentColor"/><rect x="6.2" y="5.5" width="1.6" height="3" fill="currentColor"/><rect x="6.2" y="10" width="1.6" height="3" fill="currentColor"/>`;
  open.append(roadMark);
  const done = node("div", "chapter-progress-done");
  const now = node("div", "chapter-progress-now");
  track.append(done, now);
  element.append(label, track, open);
  element.hidden = true;

  function set(progress) {
    element.hidden = !progress;
    if (!progress) return;
    const text = progressLabel(progress);
    label.textContent = text;
    track.setAttribute("aria-valuemax", String(progress.length));
    track.setAttribute("aria-valuenow", String(progress.done));
    track.setAttribute("aria-valuetext", text);
    open.setAttribute("aria-label", text);
    const share = (months) => `${(months / progress.length) * 100}%`;
    done.style.width = share(progress.done);
    // The month being played, while it is not yet closed
    now.hidden = progress.done >= progress.index;
    now.style.left = share(progress.done);
    now.style.width = share(1);
  }

  function setOpen(fn) {
    onOpen = fn;
    open.hidden = !fn;
    element.classList.toggle("is-open-able", Boolean(fn));
  }

  return { element, set, setOpen };
}

// The phone's strip, at the top of the page above the screens. While it shows, body has the
// class "progressed" and the screens take the rest of the window (style.css)
export function createStrip() {
  const strip = createProgress("chapter-progress-strip");
  return {
    element: strip.element,
    set(progress) {
      strip.set(progress);
      document.body.classList.toggle("progressed", Boolean(progress));
    },
    setOpen: strip.setOpen,
  };
}
