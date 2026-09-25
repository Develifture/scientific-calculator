# Calc — Free Scientific & Graphing Calculator (Open Source, Browser-Based)

**A free, open-source scientific and graphing calculator with an equation solver, matrices and statistics. It runs in any modern browser, works offline, and needs no account and no build step.**

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Vanilla JS](https://img.shields.io/badge/vanilla-JS-f7df1e.svg)
![No build step](https://img.shields.io/badge/build-none-brightgreen.svg)

![Calculator in dark theme with scientific keys and history](docs/screenshots/calculator-dark.png)

## What is it?

Calc is a scientific calculator, graphing tool and small math workbench in one web page. You type an expression the way you would write it (`2π`, `3(4+1)`, `sin(30)`, `f(x) = x^2 + 1`) and see the result as you type. It is built on [math.js](https://mathjs.org/) and plain HTML, CSS and JavaScript. Every feature is free.

## Who is it for?

- **Students** (high school and university) who need trig, logs, complex numbers, matrices, statistics and function plots without buying a graphing calculator or installing software.
- **Engineers, developers and scientists** who want quick unit conversion, physical constants, bitwise operations and BIN/OCT/DEC/HEX conversion in a browser tab.
- **Teachers** who want to project a clean, readable calculator and graph in class.
- **Front-end developers** who want a readable reference project: a real app in under 1,000 lines of framework-free code, with tests, keyboard and screen-reader support, and a strict Content Security Policy.

## Why use it?

- **Free, no strings.** No account, no ads, no paid tier.
- **No build step.** Serve the `src/` folder with any static web server. No bundler, no framework.
- **Private and offline.** No backend, no tracking, no third-party scripts. math.js ships in the repo, so the page works without internet once it is loaded.
- **Natural input.** Implicit multiplication, live preview, full keyboard control, history you can click to reuse.
- **More than a calculator.** Graphing, matrices, statistics, regression, equation solving and unit conversion in the same page.

## Features

- **Everyday math:** arithmetic, `%`, `±`, parentheses, live result preview, implicit multiplication (`2π`, `3(4+1)`)
- **Scientific:** trig, inverse and hyperbolic functions with DEG / RAD / GRAD; `log`, `ln`, `log₂`, powers, roots, `n!`, `|x|`, `mod`
- **Constants and complex numbers:** π, e, φ, c, h, G, Nₐ, k and `i`
- **Graphing:** plot `f(x)` with zoom, pan and trace
- **Matrices:** add, multiply, determinant, inverse, transpose
- **Statistics:** mean, median, variance, standard deviation, linear regression
- **Solver:** polynomial roots and systems of linear equations
- **Conversion:** units (length, mass, temperature, time, data) and BIN / OCT / DEC / HEX with bitwise operators
- **Variables and functions:** `a = 4`, `f(x) = x^2 + 1`
- **Memory and history:** MC, MR, M+, M−; unlimited history, click to reuse, export as CSV or copy
- **Light and dark theme**, keyboard control, responsive layout for phone, tablet and desktop

![Graphing a cubic function in light theme](docs/screenshots/graph-light.png)

<p align="center"><img src="docs/screenshots/mobile.png" alt="Calculator on a phone-sized screen" width="260"></p>

## Examples

Type these into the calculator (angle mode DEG). The results come from the app's own engine.

| Input | Result |
| --- | --- |
| `sin(30)` | `0.5` |
| `2^10` | `1024` |
| `(3+4i)(2-i)` | `10 + 5i` |
| `f(x) = x^2 + 1`, then `f(3)` | `10` |

In the tool tabs:

| Tool | Input | Result |
| --- | --- | --- |
| Matrix | `det A` with A = `[[1,2],[3,4]]` | `-2` |
| Solve | polynomial coefficients `1 -3 2` (x² − 3x + 2 = 0) | `x1 = 1`, `x2 = 2` |
| Solve | A = `[[2,1],[1,3]]`, b = `[3,5]` | `x1 = 0.8`, `x2 = 1.4` |
| Stats | `2, 4, 4, 4, 5, 5, 7, 9` | mean 5, median 4.5 |
| Units | 100 km to mile | ≈ 62.137 mile |
| Base | 255 from DEC | BIN 11111111, OCT 377, HEX FF |

## Keyboard

| Key | Action |
| --- | --- |
| `Enter` | Evaluate |
| `Esc` | Clear |
| `Alt+1` … `Alt+4` | MC, MR, M+, M− |
| Any character | Focuses the expression field |

## Run locally

Requires Node.js 18 or newer (only for the dev server and tests; the app itself is static files).

```sh
git clone https://github.com/Develifture/scientific-calculator.git
cd scientific-calculator
npm install
npm start    # serves src/ at http://localhost:5173
npm test     # node --test
```

You can also open `src/` from any static web server.

## Project structure

```
src/
  index.html   page shell, strict CSP
  app.js       keypad, keyboard, history, memory, theme
  engine.js    math.js wrapper: parsing, angle modes, formatting, scope
  panels.js    tool tabs (graph, matrix, stats, solve, units, base)
  tools.js     pure math helpers for the panels
  graph.js     canvas plotter with zoom, pan and trace
  vendor/      bundled math.js (Apache-2.0)
tests/         node:test suite for the engine
```

math.js is vendored in `src/vendor/math.js` (copied from `node_modules/mathjs/lib/browser/math.js`), so the page loads no third-party scripts. After upgrading mathjs, copy the bundle again.

## FAQ

**Is it free?**
Yes. Every feature is free, and the code is MIT-licensed.

**Does it work offline?**
Yes, once the page is loaded. math.js is bundled in the repo, and the app makes no network requests.

**Can I use it on my phone?**
Yes. The layout adapts to phone, tablet and desktop screens.

**How does it compare to Desmos or GeoGebra?**
Desmos and GeoGebra are free, mature math tools with web and mobile apps, and they are the better choice for advanced graphing, geometry or 3D. Calc is much smaller. Its advantage is that the whole app is MIT-licensed source code in this repository: you can read it, change it, and host it yourself as static files.

## Contributing

Issues and pull requests are welcome. Run `npm test` before you open a pull request.

## License

[MIT](LICENSE). The vendored math.js bundle in `src/vendor/` is Apache-2.0; its notices are in `src/vendor/math.js.LICENSE.txt`.
