// The chapter's progress (UI.md rule 10, ruled 31 October 2026): "Month N of 24" and a bar,
// counted in the chapter, not the whole game. The months closed fill it; the month being played
// is the next slot, a step lighter. Widths are shares of the chapter, so a chapter of any length
// fills the same track.
//
// On a phone it is a strip across the top of every screen of a month and Home (createStrip);
// on a desktop window the rail holds it, under where the player is (game/rail.js). Its colours
// are neutral: marigold is money, and teal and vermilion are how a bar moved.
//

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
  const done = node("div", "chapter-progress-done");
  const now = node("div", "chapter-progress-now");
  track.append(done, now);
  element.append(label, track);
  element.hidden = true;

  function set(progress) {
    element.hidden = !progress;
    if (!progress) return;
    const text = progressLabel(progress);
    label.textContent = text;
    track.setAttribute("aria-valuemax", String(progress.length));
    track.setAttribute("aria-valuenow", String(progress.done));
    track.setAttribute("aria-valuetext", text);
    const share = (months) => `${(months / progress.length) * 100}%`;
    done.style.width = share(progress.done);
    // The month being played, while it is not yet closed
    now.hidden = progress.done >= progress.index;
    now.style.left = share(progress.done);
    now.style.width = share(1);
  }

  return { element, set };
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
  };
}
