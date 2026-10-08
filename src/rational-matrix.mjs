/**
 * number/rational-matrix — exact linear algebra over ℚ: rank and nullity of rational matrices.
 *
 * Entries are exact numbers: safe host integers, bigints, exactNumber natural / integer /
 * rational carriers, or strings "a" and "a/b". A host float that is not an integer is refused
 * (it is not an exact value). Rank is computed by integer row reduction on BigInt after
 * clearing each row's denominators, with every row reduced by its content (gcd), so entries
 * stay as small as the arithmetic allows and nothing is ever rounded. Pure.
 */
import { rationalOfBigInts } from "./exact-number.mjs";

const gcdBig = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b !== 0n) [a, b] = [b, a % b]; return a; };

/** The [numerator, denominator] BigInt pair of an exact entry, reduced, denominator positive. */
export function ratPairOfEntry(value) {
  let num, den = 1n;
  if (typeof value === "bigint") num = value;
  else if (typeof value === "number") {
    if (!Number.isSafeInteger(value)) throw new RangeError(`rational matrix: ${value} is not an exact value; give an integer, bigint, carrier, or "a/b"`);
    num = BigInt(value);
  } else if (typeof value === "string") {
    const m = /^(-?\d+)(?:\/(\d+))?$/.exec(value.trim());
    if (m === null) throw new RangeError(`rational matrix: not an exact value: ${JSON.stringify(value)}`);
    num = BigInt(m[1]); den = m[2] === undefined ? 1n : BigInt(m[2]);
  } else if (value?.kind === "exactNumber.natural" || value?.kind === "exactNumber.integer") num = BigInt(value.value);
  else if (value?.kind === "exactNumber.rational") { num = BigInt(value.num); den = BigInt(value.den); }
  else throw new TypeError(`rational matrix: not an exact value: ${JSON.stringify(value)}`);
  if (den === 0n) throw new RangeError("rational matrix: zero denominator");
  const g = gcdBig(num, den) || 1n;
  return Object.freeze([num / g, den / g]);
}

/** Whether a value is an exact entry (see ratPairOfEntry). */
export const isExactEntry = (value) => { try { ratPairOfEntry(value); return true; } catch { return false; } };

/** A matrix of exact entries as rational carriers. */
export const ratMatrix = (rows) => Object.freeze(rows.map((row) => Object.freeze(row.map((entry) => { const [n, d] = ratPairOfEntry(entry); return rationalOfBigInts(n, d); }))));

const lcmBig = (a, b) => (a / gcdBig(a, b)) * b;

/** The rank of a matrix of exact entries over ℚ (rows of equal length; the empty matrix has rank 0). */
export function ratRank(matrix) {
  if (matrix.length === 0 || (matrix[0]?.length ?? 0) === 0) return 0;
  const columns = matrix[0].length;
  const work = matrix.map((row) => {
    if (row.length !== columns) throw new RangeError("rational matrix: ragged rows");
    const pairs = row.map(ratPairOfEntry);
    const scale = pairs.reduce((acc, [, d]) => lcmBig(acc, d), 1n);
    return pairs.map(([n, d]) => n * (scale / d));
  });
  const reduce = (row) => { const g = row.reduce((acc, v) => gcdBig(acc, v), 0n); return g > 1n ? row.map((v) => v / g) : row; };
  let rankValue = 0;
  for (let column = 0; column < columns && rankValue < work.length; column += 1) {
    let pivot = rankValue;
    while (pivot < work.length && work[pivot][column] === 0n) pivot += 1;
    if (pivot === work.length) continue;
    [work[rankValue], work[pivot]] = [work[pivot], work[rankValue]];
    const p = work[rankValue];
    for (let r = rankValue + 1; r < work.length; r += 1) {
      const f = work[r][column];
      if (f === 0n) continue;
      work[r] = reduce(work[r].map((v, c) => v * p[column] - f * p[c]));
    }
    rankValue += 1;
  }
  return rankValue;
}

/** The nullity (dimension of the kernel) of a matrix with the given column count: columns − rank. */
export const ratNullity = (matrix, columns) => columns - ratRank(matrix);
