// Pure logic for the Pro tool panels (units, bases, matrices, stats, solver). No DOM.
import { math, format, rawEvaluate } from './engine.js';

// ---- Units ----
export const UNITS = {
  Length: ['m', 'km', 'cm', 'mm', 'mile', 'yard', 'ft', 'inch'],
  Mass: ['kg', 'g', 'mg', 'lb', 'oz'],
  Temperature: ['degC', 'degF', 'K'],
  Time: ['s', 'minute', 'hour', 'day', 'week'],
  Data: ['bit', 'byte', 'kB', 'MB', 'GB', 'TB'],
};

export function convertUnit(value, from, to) {
  if (String(value).trim() === '' || !Number.isFinite(+value)) throw new Error('Enter a number to convert');
  return math.unit(+value, from).toNumber(to);
}

// ---- Bases ----
const RADIX = { BIN: 2, OCT: 8, DEC: 10, HEX: 16 };
export function convertBase(text, from) {
  const s = String(text).trim().toLowerCase();
  const r = RADIX[from];
  const digits = '0123456789abcdef'.slice(0, r);
  if (!s.replace(/^-/, '') || [...s.replace(/^-/, '')].some((ch) => !digits.includes(ch))) throw new Error(`Not a valid ${from} number`);
  const neg = s.startsWith('-');
  let n = 0n;
  for (const ch of s.replace(/^-/, '')) n = n * BigInt(r) + BigInt(digits.indexOf(ch));
  if (neg) n = -n;
  const out = {};
  for (const [name, radix] of Object.entries(RADIX)) out[name] = n.toString(radix).toUpperCase();
  return out;
}

// ---- Matrices ----
const parseM = (s) => {
  const v = rawEvaluate(s);
  if (!math.isMatrix(v) && !Array.isArray(v)) throw new Error('Matrix must look like [[1,2],[3,4]]');
  return v;
};
export const MATRIX_OPS = {
  'A + B': (a, b) => math.add(a, b),
  'A × B': (a, b) => math.multiply(a, b),
  'det A': (a) => math.det(a),
  'inv A': (a) => math.inv(a),
  'Aᵀ': (a) => math.transpose(a),
};
export function matrixOp(op, aText, bText) {
  const a = parseM(aText);
  const b = op.includes('B') ? parseM(bText) : undefined;
  return format(MATRIX_OPS[op](a, b));
}

// ---- Stats ----
export function parseList(s) {
  const xs = String(s).split(/[\s,;]+/).filter(Boolean).map(Number);
  if (!xs.length || xs.some((n) => !Number.isFinite(n))) throw new Error('Enter numbers separated by commas or spaces');
  return xs;
}
export function stats(list) {
  const xs = parseList(list);
  const sample = xs.length > 1; // sample variance is undefined for n = 1
  return {
    count: xs.length, mean: math.mean(xs), median: math.median(xs),
    variance: sample ? math.variance(xs) : undefined, stdDev: sample ? math.std(xs) : undefined,
  };
}
export function regression(xText, yText) {
  const x = parseList(xText), y = parseList(yText);
  if (x.length !== y.length || x.length < 2) throw new Error('X and Y need the same count, at least 2');
  const mx = math.mean(x), my = math.mean(y);
  const sxy = math.sum(x.map((v, i) => (v - mx) * (y[i] - my)));
  const sxx = math.sum(x.map((v) => (v - mx) ** 2));
  const syy = math.sum(y.map((v) => (v - my) ** 2));
  if (sxx === 0) throw new Error('X values must not all be equal');
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r: syy === 0 ? NaN : sxy / Math.sqrt(sxx * syy) };
}

// ---- Solver ----
// Polynomial roots via Durand–Kerner. Coefficients highest degree first.
export const MAX_DEGREE = 10;
export function polyRoots(text) {
  let c = parseList(text);
  while (c.length && c[0] === 0) c.shift();
  if (c.length < 2) throw new Error('Need at least 2 coefficients (e.g. 1 -3 2)');
  const n = c.length - 1;
  if (n > MAX_DEGREE) throw new Error(`Degree is limited to ${MAX_DEGREE}`);
  c = c.map((v) => v / c[0]);
  const P = (z) => c.reduce((acc, k) => math.add(math.multiply(acc, z), k), math.complex(0, 0));
  let r = Array.from({ length: n }, (_, i) => math.pow(math.complex(0.4, 0.9), i));
  let delta = NaN;
  for (let it = 0; it < 500; it++) {
    delta = 0;
    r = r.map((zi, i) => {
      let d = P(zi);
      for (let j = 0; j < n; j++) if (j !== i) d = math.divide(d, math.subtract(zi, r[j]));
      delta = Math.max(delta, math.abs(d));
      return math.subtract(zi, d);
    });
    if (delta < 1e-13) break;
  }
  // Repeated roots stall short of 1e-13 steps, so also accept a tiny relative residual |P(z)|. NaN fails.
  const sumC = c.reduce((a, k) => a + Math.abs(k), 0);
  const ok = (z) => math.abs(P(z)) <= 1e-9 * sumC * Math.max(1, math.abs(z)) ** n;
  if (!(delta < 1e-13) && !r.every(ok)) throw new Error('Roots did not converge');
  return r.map((z) => {
    const re = Math.abs(z.re) < 1e-9 ? 0 : z.re, im = Math.abs(z.im) < 1e-9 ? 0 : z.im;
    return format(im === 0 ? re : math.complex(re, im));
  });
}
export function solveSystem(aText, bText) {
  const a = parseM(aText), b = rawEvaluate(bText);
  const sol = math.lusolve(a, b);
  return math.flatten(math.matrix(sol)).toArray().map(format);
}
