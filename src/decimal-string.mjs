/** Exact decimal-string arithmetic: BigInt-scaled, never a float, for balances and prices; and the
 *  crossing between decimal strings and exact rationals (a decimal is a rational over a power of ten). */
import { rationalOfBigInts, rationalParts } from "./exact-number.mjs";

/**
 * @typedef {{ negative: boolean, whole: string, frac: string }} ParsedDecimal
 */

/**
 * Parse a plain decimal string (optional leading `-`, digits, optional `.` and digits).
 * @param {string} text
 * @returns {ParsedDecimal}
 * @throws {TypeError} if `text` is not a plain decimal string
 */
export function parseDecimal(text) {
  const trimmed = String(text).trim();
  const match = /^(-)?(?:(\d+)(?:\.(\d*))?|\.(\d+))$/u.exec(trimmed);
  if (!match) throw new TypeError(`decimal: not a plain decimal string: ${JSON.stringify(text)}`);
  const [, sign, wholeWithFrac, fracAfterWhole, fracOnly] = match;
  const whole = wholeWithFrac ?? "0";
  const frac = fracOnly ?? fracAfterWhole ?? "";
  return { negative: sign === "-", whole, frac };
}

/**
 * Render a signed BigInt magnitude at a fixed decimal `scale` back to a decimal string, with
 * trailing fractional zeros trimmed.
 * @param {bigint} magnitude
 * @param {number} scale
 * @returns {string}
 */
export function formatScaled(magnitude, scale) {
  if (!Number.isInteger(scale) || scale < 0) {
    throw new RangeError(`decimal: scale must be a non-negative integer, got ${scale}`);
  }
  const negative = magnitude < 0n;
  const digits = (negative ? -magnitude : magnitude).toString().padStart(scale + 1, "0");
  const whole = scale === 0 ? digits : digits.slice(0, digits.length - scale);
  const frac = scale === 0 ? "" : digits.slice(digits.length - scale).replace(/0+$/u, "");
  const body = frac === "" ? whole : `${whole}.${frac}`;
  return negative && /[1-9]/u.test(body) ? `-${body}` : body;
}

/**
 * Sum a non-empty array of plain decimal strings exactly, at the widest scale present.
 * @param {readonly string[]} values
 * @returns {string} the exact decimal sum
 * @throws {RangeError} if `values` is empty
 */
export function addDecimalStrings(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError("decimal: addDecimalStrings requires a non-empty array");
  }
  const parsed = values.map(parseDecimal);
  const scale = Math.max(...parsed.map((p) => p.frac.length));
  let total = 0n;
  for (const p of parsed) {
    const digits = `${p.whole}${p.frac.padEnd(scale, "0")}`;
    const magnitude = BigInt(digits);
    total += p.negative ? -magnitude : magnitude;
  }
  return formatScaled(total, scale);
}

/**
 * Multiply two plain decimal strings exactly, then truncate (never round up) to at most
 * `maxDecimals` fractional digits.
 * @param {string} a
 * @param {string} b
 * @param {number} [maxDecimals]
 * @returns {string}
 */
export function multiplyDecimalStrings(a, b, maxDecimals = 10) {
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  const scale = left.frac.length + right.frac.length;
  const leftMagnitude = BigInt(`${left.whole}${left.frac}`);
  const rightMagnitude = BigInt(`${right.whole}${right.frac}`);
  const magnitude = leftMagnitude * rightMagnitude;
  const negative = left.negative !== right.negative;
  const product = formatScaled(negative ? -magnitude : magnitude, scale);
  return truncateDecimalString(product, maxDecimals);
}

/**
 * Divide two plain decimal strings exactly to `maxDecimals` fractional digits, truncated
 * (never rounded) toward zero.
 * @param {string} a the dividend
 * @param {string} b the divisor
 * @param {number} [maxDecimals]
 * @returns {string}
 * @throws {RangeError} if `b` is zero
 */
export function divideDecimalStrings(a, b, maxDecimals = 10) {
  if (!Number.isInteger(maxDecimals) || maxDecimals < 0) {
    throw new RangeError(`decimal: maxDecimals must be a non-negative integer, got ${maxDecimals}`);
  }
  const left = parseDecimal(a);
  const right = parseDecimal(b);
  const leftMagnitude = BigInt(`${left.whole}${left.frac}`);
  const rightMagnitude = BigInt(`${right.whole}${right.frac}`);
  if (rightMagnitude === 0n) throw new RangeError("decimal: divideDecimalStrings cannot divide by zero");
  const numerator = leftMagnitude * (10n ** BigInt(right.frac.length + maxDecimals));
  const denominator = rightMagnitude * (10n ** BigInt(left.frac.length));
  const quotient = numerator / denominator;
  const negative = left.negative !== right.negative;
  return formatScaled(negative ? -quotient : quotient, maxDecimals);
}

/**
 * Truncate a plain decimal string to at most `maxDecimals` fractional digits without rounding.
 * @param {string} text
 * @param {number} maxDecimals
 * @returns {string}
 */
export function truncateDecimalString(text, maxDecimals) {
  if (!Number.isInteger(maxDecimals) || maxDecimals < 0) {
    throw new RangeError(`decimal: maxDecimals must be a non-negative integer, got ${maxDecimals}`);
  }
  const { negative, whole, frac } = parseDecimal(text);
  const truncatedFrac = frac.slice(0, maxDecimals).replace(/0+$/u, "");
  const body = truncatedFrac === "" ? whole : `${whole}.${truncatedFrac}`;
  return negative && /[1-9]/u.test(body) ? `-${body}` : body;
}

/**
 * Negate a plain decimal string exactly; `"0"` and any all-zero magnitude negate to themselves
 * (never render as `"-0"`).
 * @param {string} text
 * @returns {string}
 */
export function negateDecimalString(text) {
  const { negative, whole, frac } = parseDecimal(text);
  const body = frac === "" ? whole : `${whole}.${frac}`;
  if (/^0(\.0*)?$/u.test(body)) return body;
  return negative ? body : `-${body}`;
}

/**
 * Compare two plain decimal strings exactly, at the widest scale present.
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1} `-1` when `a < b`, `0` when equal, `1` when `a > b`.
 */
export function compareDecimalStrings(a, b) {
  const diff = addDecimalStrings([a, negateDecimalString(b)]);
  if (/^-/u.test(diff)) return -1;
  return /^0(\.0*)?$/u.test(diff) ? 0 : 1;
}

/**
 * Strip a trailing chain-unit suffix (e.g. `"142.423 HIVE"` -> `"142.423"`).
 * @param {string} text
 * @returns {string}
 */
export function stripUnitSuffix(text) {
  const match = /^(-?\d+(?:\.\d+)?)\s+\S+$/u.exec(String(text).trim());
  return match ? match[1] : String(text).trim();
}

/**
 * A canonical unsigned decimal string (no sign, no leading zeros) as an integer count of
 * 10^-scale units: `decimalUnits("1.5", 3) === 1500n`.
 * @param {string} text
 * @param {number} scale
 * @returns {bigint}
 * @throws {RangeError} if `text` is not canonical or carries more than `scale` fractional digits
 */
export function decimalUnits(text, scale) {
  if (!Number.isInteger(scale) || scale < 0) throw new RangeError(`decimal: scale must be a non-negative integer, got ${scale}`);
  const match = /^(0|[1-9][0-9]*)(?:\.([0-9]+))?$/u.exec(String(text));
  if (!match || (match[2]?.length ?? 0) > scale) throw new RangeError(`decimal: ${JSON.stringify(text)} is not a canonical ${scale}-place decimal`);
  return BigInt(match[1]) * 10n ** BigInt(scale) + BigInt((match[2] ?? "").padEnd(scale, "0") || "0");
}

/**
 * An integer count of 10^-scale units as a decimal string with exactly `scale` fractional
 * digits (the fixed-width rendering a chain quantity takes): `formatUnits(1500n, 3) === "1.500"`.
 * @param {bigint} magnitude
 * @param {number} scale
 * @returns {string}
 */
export function formatUnits(magnitude, scale) {
  if (!Number.isInteger(scale) || scale < 0) throw new RangeError(`decimal: scale must be a non-negative integer, got ${scale}`);
  if (magnitude < 0n) return `-${formatUnits(-magnitude, scale)}`;
  const factor = 10n ** BigInt(scale);
  return scale === 0 ? magnitude.toString() : `${magnitude / factor}.${(magnitude % factor).toString().padStart(scale, "0")}`;
}

/** A plain decimal string as an exact rational: its digits over ten to its places. */
export function rationalOfDecimal(text) {
  const { negative, whole, frac } = parseDecimal(text);
  return rationalOfBigInts(BigInt(`${whole}${frac}`) * (negative ? -1n : 1n), 10n ** BigInt(frac.length));
}

/** The fractional places at which a rational's decimal expansion terminates (the larger power of
 *  two or five in its reduced denominator), or null when the expansion recurs. */
export function terminatingPlaces(q) {
  let d = rationalParts(q)[1], twos = 0, fives = 0;
  while (d % 2n === 0n) { d /= 2n; twos += 1; }
  while (d % 5n === 0n) { d /= 5n; fives += 1; }
  return d === 1n ? Math.max(twos, fives) : null;
}

const ROUNDINGS = new Set(["half-away-from-zero", "toward-zero"]);

/** A rational scaled to `places` fractional digits as a signed integer count of units (q × 10^places),
 *  rounded half away from zero, or truncated with `{ rounding: "toward-zero" }` so a chain quantity
 *  is never overstated. */
export function rationalUnits(q, places, { rounding = "half-away-from-zero" } = {}) {
  if (!Number.isInteger(places) || places < 0) throw new RangeError(`decimal: places must be a non-negative integer, got ${places}`);
  if (!ROUNDINGS.has(rounding)) throw new RangeError(`decimal: unknown rounding ${JSON.stringify(rounding)}`);
  const [num, den] = rationalParts(q), negative = num < 0n;
  const scaled = (negative ? -num : num) * 10n ** BigInt(places);
  let units = scaled / den;
  if (rounding === "half-away-from-zero" && (scaled % den) * 2n >= den) units += 1n;
  return negative ? -units : units;
}

/** An exact rational as a decimal string at `places` fractional digits, rounded as rationalUnits rounds. */
export function decimalOfRational(q, places, options) {
  const units = rationalUnits(q, places, options), negative = units < 0n;
  let digits = (negative ? -units : units).toString();
  if (places > 0) {
    digits = digits.padStart(places + 1, "0");
    digits = `${digits.slice(0, digits.length - places)}.${digits.slice(digits.length - places)}`;
  }
  return (negative ? "-" : "") + digits;
}

/** Expand decimal notation exactly, preserving coefficient digits and plain-input precision.
 * Numeric inputs preserve their already-represented value; precision lost before admission
 * cannot be reconstructed. Expansion above a million decimal positions is refused.
 */
export function expandDecimalNotation(text) {
  const raw = String(text);
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/u.exec(raw);
  if (!match) throw new TypeError(`decimal: invalid decimal quantity: ${JSON.stringify(text)}`);
  if (!/[eE]/u.test(raw)) return raw.replace(/^\+/u, "").replace(/^(-?)\./u, "$10.");
  const [, sign, whole = "0", fraction = "", leadingFraction, exponent = "0"] = match;
  const digits = whole + (leadingFraction ?? fraction);
  // Only the position is numeric. The coefficient never enters binary floating point.
  const position = BigInt(whole.length) + BigInt(exponent);
  if (position > 1000000n || position < -1000000n) throw new RangeError("decimal: expanded quantity exceeds decimal carrier limit");
  const point = Number(position);
  let expanded = point <= 0 ? "0." + "0".repeat(-point) + digits
    : point >= digits.length ? digits + "0".repeat(point - digits.length)
    : digits.slice(0, point) + "." + digits.slice(point);
  expanded = expanded.replace(/^0+(?=\d)/u, "").replace(/(\.\d*?)0+$/u, "$1").replace(/\.$/u, "");
  return (sign === "-" && !/^0(?:\.0*)?$/u.test(expanded) ? "-" : "") + expanded;
}
