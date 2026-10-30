// The ghost screen's sounds, synthesized with the Web Audio API: no files, no requests, nothing
// to license. All short and soft, sine and triangle waves under a gentle low-pass, nothing that
// bounces. The audio context starts on the first tap, as browsers require. Sound is on by
// default; the mute control's choice is remembered in localStorage when storage allows.

const KEY = "ghost-run:muted";
let context = null;
let master = null;
let muted = false;
try { muted = localStorage.getItem(KEY) === "1"; } catch {}

export const isMuted = () => muted;
export function setMuted(value) {
  muted = value;
  try { localStorage.setItem(KEY, value ? "1" : "0"); } catch {}
  if (master) master.gain.setTargetAtTime(value ? 0 : 1, context.currentTime, 0.02);
}

// Starts the context on the first interaction; later calls only resume it
export function unlock() {
  const Context = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
  if (!Context) return;
  if (!context) {
    context = new Context();
    master = context.createGain();
    master.gain.value = muted ? 0 : 1;
    const soften = context.createBiquadFilter();
    soften.type = "lowpass";
    soften.frequency.value = 2400;
    master.connect(soften).connect(context.destination);
  }
  if (context.state === "suspended") context.resume();
}
if (typeof document !== "undefined") document.addEventListener("pointerdown", unlock, { capture: true });

// One voice: a pitch, optionally gliding, under a short attack and an exponential release
function voice({ freq, to = freq, at = 0, length, peak, type = "sine", cutoff = null }) {
  if (!context || muted) return;
  const t0 = context.currentTime + 0.005 + at;
  const osc = context.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t0 + length * 0.8);
  const env = context.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(peak, t0 + Math.min(0.012, length / 4));
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  let out = env;
  if (cutoff) {
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    env.connect(filter);
    out = filter;
  }
  osc.connect(env);
  out.connect(master);
  osc.start(t0);
  osc.stop(t0 + length + 0.05);
}

const voices = {
  // A tap: a soft, short tick
  tap: () => voice({ freq: 1180, length: 0.05, peak: 0.035 }),
  // Choosing: two notes a fifth apart, rising
  confirm: () => {
    voice({ freq: 587.33, length: 0.14, peak: 0.05, type: "triangle", cutoff: 1800 });
    voice({ freq: 880, at: 0.07, length: 0.2, peak: 0.045, type: "triangle", cutoff: 1800 });
  },
  // A month closing: a low, short chord
  close: () => {
    for (const [freq, at] of [[392, 0], [493.88, 0.03], [587.33, 0.06]]) voice({ freq, at, length: 0.32, peak: 0.03, type: "triangle", cutoff: 1400 });
  },
  // A figure rising, or falling: a small glide each way, the fall shorter and lower
  rise: () => voice({ freq: 520, to: 700, length: 0.18, peak: 0.035 }),
  fall: () => voice({ freq: 480, to: 380, length: 0.13, peak: 0.03 }),
  // The ghost line finishing: warmer and longer, a low fifth with a soft octave over it
  ghost: () => {
    voice({ freq: 196, length: 1.1, peak: 0.07, type: "triangle", cutoff: 900 });
    voice({ freq: 293.66, at: 0.04, length: 1.0, peak: 0.045, type: "sine" });
    voice({ freq: 392, at: 0.1, length: 0.8, peak: 0.02, type: "sine" });
  },
};

// Each sound at most once in 90ms: a tap that finishes three bars at once rises once, not three
// times over itself
const last = {};
export const sound = Object.fromEntries(Object.entries(voices).map(([name, play]) => [name, () => {
  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - (last[name] ?? -Infinity) < 90) return;
  last[name] = now;
  play();
}]));

// A short buzz where the device has one, on choosing: feature-detected, never assumed. Not
// tied to the mute control, which is about sound
export function buzz(pattern = 12) {
  try { if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern); } catch {}
}
