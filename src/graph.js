// Canvas function plotter: zoom (wheel), pan (drag), trace (hover).
import { compileFn } from './engine.js';

export function createGraph(canvas, readout) {
  const ctx = canvas.getContext('2d');
  const view = { cx: 0, cy: 0, scale: 40 }; // scale = pixels per unit
  let fn = null;
  let mouse = null;

  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const toPx = (x, y) => [canvas.width / 2 + (x - view.cx) * view.scale, canvas.height / 2 - (y - view.cy) * view.scale];
  const toWorld = (px, py) => [view.cx + (px - canvas.width / 2) / view.scale, view.cy - (py - canvas.height / 2) / view.scale];

  function resize() {
    const r = canvas.getBoundingClientRect();
    const d = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(r.width * d));
    canvas.height = Math.max(1, Math.round(r.height * d));
    draw();
  }

  function draw() {
    const { width: w, height: h } = canvas;
    const d = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, w, h);
    const step = niceStep(60 / view.scale);
    ctx.lineWidth = d;
    ctx.font = `${11 * d}px Geist, sans-serif`;
    const [x0, y1] = toWorld(0, 0), [x1, y0] = toWorld(w, h);
    for (let i = Math.ceil(x0 / step); i * step <= x1; i++) { const x = +(i * step).toPrecision(12); line(x, y0, x, y1, i === 0 ? '--axis' : '--rule', x); }
    for (let i = Math.ceil(y0 / step); i * step <= y1; i++) { const y = +(i * step).toPrecision(12); line(x0, y, x1, y, i === 0 ? '--axis' : '--rule', null, y); }
    if (fn) plot(w);
    if (mouse && fn) trace(d);
  }

  function line(xa, ya, xb, yb, color, lx, ly) {
    const [a, b] = toPx(xa, ya), [c, e] = toPx(xb, yb);
    ctx.strokeStyle = css(color);
    ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, e); ctx.stroke();
    if (color === '--rule') {
      ctx.fillStyle = css('--muted');
      if (lx != null) ctx.fillText(+lx.toPrecision(4), a + 3, toPx(0, 0)[1] + 12);
      if (ly != null) ctx.fillText(+ly.toPrecision(4), toPx(0, 0)[0] + 4, b - 3);
    }
  }

  function plot(w) {
    ctx.strokeStyle = css('--plot');
    ctx.lineWidth = 2.5 * (window.devicePixelRatio || 1);
    ctx.beginPath();
    let pen = false, prev = 0;
    for (let px = 0; px <= w; px++) {
      const [x] = toWorld(px, 0);
      const y = fn(x);
      const [, py] = toPx(0, y);
      // break the line on gaps and vertical asymptotes
      if (!Number.isFinite(y) || Math.abs(py) > 1e5 || (pen && Math.abs(py - prev) > canvas.height * 2)) { pen = false; continue; }
      pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      pen = true; prev = py;
    }
    ctx.stroke();
  }

  function trace(d) {
    const [x] = toWorld(mouse.x, 0), y = fn(x);
    if (!Number.isFinite(y)) { readout.textContent = `x = ${+x.toFixed(4)}, undefined`; return; }
    const [px, py] = toPx(x, y);
    ctx.fillStyle = css('--plot');
    ctx.beginPath(); ctx.arc(px, py, 5 * d, 0, 7); ctx.fill();
    readout.textContent = `x = ${+x.toFixed(4)}, f(x) = ${+y.toPrecision(6)}`;
  }

  const rel = (e) => { const r = canvas.getBoundingClientRect(), d = canvas.width / r.width; return { x: (e.clientX - r.left) * d, y: (e.clientY - r.top) * d }; };
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => { drag = rel(e); canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointerup', () => { drag = null; });
  canvas.addEventListener('pointercancel', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { mouse = null; draw(); });
  canvas.addEventListener('pointermove', (e) => {
    mouse = rel(e);
    if (drag) { view.cx -= (mouse.x - drag.x) / view.scale; view.cy += (mouse.y - drag.y) / view.scale; drag = mouse; }
    draw();
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = rel(e), [wx, wy] = toWorld(p.x, p.y);
    view.scale = Math.min(5000, Math.max(2, view.scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
    const [nx, ny] = toWorld(p.x, p.y);
    view.cx += wx - nx; view.cy += wy - ny;
    draw();
  }, { passive: false });
  new ResizeObserver(resize).observe(canvas);

  return {
    plot(expr) { fn = expr.trim() ? compileFn(expr) : null; draw(); },
    reset() { Object.assign(view, { cx: 0, cy: 0, scale: 40 }); draw(); },
    zoom(f) { view.scale = Math.min(5000, Math.max(2, view.scale * f)); draw(); },
    redraw: draw,
  };
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw)), m = raw / p;
  return (m < 2 ? 1 : m < 5 ? 2 : 5) * p;
}
