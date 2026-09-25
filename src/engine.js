// Math engine: thin wrapper over math.js. No DOM access, so it runs in Node tests too.
import { create, all } from 'mathjs';

export const math = create(all, {});

const FACTORS = { rad: 1, deg: Math.PI / 180, grad: Math.PI / 200 };
let angle = 'deg';

// Wrap trig so plain numbers use the current angle mode. Units and complex pass through.
const orig = {};
const FWD = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc'], INV = ['asin', 'acos', 'atan', 'acot', 'asec', 'acsc'];
for (const f of [...FWD, ...INV, 'atan2']) orig[f] = math[f];
const isNum = (x) => typeof x === 'number';
const wrapped = { ln: (x) => math.log(x), atan2: (y, x) => orig.atan2(y, x) / FACTORS[angle] };
for (const f of FWD) wrapped[f] = (x) => orig[f](isNum(x) ? x * FACTORS[angle] : x);
for (const f of INV) wrapped[f] = (x) => { const r = orig[f](x); return isNum(r) ? r / FACTORS[angle] : r; };
math.import(wrapped, { override: true });

// Keep private references, then disable functions that let an expression escape the sandbox
// or redefine math.js itself. The app never calls these from user expressions.
const { parse } = math;
export const rawEvaluate = math.evaluate;
const disabled = (name) => () => { throw new Error(`Function ${name} is disabled`); };
math.import(Object.fromEntries(['import', 'createUnit', 'evaluate', 'parse', 'compile', 'simplify', 'derivative', 'resolve']
  .map((n) => [n, disabled(n)])), { override: true });

export const setAngle = (mode) => { if (FACTORS[mode]) angle = mode; };
export const getAngle = () => angle;

// Physical constants (SI). Names match the keypad.
export const CONSTANTS = {
  pi: Math.PI, e: Math.E, phi: (1 + Math.sqrt(5)) / 2,
  c: 299792458, h: 6.62607015e-34, G: 6.6743e-11, Na: 6.02214076e23, k: 1.380649e-23,
};

// One shared scope: constants, `ans`, user variables and user functions live here.
const scope = { ...CONSTANTS };
export const getScope = () => scope;
export const resetScope = () => {
  for (const k of Object.keys(scope)) if (!(k in CONSTANTS)) delete scope[k];
  Object.assign(scope, CONSTANTS);
};

// Turn display symbols into math.js syntax.
export function normalize(expr) {
  return String(expr)
    .replace(/×/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
    .replace(/π/g, 'pi').replace(/φ/g, 'phi')
    .replace(/√/g, 'sqrt').replace(/∛/g, 'cbrt')
    .replace(/(\d+(?:\.\d+)?|\.\d+|\))\s*%(?!\s*[\d(.a-z])/g, '($1/100)') // 50% -> 0.5; `5%3` stays mod
    .replace(/\bAND\b/g, '&').replace(/\bXOR\b/g, '^|').replace(/\bOR\b/g, '|').replace(/\bNOT\b/g, '~')
    .trim();
}

// Free tier allows only arithmetic, parentheses, %, ans, pi. Anything else is Pro.
const FREE_RE = /^(?:\d+(?:\.\d*)?(?:e[+-]?\d+)?|[\s.+\-*/()%]|ans|pi)*$/;
export const needsPro = (expr) => !FREE_RE.test(normalize(expr));

const MAX_DIGITS = 12;
export function format(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'function' || v?.syntax) return 'ƒ defined';
  return math.format(v, { precision: MAX_DIGITS, lowerExp: -7, upperExp: 12 });
}

// Returns { value, text }. Throws Error with a readable message on bad input.
// commit=false (live preview) runs on a scope copy so it never defines variables or sets ans.
export function evaluate(expr, commit = true) {
  const src = normalize(expr);
  if (!src) return { value: undefined, text: '' };
  try {
    const node = parse(src);
    guardConstants(node);
    const value = node.compile().evaluate(commit ? scope : { ...scope });
    if (!isFiniteValue(value)) throw new Error('Result is not a finite number');
    if (commit && value !== undefined && typeof value !== 'function') scope.ans = value;
    return { value, text: format(value) };
  } catch (err) {
    throw new Error(friendly(err));
  }
}

// Reject any assignment anywhere in the tree (e.g. `2+(pi=3)`) whose target is a protected name.
const PROTECTED = new Set([...Object.keys(CONSTANTS), 'ans', 'i']);
function guardConstants(node) {
  for (const n of node.filter((n) => n.isAssignmentNode || n.isFunctionAssignmentNode)) {
    const name = n.isAssignmentNode ? n.object.name ?? n.object.object?.name : n.name;
    if (PROTECTED.has(name)) throw new Error(`"${name}" is a constant and cannot be changed`);
  }
}

function isFiniteValue(v) {
  if (typeof v === 'number') return Number.isFinite(v);
  if (math.isComplex(v)) return Number.isFinite(v.re) && Number.isFinite(v.im);
  if (math.isMatrix(v) || Array.isArray(v)) return math.flatten(v).valueOf().every(isFiniteValue);
  return true;
}

function friendly(err) {
  const m = err?.message || 'Invalid expression';
  if (/Unexpected end of expression/.test(m)) return 'Expression is incomplete';
  if (/Parenthesis .* expected/.test(m)) return 'Missing parenthesis';
  if (/Undefined symbol (\w+)/.test(m)) return `Unknown name "${m.match(/Undefined symbol (\w+)/)[1]}"`;
  if (/Undefined function (\w+)/.test(m)) return `Unknown function "${m.match(/Undefined function (\w+)/)[1]}"`;
  if (/Value expected/.test(m)) return 'Expression is incomplete';
  return m.replace(/\s*\(char \d+\)/, '');
}

// Compile f(x) for graphing. Returns (x) => number, or NaN when undefined.
export function compileFn(expr) {
  const node = parse(normalize(expr));
  guardConstants(node);
  const code = node.compile();
  const s = { ...scope, x: 1 }; // one private scope per compiled fn; only x changes per call
  code.evaluate(s); // throws on unknown names/functions so callers can show the error
  return (x) => {
    try {
      s.x = x;
      const y = code.evaluate(s);
      return typeof y === 'number' ? y : NaN;
    } catch { return NaN; }
  };
}
