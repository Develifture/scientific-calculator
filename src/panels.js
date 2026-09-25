// Tool panels: tabs and DOM for graph, matrix, stats, solver, units, base.
import { createGraph } from './graph.js';
import { UNITS, convertUnit, convertBase, MATRIX_OPS, matrixOp, stats, regression, polyRoots, solveSystem } from './tools.js';
import { format } from './engine.js';

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const field = (id, label, value = '') => `<label class="field">${label}<input id="${id}" value="${esc(value)}" autocomplete="off" spellcheck="false"></label>`;
const btn = (id, label) => `<button type="button" class="k tool-btn" id="${id}">${label}</button>`;
const opts = (arr) => arr.map((o) => `<option>${esc(o)}</option>`).join('');

// Show result of fn() in an output element; errors become readable messages, never crashes.
function run(out, fn) {
  try { out.textContent = fn(); out.classList.remove('err'); out.setAttribute('role', 'status'); } catch (e) {
    out.textContent = e.message || 'Something went wrong'; out.classList.add('err'); out.setAttribute('role', 'alert');
  }
}

const TABS = {
  Graph: (p) => {
    p.innerHTML = `<div class="row">${field('g-f', 'f(x) =', 'x^2/4 - 2')}${btn('g-plot', 'Plot')}${btn('g-in', 'Zoom in')}${btn('g-out', 'Zoom out')}${btn('g-reset', 'Reset view')}</div>
      <canvas id="g-canvas" role="img" aria-label="Function graph. Drag to pan, scroll to zoom, hover to trace."></canvas><p class="trace" id="g-read" aria-live="polite">Drag to pan, scroll to zoom, hover to trace.</p><p class="out err" id="g-err" role="alert" hidden></p>`;
    const g = createGraph(p.querySelector('#g-canvas'), p.querySelector('#g-read'));
    const err = p.querySelector('#g-err');
    const plot = () => { try { g.plot(p.querySelector('#g-f').value); err.hidden = true; } catch (e) { err.textContent = e.message; err.hidden = false; } };
    const on = (sel, ev, fn) => p.querySelector(sel).addEventListener(ev, fn);
    on('#g-plot', 'click', plot);
    on('#g-f', 'keydown', (e) => e.key === 'Enter' && plot());
    on('#g-in', 'click', () => g.zoom(1.5));
    on('#g-out', 'click', () => g.zoom(1 / 1.5));
    on('#g-reset', 'click', () => g.reset());
    plot();
    return g;
  },
  Matrix: (p) => {
    p.innerHTML = `<div class="row">${field('m-a', 'Matrix A', '[[1,2],[3,4]]')}${field('m-b', 'Matrix B', '[[0,1],[1,0]]')}</div>
      <div class="row">${Object.keys(MATRIX_OPS).map((o, i) => btn(`m-${i}`, o)).join('')}</div><p class="out" id="m-out" role="status">Pick an operation.</p>`;
    Object.keys(MATRIX_OPS).forEach((op, i) => {
      p.querySelector(`#m-${i}`).addEventListener('click', () => run(p.querySelector('#m-out'), () => matrixOp(op, p.querySelector('#m-a').value, p.querySelector('#m-b').value)));
    });
  },
  Stats: (p) => {
    p.innerHTML = `<div class="row">${field('s-x', 'Data (X)', '2, 4, 4, 4, 5, 5, 7, 9')}${field('s-y', 'Y values for regression (optional)', '')}${btn('s-go', 'Calculate')}</div><p class="out" id="s-out" role="status">Enter numbers separated by commas or spaces.</p>`;
    p.querySelector('#s-go').addEventListener('click', () => run(p.querySelector('#s-out'), () => {
      const s = stats(p.querySelector('#s-x').value);
      const f = (v) => (v === undefined ? 'needs at least 2 values' : format(v));
      let txt = `Count ${s.count}\nMean ${format(s.mean)}\nMedian ${format(s.median)}\nVariance (sample) ${f(s.variance)}\nStd dev (sample) ${f(s.stdDev)}`;
      const y = p.querySelector('#s-y').value.trim();
      if (y) { const r = regression(p.querySelector('#s-x').value, y); txt += `\n\nLinear fit: y = ${format(r.slope)}x ${r.intercept < 0 ? '−' : '+'} ${format(Math.abs(r.intercept))}\nCorrelation r = ${format(r.r)}`; }
      return txt;
    }));
  },
  Solve: (p) => {
    p.innerHTML = `<div class="row">${field('e-p', 'Polynomial coefficients, highest power first', '1 -3 2')}${btn('e-pgo', 'Find roots')}</div><p class="out" id="e-pout" role="status">x² − 3x + 2 = 0</p>
      <div class="row">${field('e-a', 'System matrix A', '[[2,1],[1,3]]')}${field('e-b', 'Right side b', '[3,5]')}${btn('e-sgo', 'Solve system')}</div><p class="out" id="e-sout" role="status">Solves A·x = b.</p>`;
    const list = (xs) => xs.map((r, i) => `x${i + 1} = ${r}`).join('\n');
    p.querySelector('#e-pgo').addEventListener('click', () => run(p.querySelector('#e-pout'), () => list(polyRoots(p.querySelector('#e-p').value))));
    p.querySelector('#e-sgo').addEventListener('click', () => run(p.querySelector('#e-sout'), () => list(solveSystem(p.querySelector('#e-a').value, p.querySelector('#e-b').value))));
  },
  Units: (p) => {
    p.innerHTML = `<div class="row"><label class="field">Category<select id="u-c">${opts(Object.keys(UNITS))}</select></label>${field('u-v', 'Value', '1')}
      <label class="field">From<select id="u-f"></select></label><label class="field">To<select id="u-t"></select></label></div><p class="out" id="u-out" role="status"></p>`;
    const $ = (s) => p.querySelector(s);
    const fill = () => { const l = UNITS[$('#u-c').value]; $('#u-f').innerHTML = opts(l); $('#u-t').innerHTML = opts(l); $('#u-t').selectedIndex = 1; calc(); };
    const calc = () => run($('#u-out'), () => `${$('#u-v').value} ${$('#u-f').value} = ${format(convertUnit($('#u-v').value, $('#u-f').value, $('#u-t').value))} ${$('#u-t').value}`);
    $('#u-c').addEventListener('change', fill);
    for (const s of ['#u-v', '#u-f', '#u-t']) $(s).addEventListener('input', calc);
    fill();
  },
  Base: (p) => {
    p.innerHTML = `<div class="row">${field('b-v', 'Number', '255')}<label class="field">Input base<select id="b-f"><option>DEC</option><option>BIN</option><option>OCT</option><option>HEX</option></select></label></div><p class="out" id="b-out" role="status"></p>
      <p class="trace">Bitwise operators (AND, OR, XOR, NOT, &lt;&lt;, &gt;&gt;) are on the scientific panel.</p>`;
    const calc = () => run(p.querySelector('#b-out'), () => Object.entries(convertBase(p.querySelector('#b-v').value, p.querySelector('#b-f').value)).map(([k, v]) => `${k}  ${v}`).join('\n'));
    p.querySelector('#b-v').addEventListener('input', calc); p.querySelector('#b-f').addEventListener('change', calc);
    calc();
  },
};

export function initPanels(tabsEl, panelEl) {
  let active = null, graph = null;
  const PANE_ID = 'tool-pane', tabId = (name) => `tab-${name.toLowerCase()}`;

  function select(name) {
    const hadFocus = tabsEl.contains(document.activeElement);
    active = name;
    graph = null;
    panelEl.replaceChildren();
    const pane = document.createElement('div');
    pane.id = PANE_ID;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', tabId(name));
    panelEl.append(pane);
    graph = TABS[name](pane) || null;
    paintTabs();
    if (hadFocus) tabsEl.querySelector('[tabindex="0"]')?.focus();
  }

  function paintTabs() {
    const names = Object.keys(TABS);
    tabsEl.replaceChildren(...names.map((name) => {
      const b = document.createElement('button');
      b.type = 'button'; b.role = 'tab'; b.textContent = name; b.id = tabId(name);
      b.className = 'tab';
      b.setAttribute('aria-selected', String(active === name));
      b.setAttribute('aria-controls', PANE_ID);
      b.tabIndex = name === active ? 0 : -1; // roving tabindex
      b.addEventListener('click', () => select(name));
      return b;
    }));
  }

  // Arrow keys move focus between tabs; Enter/Space activates (manual activation).
  tabsEl.addEventListener('keydown', (e) => {
    const tabs = [...tabsEl.querySelectorAll('[role=tab]')];
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    const next = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    for (const t of tabs) t.tabIndex = -1;
    tabs[next].tabIndex = 0;
    tabs[next].focus();
  });

  select('Graph');
  return { redraw() { graph?.redraw?.(); } };
}
