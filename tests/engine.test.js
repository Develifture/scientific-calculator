import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, setAngle, resetScope, compileFn } from '../src/engine.js';
import { convertUnit, convertBase, matrixOp, stats, regression, polyRoots, solveSystem } from '../src/tools.js';

const t = (e) => evaluate(e).text;

test('basic arithmetic, precedence, floats', () => {
  assert.equal(t('2+3×4'), '14');
  assert.equal(t('(2+3)×4'), '20');
  assert.equal(t('0.1+0.2'), '0.3');
  assert.equal(t('10÷4−1'), '1.5');
});

test('implicit multiplication and percent', () => {
  assert.equal(t('3(4+1)'), '15');
  assert.equal(t('2π'), '6.28318530718');
  assert.equal(t('50%'), '0.5');
});

test('errors are readable, never crash', () => {
  assert.throws(() => evaluate('2+'), /incomplete/);
  assert.throws(() => evaluate('(2+3'), /parenthesis/i);
  assert.throws(() => evaluate('1/0'), /finite/);
  assert.throws(() => evaluate('foo+1'), /Unknown name "foo"/);
});

test('angle modes', () => {
  setAngle('deg'); assert.equal(t('sin(30)'), '0.5');
  setAngle('rad'); assert.equal(t('cos(0)'), '1');
  setAngle('grad'); assert.equal(t('sin(100)'), '1');
  setAngle('deg'); assert.equal(t('asin(0.5)'), '30');
});

test('scientific functions, constants, complex', () => {
  assert.equal(t('log10(1000)'), '3');
  assert.equal(t('ln(e)'), '1');
  assert.equal(t('log2(8)'), '3');
  assert.equal(t('nthRoot(27,3)'), '3');
  assert.equal(t('5!'), '120');
  assert.equal(t('7 mod 3'), '1');
  assert.equal(t('c'), '299792458');
  assert.equal(t('sqrt(-4)'), '2i');
  assert.equal(t('(1+2i)(3−i)'), '5 + 5i');
});

test('bitwise and bases', () => {
  assert.equal(t('0xFF AND 0x0F'), '15');
  assert.equal(t('5 XOR 3'), '6');
  assert.equal(t('1 << 3'), '8');
  assert.deepEqual(convertBase('ff', 'HEX'), { BIN: '11111111', OCT: '377', DEC: '255', HEX: 'FF' });
  assert.throws(() => convertBase('12', 'BIN'), /valid BIN/);
});

test('variables and user functions', () => {
  resetScope();
  evaluate('a = 4');
  evaluate('f(x) = x^2 + 1');
  assert.equal(t('f(a)'), '17');
  assert.equal(t('ans×2'), '34');
});

test('units', () => {
  assert.equal(convertUnit(20, 'degC', 'degF'), 68);
  assert.ok(Math.abs(convertUnit(5, 'km', 'mile') - 3.10686) < 1e-4);
  assert.equal(convertUnit(1, 'GB', 'MB'), 1000);
  assert.throws(() => convertUnit('abc', 'm', 'km'));
});

test('matrices', () => {
  assert.equal(matrixOp('det A', '[[1,2],[3,4]]'), '-2');
  assert.equal(matrixOp('A + B', '[[1,2],[3,4]]', '[[1,1],[1,1]]'), '[[2, 3], [4, 5]]');
  assert.equal(matrixOp('A × B', '[[1,2],[3,4]]', '[[0,1],[1,0]]'), '[[2, 1], [4, 3]]');
  assert.equal(matrixOp('Aᵀ', '[[1,2],[3,4]]'), '[[1, 3], [2, 4]]');
  assert.throws(() => matrixOp('inv A', '[[1,2],[2,4]]'));
});

test('stats and regression', () => {
  const s = stats('2 4 4 4 5 5 7 9');
  assert.equal(s.mean, 5); assert.equal(s.median, 4.5);
  const r = regression('1 2 3 4', '2 4 6 8');
  assert.ok(Math.abs(r.slope - 2) < 1e-9 && Math.abs(r.intercept) < 1e-9 && Math.abs(r.r - 1) < 1e-9);
  assert.throws(() => stats('a b'));
});

test('solver', () => {
  assert.deepEqual(polyRoots('1 -3 2').sort(), ['1', '2']);
  assert.equal(polyRoots('1 0 1').length, 2); // ±i
  assert.deepEqual(solveSystem('[[2,1],[1,3]]', '[3,5]'), ['0.8', '1.4']);
});

test('review fixes: percent, exponent results, constants, trig extras', () => {
  assert.equal(t('5%3'), '2');
  assert.equal(t('.5%'), '0.005');
  assert.throws(() => evaluate('pi = 3'), /constant/);
  assert.throws(() => evaluate('1/0 + i'), /finite/);
  setAngle('deg');
  assert.equal(t('cot(45)'), '1');
  assert.equal(t('sec(60)'), '2');
  assert.equal(t('atan2(1,1)'), '45');
});

test('constants cannot be overwritten anywhere in an expression', () => {
  resetScope();
  for (const e of ['2+(pi=3)', 'x = 1; e = 2', 'e(x) = x', 'ans = 5', 'sqrt(pi = 4)']) {
    assert.throws(() => evaluate(e), /constant/, e);
    assert.throws(() => evaluate(e, false), /constant/, e);
  }
  assert.equal(t('pi'), '3.14159265359');
  assert.equal(t('e'), '2.71828182846');
});

test('dangerous math.js functions are disabled in expressions', () => {
  for (const f of ['import({})', 'createUnit("foo")', 'evaluate("1")', 'parse("1")', 'compile("1")', 'simplify("x+x")', 'derivative("x^2", "x")']) {
    assert.throws(() => evaluate(f), /disabled/, f);
  }
  assert.throws(() => matrixOp('det A', 'evaluate("[[1]]")'), /disabled/);
  assert.equal(matrixOp('det A', '[[1,2],[3,4]]'), '-2'); // internal evaluation still works
});

test('matrices and arrays containing NaN or Infinity are flagged', () => {
  assert.throws(() => evaluate('[1/0, 1]'), /finite/);
  assert.throws(() => evaluate('[[1, 2], [0/0, 4]]'), /finite/);
  assert.equal(t('[[1, 2], [3, 4]] * 2'), '[[2, 4], [6, 8]]');
});

test('polyRoots caps degree and reports non-convergence', () => {
  assert.throws(() => polyRoots('1 0 0 0 0 0 0 0 0 0 0 1'), /limited to 10/);
  assert.equal(polyRoots('1 0 0 0 0 0 0 0 0 0 1').length, 10);
  assert.deepEqual(polyRoots('1 -2 1'), ['1', '1']); // repeated root still accepted
  assert.throws(() => polyRoots('1 1e200 1'), /converge/);
});

test('stats with one value leaves sample variance undefined', () => {
  const s = stats('5');
  assert.equal(s.count, 1); assert.equal(s.mean, 5);
  assert.equal(s.variance, undefined); assert.equal(s.stdDev, undefined);
});

test('compileFn evaluates correctly across calls and uses scope', () => {
  resetScope();
  evaluate('a = 3');
  const f = compileFn('a*x^2 + 1');
  assert.deepEqual([f(0), f(2), f(-1)], [1, 13, 4]);
  assert.ok(Number.isNaN(f(NaN)));
  assert.ok(Number.isNaN(compileFn('sqrt(x)')(-1))); // complex result -> NaN
  assert.throws(() => compileFn('nope(x)'), /nope/);
  resetScope();
});
