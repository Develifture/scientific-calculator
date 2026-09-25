// ESM shim over the vendored UMD bundle math.js (v13.2.3, loaded by a classic <script> in index.html).
// The bundle's math.create is pre-bound to all factories, so `create(all, config)` maps to math.create(config).
export const all = null;
export const create = (_factories, config) => globalThis.math.create(config);
