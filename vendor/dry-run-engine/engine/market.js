// The returns engine, SIMULATION-MATHS.md section 7:
//
//   return(instrument, month) = drift + damping × sigma_m × gaussian(seed, instrument, month)
//
// Everything here uses only + - × ÷, integer bit operations and Math.sqrt, which every
// JavaScript engine computes identically. Math.log, Math.exp and Math.cos are avoided: they are
// not guaranteed to the last bit across browsers, and ENGINE.md rule 3 needs the same run
// everywhere.

import CONSTANTS from "./constants.js";
import MARKET_SCRIPT from "./market-script.js";

const MONTHS_PER_YEAR = 12;
const UNIFORM_DRAWS = 12; // the sum of 12 uniforms minus 6 has mean 0 and variance 1
const TWO_TO_THE_32 = 4294967296;

// Fixed ids so a holding's noise depends only on seed, instrument and month, never on call order
const INSTRUMENT_ID = { equity: 1, small_cap: 2, gold: 3, liquid: 4 };

function mix32(h) {
  h ^= h >>> 16;
  h = Math.imul(h, 0x7feb352d);
  h ^= h >>> 15;
  h = Math.imul(h, 0x846ca68b);
  h ^= h >>> 16;
  return h >>> 0;
}

function hash32(seed, instrument, month, draw) {
  let h = mix32(seed ^ 0x9e3779b9);
  h = mix32(h ^ Math.imul(instrument, 0x85ebca6b));
  h = mix32(h ^ Math.imul(month, 0xc2b2ae35));
  return mix32(h ^ Math.imul(draw + 1, 0x27d4eb2f));
}

// A uniform number in [0, 1)
export function uniform(seed, instrument, month, draw) {
  return hash32(seed, INSTRUMENT_ID[instrument], month, draw) / TWO_TO_THE_32;
}

// The section 7 noise: the sum of twelve uniform draws minus 6. Mean 0, variance 1, bounded at ±6.
export function gaussian(seed, instrument, month) {
  if (!Number.isInteger(seed)) throw new Error(`The seed must be an integer, got ${JSON.stringify(seed)}`);
  let total = 0;
  for (let draw = 0; draw < UNIFORM_DRAWS; draw++) total += uniform(seed, instrument, month, draw);
  return total - UNIFORM_DRAWS / 2;
}

function inLessonWindow(instrument, month, script) {
  return script.lesson_windows.some(
    (w) => w.instrument === instrument && month >= w.months[0] && month <= w.months[1],
  );
}

function driftAndSigma(instrument, month, constants, script) {
  switch (instrument) {
    case "equity":
    case "small_cap": {
      const scripted = script.instruments[instrument];
      if (month < 1 || month > scripted.authored_through) {
        throw new Error(`The ${instrument} script is authored through month ${scripted.authored_through}, not month ${month} (section 7)`);
      }
      const sigma = instrument === "equity" ? constants.EQUITY_ANNUAL_SIGMA : constants.SMALL_CAP_ANNUAL_SIGMA;
      return { drift: scripted.monthly_drift[month - 1], annualSigma: sigma };
    }
    case "gold":
      return { drift: constants.GOLD_ANNUAL_RATE / MONTHS_PER_YEAR, annualSigma: constants.GOLD_ANNUAL_SIGMA };
    case "liquid":
      return { drift: constants.LIQUID_FUND_ANNUAL_RATE / MONTHS_PER_YEAR, annualSigma: constants.LIQUID_FUND_ANNUAL_SIGMA };
    default:
      throw new Error(`No return is defined for ${JSON.stringify(instrument)}`);
  }
}

// Gold's noise moves partly with broad equity's: rho × equity + sqrt(1 - rho²) × gold's own.
// Both parts have variance 1 and are independent, so the mix keeps variance 1.
function noiseFor(seed, instrument, month, constants) {
  if (instrument !== "gold") return gaussian(seed, instrument, month);
  const rho = constants.GOLD_EQUITY_CORRELATION;
  return rho * gaussian(seed, "equity", month) + Math.sqrt(1 - rho * rho) * gaussian(seed, "gold", month);
}

export function explainMonthlyReturn(seed, instrument, month, constants = CONSTANTS, script = MARKET_SCRIPT) {
  const { drift, annualSigma } = driftAndSigma(instrument, month, constants, script);
  const sigma_m = annualSigma / Math.sqrt(MONTHS_PER_YEAR);
  const damping = inLessonWindow(instrument, month, script) ? constants.NOISE_DAMPING : 1;
  const noise = noiseFor(seed, instrument, month, constants);
  return { drift, sigma_m, damping, noise, return: drift + damping * sigma_m * noise };
}

export function monthlyReturn(seed, instrument, month, constants = CONSTANTS, script = MARKET_SCRIPT) {
  return explainMonthlyReturn(seed, instrument, month, constants, script).return;
}
