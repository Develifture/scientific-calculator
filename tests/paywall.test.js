import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { isPro, unlock, reset } from '../src/paywall.js';

beforeEach(() => {
  const m = new Map();
  globalThis.localStorage = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), get length() { return m.size; } };
});

test('starts free', () => assert.equal(isPro(), false));

test('unlock sets pro and persists', async () => {
  await unlock(0);
  assert.equal(isPro(), true);
  assert.equal(localStorage.getItem('pro'), 'true');
});

test('reset returns to free', async () => {
  await unlock(0);
  reset();
  assert.equal(isPro(), false);
});

test('never stores payment data', async () => {
  await unlock(0);
  // only the single flag key is ever written
  assert.equal(localStorage.length, 1);
  assert.equal(localStorage.getItem('pro'), 'true');
});

test('works when storage is unavailable', async () => {
  delete globalThis.localStorage;
  assert.equal(isPro(), false);
  await unlock(0);
  reset();
});
