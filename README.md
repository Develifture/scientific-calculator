# Scientific Calculator

A browser scientific calculator built on [math.js](https://mathjs.org/). No build step, works offline.

## Features

- Arithmetic, percent, memory keys, history with CSV export
- Scientific functions, DEG/RAD/GRAD angle modes, physical constants, complex numbers
- Bitwise operators and base conversion (BIN/OCT/DEC/HEX)
- Variables and user-defined functions (`a = 4`, `f(x) = x^2 + 1`)
- Pro tools: function graphing (zoom, pan, trace), matrices, statistics and regression, polynomial and linear-system solver, unit conversion
- Light and dark themes

## Run

```sh
npm install
npm start    # serves src/ at http://localhost:5173
npm test     # node --test
```

math.js is vendored in `src/vendor/math.js` (copied from `node_modules/mathjs/lib/browser/math.js`), so the page loads no third-party scripts. After upgrading mathjs, copy the bundle again.

## Pro / paywall

The Pro tier is a **client-side demo only**. "Unlock Pro" sets a flag in `localStorage`. Nothing is charged, no payment details are collected, and the flag is trivially bypassed. A real product needs server-side checkout and entitlement checks.

## License

[MIT](LICENSE). The vendored math.js bundle in `src/vendor/` is Apache-2.0; its notices are in `src/vendor/math.js.LICENSE.txt`.
