// UI wiring: keypad, keyboard, history, memory, theme, paywall locks.
import { evaluate, needsPro, setAngle, getAngle, getScope, resetScope, math, format } from './engine.js';
import { isPro, reset, showUpgrade } from './paywall.js';
import { initPanels } from './panels.js';

const $ = (id) => document.getElementById(id);
const expr = $('expr'), result = $('result');
const safeGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } };

let memory = 0;
let justEvaluated = false;
let history = [];
try { history = JSON.parse(safeGet('history') || '[]'); } catch { history = []; }
if (!Array.isArray(history)) history = [];

// ---- Key definitions: [label, insert, aria-label, class] ----
const KEYS = [
  ['AC', 'clear', 'Clear all', 'op'], ['(', '(', 'Open parenthesis'], [')', ')', 'Close parenthesis'], ['%', '%', 'Percent', 'op'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '÷', 'Divide', 'op'],
  ['4', '4'], ['5', '5'], ['6', '6'], ['×', '×', 'Multiply', 'op'],
  ['1', '1'], ['2', '2'], ['3', '3'], ['−', '−', 'Subtract', 'op'],
  ['±', 'neg', 'Change sign', 'op'], ['0', '0'], ['.', '.', 'Decimal point'], ['+', '+', 'Add', 'op'],
  ['=', 'eval', 'Equals', 'eq'],
];
const MEM = [['MC', 'mc', 'Memory clear'], ['MR', 'mr', 'Memory recall'], ['M+', 'mplus', 'Memory add'], ['M−', 'mminus', 'Memory subtract'], ['⌫', 'back', 'Backspace']];

const SCI = {
  Trigonometry: [['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['sin⁻¹', 'asin('], ['cos⁻¹', 'acos('], ['tan⁻¹', 'atan('],
    ['sinh', 'sinh('], ['cosh', 'cosh('], ['tanh', 'tanh('], ['sinh⁻¹', 'asinh('], ['cosh⁻¹', 'acosh('], ['tanh⁻¹', 'atanh(']],
  Functions: [['log', 'log10('], ['ln', 'ln('], ['log₂', 'log2('], ['eˣ', 'e^('], ['10ˣ', '10^('], ['xʸ', '^'],
    ['√', '√('], ['∛', '∛('], ['ʸ√x', 'nthRoot('], ['n!', '!'], ['|x|', 'abs('], ['mod', ' mod '], ['ans', 'ans'], [',', ',']],
  Constants: [['π', 'π'], ['e', 'e'], ['φ', 'φ'], ['c', 'c'], ['h', 'h'], ['G', 'G'], ['Nₐ', 'Na'], ['k', 'k'], ['i', 'i']],
  'Complex, bases and bitwise': [['0b', '0b'], ['0o', '0o'], ['0x', '0x'], ['AND', ' AND '], ['OR', ' OR '], ['XOR', ' XOR '], ['NOT', 'NOT '], ['<<', ' << '], ['>>', ' >> '], ['=', ' = ']],
};
// π is free (implicit multiplication such as 2π); everything else in SCI is Pro.

function keyButton([label, act, aria, cls = ''], locked = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = `k ${cls} ${locked ? 'locked' : ''}`.trim();
  b.textContent = label;
  b.setAttribute('aria-label', locked ? `${aria || label}, Pro feature, locked` : aria || label);
  if (locked) b.setAttribute('aria-disabled', 'true');
  b.dataset.act = act;
  b.dataset.name = aria || label;
  return b;
}

function buildKeys() {
  $('keys').replaceChildren(...KEYS.map((k) => keyButton(k)));
  $('memrow').replaceChildren(...MEM.map((k, i) => {
    const b = keyButton(k);
    if (i < 4) b.setAttribute('aria-keyshortcuts', `Alt+${i + 1}`);
    return b;
  }));
  const pro = isPro();
  const sci = $('scikeys');
  sci.replaceChildren();
  for (const [title, keys] of Object.entries(SCI)) {
    const h = document.createElement('h3'); h.textContent = title;
    const g = document.createElement('div'); g.className = 'kgrid';
    g.replaceChildren(...keys.map(([l, ins]) => keyButton([l, ins, l, 'fn'], !pro && l !== 'π')));
    sci.append(h, g);
  }
  const angle = $('angle');
  angle.replaceChildren(...['deg', 'rad', 'grad'].map((m) => {
    const b = document.createElement('button');
    b.type = 'button'; b.role = 'radio'; b.dataset.angle = m; b.textContent = m.toUpperCase();
    b.setAttribute('aria-checked', String(getAngle() === m));
    if (!pro) { b.className = 'locked'; b.setAttribute('aria-disabled', 'true'); }
    return b;
  }));
}

// ---- Editing helpers ----
function insert(text) {
  if (justEvaluated) {
    const startsOp = /^[+×÷−^!%]|^ (mod|AND|OR|XOR|<<|>>)/.test(text);
    expr.value = startsOp ? 'ans' : '';
    justEvaluated = false;
  }
  const s = expr.selectionStart ?? expr.value.length, e = expr.selectionEnd ?? s;
  expr.setRangeText(text, s, e, 'end');
  expr.focus();
  preview();
}

function setResult(text, cls = '') {
  result.className = `result ${cls}`.trim();
  result.textContent = text;
}

function preview() {
  if (!expr.value.trim()) return setResult('0');
  if (needsPro(expr.value) && !isPro()) return setResult('Pro', '');
  try { setResult(evaluate(expr.value, false).text || '0'); } catch { /* incomplete input: keep last preview */ }
}

function commit() {
  const src = expr.value.trim();
  if (!src) return;
  if (!isPro() && needsPro(src)) return showUpgrade('Scientific functions', refresh);
  try {
    const { text } = evaluate(src);
    setResult(text, 'final pop');
    justEvaluated = true;
    addHistory(src, text);
    renderDefined();
  } catch (err) {
    setResult(err.message, 'err');
  }
}

function currentValue() {
  if (!isPro() && needsPro(expr.value)) return NaN;
  try { return math.number(evaluate(expr.value || '0', false).value); } catch { return NaN; }
}

// True when value is exactly `−( ... )` with the first "(" closing at the very end.
function wrapped(v) {
  if (!v.startsWith('−(')) return false;
  let depth = 0;
  for (let i = 1; i < v.length; i++) {
    if (v[i] === '(') depth++;
    else if (v[i] === ')' && --depth === 0) return i === v.length - 1;
  }
  return false;
}

function act(a) {
  switch (a) {
    case 'clear': expr.value = ''; justEvaluated = false; setResult('0'); expr.focus(); return;
    case 'back': expr.value = expr.value.slice(0, -1); justEvaluated = false; preview(); return;
    case 'neg': expr.value = wrapped(expr.value) ? expr.value.slice(2, -1) : expr.value ? `−(${expr.value})` : ''; preview(); return;
    case 'eval': return commit();
    case 'mc': memory = 0; break;
    case 'mr': insert(String(memory)); break;
    case 'mplus': case 'mminus': {
      const v = currentValue();
      if (!Number.isFinite(v)) return setResult('Memory needs a number', 'err');
      memory += a === 'mplus' ? v : -v;
      break;
    }
    default: return insert(a);
  }
  $('memrow').firstElementChild.classList.toggle('on', memory !== 0);
  annunciators();
  $('memrow').children[1].title = `Memory: ${format(memory)}`;
}

// ---- History ----
function addHistory(e, r) {
  history.push({ e, r });
  if (!isPro()) history = history.slice(-20);
  safeSet('history', JSON.stringify(history));
  renderHistory();
}

function historyCsv() {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  return ['expression,result', ...history.map((h) => `${q(h.e)},${q(h.r)}`)].join('\n');
}

function renderHistory() {
  const list = isPro() ? history : history.slice(-20);
  $('histempty').hidden = list.length > 0;
  $('history').replaceChildren(...list.slice().reverse().map((h) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', `Reuse ${h.e} equals ${h.r}`);
    const e = document.createElement('span'); e.className = 'he'; e.textContent = h.e;
    const r = document.createElement('span'); r.className = 'hr'; r.textContent = `= ${h.r}`;
    b.append(e, r);
    b.addEventListener('click', () => { expr.value = h.e; justEvaluated = false; expr.focus(); preview(); });
    li.append(b);
    return li;
  }));
}

function renderHistTools() {
  const pro = isPro();
  const mk = (label, fn) => {
    const b = keyButton([label, label, `${label} history`], !pro);
    b.addEventListener('click', () => (pro ? fn() : showUpgrade('History export', refresh)));
    return b;
  };
  $('histtools').replaceChildren(
    mk('CSV', () => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([historyCsv()], { type: 'text/csv' }));
      a.download = 'calc-history.csv'; a.click(); URL.revokeObjectURL(a.href);
    }),
    mk('Copy', () => navigator.clipboard?.writeText(historyCsv())),
  );
}

function renderDefined() {
  const names = Object.entries(getScope()).filter(([k]) => !['pi', 'e', 'phi', 'c', 'h', 'G', 'Na', 'k', 'ans'].includes(k));
  const el = $('defined');
  el.hidden = !names.length;
  el.textContent = names.map(([k, v]) => (typeof v === 'function' ? `${k}(…)` : `${k} = ${format(v)}`)).join('  ·  ');
}

// ---- Wiring ----
function annunciators() {
  $('an-angle').textContent = getAngle().toUpperCase();
  $('an-mem').classList.toggle('on', memory !== 0);
  $('an-pro').classList.toggle('on', isPro());
}

function refresh() {
  const pro = isPro();
  annunciators();
  $('badge').hidden = !pro;
  $('upgrade').hidden = pro;
  $('reset').hidden = !pro;
  buildKeys();
  renderHistTools();
  renderHistory();
  panels.refresh();
}

document.addEventListener('click', (e) => {
  const k = e.target.closest('.k[data-act]');
  if (k && k.closest('#keys, #memrow, #scikeys')) {
    if (k.getAttribute('aria-disabled') === 'true') return showUpgrade(k.dataset.name, refresh);
    return act(k.dataset.act);
  }
  const a = e.target.closest('#angle button');
  if (a) {
    if (!isPro()) return showUpgrade('Angle modes', refresh);
    setAngle(a.dataset.angle);
    for (const b of $('angle').children) b.setAttribute('aria-checked', String(b === a));
    annunciators();
    preview();
  }
});

expr.addEventListener('input', () => { justEvaluated = false; preview(); });
expr.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') { e.preventDefault(); commit(); }
  else if (e.key === 'Escape') act('clear');
});
document.addEventListener('keydown', (e) => {
  const dm = /^Digit([1-4])$/.exec(e.code);
  if (e.altKey && dm) { e.preventDefault(); act(MEM[dm[1] - 1][1]); return; }
  const t = e.target;
  const editing = t.closest?.('input, textarea, select, dialog, button, [role=tab], [role=radio]');
  if (!editing && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) expr.focus();
});

$('upgrade').addEventListener('click', () => showUpgrade('', refresh));
$('reset').addEventListener('click', () => { reset(); resetScope(); renderDefined(); history = history.slice(-20); refresh(); });
$('theme').addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  safeSet('theme', t);
  panels.redraw();
});

const panels = initPanels($('tabs'), $('panel'), refresh);
refresh();
renderDefined();
expr.focus();
