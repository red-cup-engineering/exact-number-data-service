import assert from "node:assert/strict";
import test from "node:test";
import * as D from "../src/deterministic-math.mjs";

const view = new DataView(new ArrayBuffer(8));
const bits = (x) => { view.setFloat64(0, x); return view.getBigUint64(0); };
const hex = (x) => bits(x).toString(16).padStart(16, "0");
const ordered = (x) => { const b = bits(x); return b >> 63n ? -(b & 0x7fffffffffffffffn) : b; };
const ulps = (a, b) => { const d = ordered(a) - ordered(b); return Number(d < 0n ? -d : d); };
let seed = 20261008;
const random = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };

const within = (name, f, g, draw, limit = 2, count = 4000) => test(`${name} is within ${limit} ulp of the host`, () => {
  let worst = 0;
  for (let i = 0; i < count; i += 1) { const x = draw(); worst = Math.max(worst, ulps(f(x), g(x))); }
  assert.ok(worst <= limit, `${name}: ${worst} ulp`);
});

within("sin", D.sin, Math.sin, () => (random() - 0.5) * 400);
within("sin (large)", D.sin, Math.sin, () => (random() - 0.5) * 2e6);
within("cos", D.cos, Math.cos, () => (random() - 0.5) * 400);
within("exp", D.exp, Math.exp, () => (random() - 0.5) * 1400);
within("log", D.log, Math.log, () => Math.exp((random() - 0.5) * 1400));
within("atan", D.atan, Math.atan, () => (random() - 0.5) * Math.exp((random() - 0.5) * 40));
within("sinh", D.sinh, Math.sinh, () => (random() - 0.5) * 40);
within("cosh", D.cosh, Math.cosh, () => (random() - 0.5) * 40);
test("atan2 agrees in every quadrant and on the axes", () => {
  for (let i = 0; i < 4000; i += 1) {
    const y = (random() - 0.5) * 10, x = (random() - 0.5) * 10;
    assert.ok(ulps(D.atan2(y, x), Math.atan2(y, x)) <= 2);
  }
  for (const [y, x] of [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1], [Infinity, 1], [1, Infinity], [1, -Infinity]]) assert.equal(D.atan2(y, x), Math.atan2(y, x));
});
test("exactly representable cases", () => {
  assert.equal(D.sin(0), 0); assert.equal(D.cos(0), 1); assert.equal(D.exp(0), 1); assert.equal(D.log(1), 0);
  assert.equal(D.sqrt(2), Math.sqrt(2));
  assert.ok(Number.isNaN(D.sin(Infinity)));
  assert.throws(() => D.sin(1e9), RangeError);
});
test("golden bit patterns are fixed", () => {
  const golden = [
    [D.sin(1), "3feaed548f090cee"], [D.sin(100), "bfe03425b78c4db8"], [D.sin(-12345.678), "3fe687d5890974a5"],
    [D.cos(1), "3fe14a280fb5068c"], [D.cos(100), "3feb981dbf665fdf"], [D.cos(-12345.678), "3fe6b94c3bbe24b8"],
    [D.atan2(1, 2), "3fddac670561bb4f"], [D.atan2(-3, -4), "c003fc176b7a8560"],
    [D.exp(1), "4005bf0a8b14576a"], [D.exp(-20.5), "3e157a3afeed00ab"],
    [D.log(10), "40026bb1bbb55516"], [D.log(1e-300), "c085963447f87fb5"],
    [D.keplerElliptic(1.2, 0.6), "3ffc940937c16932"], [D.keplerHyperbolic(3.4, 2.5), "3ff68af2595f8232"],
    [D.stumpff(-5)[0], "3fe7e1f94bf249a3"], [D.stumpff(7)[1], "3fbdfeb6cd546a1a"],
  ];
  for (const [value, expected] of golden) assert.equal(hex(value), expected);
});
test("Kepler solvers invert the Kepler equation", () => {
  for (const e of [0, 0.1, 0.5, 0.9, 0.99]) for (const M of [-20, -3, -0.5, 0, 0.001, 1, 3, 6.5, 100]) {
    const E = D.keplerElliptic(M, e);
    assert.ok(Math.abs(E - e * D.sin(E) - M) < 1e-12 * Math.max(1, Math.abs(M)), `E e=${e} M=${M}`);
  }
  for (const e of [1.01, 2, 10]) for (const M of [-50, -1, 0, 0.3, 4, 1000]) {
    const H = D.keplerHyperbolic(M, e);
    assert.ok(Math.abs(e * D.sinh(H) - H - M) < 1e-11 * Math.max(1, Math.abs(M)), `H e=${e} M=${M}`);
  }
});
test("Stumpff functions satisfy their closed forms and join at zero", () => {
  for (const z of [-30, -4, -2.5, -1, -0.01, 0, 0.01, 1, 1.99, 2.01, 9, 39]) {
    const [c, s] = D.stumpff(z);
    if (z === 0) { assert.equal(c, 0.5); assert.equal(s, 1 / 6); continue; }
    const q = Math.sqrt(Math.abs(z));
    const expectC = z > 0 ? (1 - Math.cos(q)) / z : (Math.cosh(q) - 1) / -z;
    const expectS = z > 0 ? (q - Math.sin(q)) / (z * q) : (Math.sinh(q) - q) / (-z * q);
    assert.ok(Math.abs(c - expectC) <= 1e-9 * Math.abs(expectC) + 1e-15, `C(${z})`);
    assert.ok(Math.abs(s - expectS) <= 1e-9 * Math.abs(expectS) + 1e-15, `S(${z})`);
  }
});
