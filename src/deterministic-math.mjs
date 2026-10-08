/**
 * Deterministic elementary functions: bit-identical on every conforming JavaScript engine.
 *
 * Law, not host library. `Math.sin` and friends are implementation-approximated and differ between engines; a
 * trajectory told as a law over time must read the same on every node. Everything here is built from the IEEE 754
 * correctly rounded operations (+ − × ÷ and `Math.sqrt`) and from exact operations (`Math.floor`, `Math.abs`,
 * bit moves through a DataView), applied in a fixed order. There is no fused multiply-add in ECMAScript, so the
 * order written is the order evaluated. Algorithms follow the classical minimax kernels (Sun fdlibm): Cody-Waite
 * range reduction on π/2 and ln 2, then minimax polynomials; error is within about one ulp.
 *
 * Range: `sin` and `cos` reduce |x| up to 2^20·π/2 (about 1.6e6) with three-part π/2 and throw RangeError beyond it;
 * callers reduce their own angle (an orbit reduces time modulo its period). Non-finite input answers NaN.
 *
 * Kepler helpers: `keplerElliptic` / `keplerHyperbolic` solve the anomaly from the mean anomaly by safeguarded Newton
 * (bracket + bisection fallback, fixed iteration bound); `stumpff` gives the universal-variable C(z), S(z).
 */

export const PI = 3.141592653589793;
export const TWO_PI = 6.283185307179586;
export const HALF_PI = 1.5707963267948966;
export const sqrt = Math.sqrt;

const buffer = new DataView(new ArrayBuffer(8));
const highWord = (x) => { buffer.setFloat64(0, x); return buffer.getInt32(0); };
const fromWords = (hi, lo) => { buffer.setInt32(0, hi | 0); buffer.setUint32(4, lo >>> 0); return buffer.getFloat64(0); };
const lowWord = (x) => { buffer.setFloat64(0, x); return buffer.getUint32(4); };
/** 2^j exactly for j in [-1022, 1023]. */
const pow2 = (j) => fromWords((j + 1023) << 20, 0);
const negative = (x) => x < 0 || Object.is(x, -0);

// — sine and cosine —

const PIO2_1 = 1.57079632673412561417e+00;
const PIO2_2 = 6.07710050630396597660e-11;
const PIO2_3 = 2.02226624871116645580e-21;
const PIO2_3T = 8.47842766036889956997e-32;
const INV_PIO2 = 6.36619772367581382433e-01;
const MAX_K = 1048576;

const S1 = -1.66666666666666324348e-01, S2 = 8.33333333332248946124e-03, S3 = -1.98412698298579493134e-04;
const S4 = 2.75573137070700676789e-06, S5 = -2.50507602534068634195e-08, S6 = 1.58969099521155010221e-10;
const C1 = 4.16666666666666019037e-02, C2 = -1.38888888888741095749e-03, C3 = 2.48015872894767294178e-05;
const C4 = -2.75573143513906633035e-07, C5 = 2.08757232129817482790e-09, C6 = -1.13596475577881948265e-11;

const kernelSin = (x) => { const z = x * x, v = z * x; return x + v * (S1 + z * (S2 + z * (S3 + z * (S4 + z * (S5 + z * S6))))); };
function kernelCos(x) {
  const z = x * x, r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  const ax = Math.abs(x);
  if (ax < 0.3) return 1 - (0.5 * z - z * r);
  const qx = ax > 0.78125 ? 0.28125 : fromWords(highWord(ax / 4), 0);
  return (1 - qx) - ((0.5 * z - qx) - z * r);
}
/** Reduce x to r in about [-π/4, π/4] with x = r + k π/2; returns [r, k mod 4]. */
function reduce(x) {
  const k = Math.floor(x * INV_PIO2 + 0.5);
  if (Math.abs(k) > MAX_K) throw new RangeError("deterministic-math: argument is beyond the reduction range; reduce it first");
  const r = (((x - k * PIO2_1) - k * PIO2_2) - k * PIO2_3) - k * PIO2_3T;
  return [r, ((k % 4) + 4) % 4];
}
export function sin(x) {
  if (!Number.isFinite(x)) return NaN;
  if (Math.abs(x) < 7.450580596923828e-9) return x;
  const [r, n] = reduce(x);
  return n === 0 ? kernelSin(r) : n === 1 ? kernelCos(r) : n === 2 ? -kernelSin(r) : -kernelCos(r);
}
export function cos(x) {
  if (!Number.isFinite(x)) return NaN;
  const [r, n] = reduce(x);
  return n === 0 ? kernelCos(r) : n === 1 ? -kernelSin(r) : n === 2 ? -kernelCos(r) : kernelSin(r);
}

// — arctangent —

const ATAN_HI = [4.63647609000806093515e-01, 7.85398163397448278999e-01, 9.82793723247329054082e-01, 1.57079632679489655800e+00];
const ATAN_LO = [2.26987774529616870924e-17, 3.06161699786838301793e-17, 1.39033110312309984516e-17, 6.12323399573676603587e-17];
const AT = [3.33333333333329318027e-01, -1.99999999998764832476e-01, 1.42857142725034663711e-01, -1.11111104054623557880e-01, 9.09088713343650656196e-02, -7.69187620504482999495e-02, 6.66107313738753120669e-02, -5.83357013379057348645e-02, 4.97687799461593236017e-02, -3.65315727442169155270e-02, 1.62858201153657823623e-02];
export function atan(x) {
  if (Number.isNaN(x)) return NaN;
  const sign = negative(x);
  let ax = Math.abs(x), id;
  if (ax >= 7.378697629483821e19) { const z = ATAN_HI[3] + ATAN_LO[3]; return sign ? -z : z; }
  if (ax < 0.4375) {
    if (ax < 7.450580596923828e-9) return x;
    id = -1;
  } else if (ax < 1.1875) {
    if (ax < 0.6875) { id = 0; ax = (2 * ax - 1) / (2 + ax); } else { id = 1; ax = (ax - 1) / (ax + 1); }
  } else if (ax < 2.4375) { id = 2; ax = (ax - 1.5) / (1 + 1.5 * ax); } else { id = 3; ax = -1 / ax; }
  const z = ax * ax, w = z * z;
  const s1 = z * (AT[0] + w * (AT[2] + w * (AT[4] + w * (AT[6] + w * (AT[8] + w * AT[10])))));
  const s2 = w * (AT[1] + w * (AT[3] + w * (AT[5] + w * (AT[7] + w * AT[9]))));
  if (id < 0) { const v = ax - ax * (s1 + s2); return sign ? -v : v; }
  const v = ATAN_HI[id] - ((ax * (s1 + s2) - ATAN_LO[id]) - ax);
  return sign ? -v : v;
}
const PI_LO = 1.2246467991473531772e-16;
export function atan2(y, x) {
  if (Number.isNaN(x) || Number.isNaN(y)) return NaN;
  const ny = negative(y), nx = negative(x);
  const signed = (v) => (ny ? -v : v);
  if (y === 0) return nx ? signed(PI + PI_LO) : y;
  if (x === 0) return signed(HALF_PI);
  if (!Number.isFinite(x)) {
    if (!Number.isFinite(y)) return signed(nx ? 3 * (PI / 4) : PI / 4);
    return nx ? signed(PI) : signed(0);
  }
  if (!Number.isFinite(y)) return signed(HALF_PI);
  const ay = Math.abs(y), ax = Math.abs(x);
  let z;
  if (ay > ax * 1.152921504606847e18) z = HALF_PI + 0.5 * PI_LO;
  else if (nx && ay < ax * 8.673617379884035e-19) z = 0;
  else z = atan(ay / ax);
  if (!nx) return signed(z);
  return signed(PI - (z - PI_LO));
}

// — exponential and logarithm —

const LN2_HI = 6.93147180369123816490e-01, LN2_LO = 1.90821492927058770002e-10, INV_LN2 = 1.44269504088896338700e+00;
const P1 = 1.66666666666666019037e-01, P2 = -2.77777777770155933842e-03, P3 = 6.61375632143793436117e-05, P4 = -1.65339022054652515390e-06, P5 = 4.13813679705723846039e-08;
export function exp(x) {
  if (Number.isNaN(x)) return NaN;
  if (x > 709.782712893384) return Infinity;
  if (x < -745.1332191019411) return 0;
  if (Math.abs(x) < 3.725290298461914e-9) return 1 + x;
  const k = Math.floor(x * INV_LN2 + 0.5);
  const hi = x - k * LN2_HI, lo = k * LN2_LO, r = hi - lo;
  const t = r * r, c = r - t * (P1 + t * (P2 + t * (P3 + t * (P4 + t * P5))));
  const y = 1 - ((lo - (r * c) / (2 - c)) - hi);
  if (k > 1023) return y * 2 * pow2(k - 1);
  if (k < -1021) return y * pow2(k + 1000) * 9.332636185032189e-302;
  return y * pow2(k);
}
const LG1 = 6.666666666666735130e-01, LG2 = 3.999999999940941908e-01, LG3 = 2.857142874366239149e-01, LG4 = 2.222219843214978396e-01;
const LG5 = 1.818357216161805012e-01, LG6 = 1.531383769920937332e-01, LG7 = 1.479819860511658591e-01;
export function log(x) {
  if (Number.isNaN(x) || x < 0) return NaN;
  if (x === 0) return -Infinity;
  if (x === Infinity) return Infinity;
  let k = 0, hx = highWord(x);
  if (hx < 0x00100000) { k -= 54; x *= 18014398509481984; hx = highWord(x); }
  k += (hx >> 20) - 1023;
  hx &= 0x000fffff;
  const i = (hx + 0x95f64) & 0x100000;
  x = fromWords(hx | (i ^ 0x3ff00000), lowWord(x));
  k += i >> 20;
  const f = x - 1, dk = k;
  if ((0x000fffff & (2 + hx)) < 3) {
    if (f === 0) return dk === 0 ? 0 : dk * LN2_HI + dk * LN2_LO;
    const R = f * f * (0.5 - 0.33333333333333333 * f);
    return dk === 0 ? f - R : dk * LN2_HI - ((R - dk * LN2_LO) - f);
  }
  const s = f / (2 + f), z = s * s, w = z * z;
  const t1 = w * (LG2 + w * (LG4 + w * LG6)), t2 = z * (LG1 + w * (LG3 + w * (LG5 + w * LG7)));
  const R = t2 + t1, j = 0x6b851 - hx, test = (hx - 0x6147a) | j;
  if (test > 0) {
    const hfsq = 0.5 * f * f;
    return dk === 0 ? f - (hfsq - s * (hfsq + R)) : dk * LN2_HI - ((hfsq - (s * (hfsq + R) + dk * LN2_LO)) - f);
  }
  return dk === 0 ? f - s * (f - R) : dk * LN2_HI - ((s * (f - R) - dk * LN2_LO) - f);
}

// — hyperbolic —

export function sinh(x) {
  const ax = Math.abs(x);
  let v;
  if (ax < 0.5) { const z = x * x; v = x + x * z * (1 / 6 + z * (1 / 120 + z * (1 / 5040 + z * (1 / 362880 + z * (1 / 39916800 + z * (1 / 6227020800 + z * (1 / 1307674368000))))))); return v; }
  const t = exp(ax);
  v = (t - 1 / t) / 2;
  return x < 0 ? -v : v;
}
export function cosh(x) {
  const ax = Math.abs(x);
  if (ax < 0.5) { const z = x * x; return 1 + z * (1 / 2 + z * (1 / 24 + z * (1 / 720 + z * (1 / 40320 + z * (1 / 3628800 + z * (1 / 479001600 + z * (1 / 87178291200))))))); }
  const t = exp(ax);
  return (t + 1 / t) / 2;
}
/** asinh by logarithm: accurate to a few ulp for |x| ≥ 0.06, a close starter below (the Kepler solver only starts from it). */
export function asinh(x) {
  const ax = Math.abs(x), v = log(ax + sqrt(ax * ax + 1));
  return x < 0 ? -v : v;
}

// — Stumpff functions and the Kepler equation —

/** Universal-variable Stumpff functions C(z) = (1 − cos√z)/z and S(z) = (√z − sin√z)/z^(3/2), for any real z. */
export function stumpff(z) {
  if (Math.abs(z) < 2) {
    let c = 0, s = 0;
    // C = Σ (−z)^k/(2k+2)!, S = Σ (−z)^k/(2k+3)!; 20 terms exhaust a double for |z| < 2.
    let cTerm = 1 / 2, sTerm = 1 / 6;
    for (let k = 0; k < 20; k += 1) {
      c += cTerm; s += sTerm;
      cTerm = (-z * cTerm) / ((2 * k + 3) * (2 * k + 4));
      sTerm = (-z * sTerm) / ((2 * k + 4) * (2 * k + 5));
    }
    return [c, s];
  }
  if (z > 0) { const q = sqrt(z); return [(1 - cos(q)) / z, (q - sin(q)) / (z * q)]; }
  const q = sqrt(-z);
  return [(cosh(q) - 1) / -z, (sinh(q) - q) / (-z * q)];
}

/** The eccentric anomaly E for mean anomaly M and eccentricity 0 ≤ e < 1: E − e sin E = M. E carries M's winding. */
export function keplerElliptic(M, e) {
  if (!(e >= 0 && e < 1)) throw new RangeError("keplerElliptic: eccentricity must be in [0, 1)");
  const wind = TWO_PI * Math.floor(M / TWO_PI + 0.5);
  const m = M - wind;
  let lo = -PI, hi = PI, E = e > 0.8 ? (m < 0 ? -PI : PI) : m + e * sin(m);
  if (E < lo || E > hi) E = m;
  for (let i = 0; i < 80; i += 1) {
    const f = E - e * sin(E) - m;
    if (f === 0) break;
    if (f > 0) hi = E; else lo = E;
    let next = E - f / (1 - e * cos(E));
    if (!(next > lo && next < hi)) next = lo + (hi - lo) / 2;
    if (next === E) break;
    E = next;
  }
  return E + wind;
}

/** The hyperbolic anomaly H for mean anomaly M and e > 1: e sinh H − H = M. */
export function keplerHyperbolic(M, e) {
  if (!(e > 1)) throw new RangeError("keplerHyperbolic: eccentricity must exceed 1");
  const m = Math.abs(M);
  let lo = 0, hi = 1;
  while (e * sinh(hi) - hi < m) { lo = hi; hi *= 2; }
  let H = asinh(m / e);
  if (!(H > lo && H < hi)) H = lo + (hi - lo) / 2;
  for (let i = 0; i < 200; i += 1) {
    const f = e * sinh(H) - H - m;
    if (f === 0) break;
    if (f > 0) hi = H; else lo = H;
    let next = H - f / (e * cosh(H) - 1);
    if (!(next > lo && next < hi)) next = lo + (hi - lo) / 2;
    if (next === H) break;
    H = next;
  }
  return M < 0 ? -H : H;
}
