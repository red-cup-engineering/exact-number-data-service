/**
 * number/exact-number — the exact number tower ℕ ⊂ ℤ ⊂ ℚ, and exact integer matrices.
 *
 * The tower is the theory's own (Obsmetrologia: ℕ is the finite fragment of the settling
 * ordinal, `Natural ≃ Nat`; ℤ; ℚ as integer pairs with positive denominator up to
 * cross-multiplication). What is stored is its computational form, as Lean itself runs `Nat`
 * and `Int` on bignums while defining them by successor: a carrier holds its value as a
 * canonical decimal digit string (I-JSON, RFC 7493 §2.2: integers beyond 2^53 travel as
 * strings), and every operation computes with ECMAScript BigInt, so nothing is ever rounded
 * and nothing grows beyond the size of its digits.
 *
 *   Natural  { kind: "exactNumber.natural",  value: "12" }        value ≥ 0, no leading zeros
 *   Integer  { kind: "exactNumber.integer",  value: "-12" }       no leading zeros, no "-0"
 *   Rational { kind: "exactNumber.rational", num: "-25", den: "2" }
 *            reduced: den > 0, gcd(|num|, den) = 1, zero is "0"/"1" — so equal values coincide byte for byte.
 *
 * The von Neumann reading of a natural — the set of the naturals below it — is `members(n)`,
 * computed on demand; successor and predecessor are its structure. Matrices are rows of
 * Integers with a fraction-free (Bareiss) determinant, the characteristic polynomial
 * (Berkowitz), the Smith normal form, and rank. Pure: no dependency.
 */

const natural = (value) => {
  if (value < 0n) throw new RangeError("exact number: a natural is never negative");
  return Object.freeze({ kind: "exactNumber.natural", value: value.toString() });
};
const integerOf = (value) => Object.freeze({ kind: "exactNumber.integer", value: value.toString() });
const big = (carrier) => {
  if (carrier?.kind !== "exactNumber.natural" && carrier?.kind !== "exactNumber.integer") throw new TypeError(`exact number: not a natural or integer carrier: ${JSON.stringify(carrier)}`);
  return BigInt(carrier.value);
};
const absBig = (value) => (value < 0n ? -value : value);
const signBig = (value) => (value > 0n ? 1 : value < 0n ? -1 : 0);
const gcdBig = (left, right) => {
  let a = absBig(left), b = absBig(right);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
};

// — naturals —

/** Strict less-than on naturals. */
export const natLess = (left, right) => big(left) < big(right);
/** Equality on naturals. */
export const natEqual = (left, right) => big(left) === big(right);
/** Von Neumann membership: member < n. */
export const isMember = (member, n) => natLess(member, n);
/** Less-than-or-equal on naturals. */
export const natLeq = (left, right) => big(left) <= big(right);
/** The natural zero. */
export const natZero = natural(0n);
/** The successor n + 1 (the von Neumann n ∪ {n}). */
export const successor = (n) => natural(big(n) + 1n);
/** The natural one. */
export const natOne = successor(natZero);
/** The von Neumann reading of a natural: the naturals below it, in order. */
export const members = (n) => Object.freeze(Array.from({ length: toCount(n) }, (_, index) => natural(BigInt(index))));
/** Whether a natural is zero. */
export const natIsZero = (n) => big(n) === 0n;
/** Three-way comparison of naturals. */
export const natCompare = (left, right) => signBig(big(left) - big(right));
/** The predecessor of a natural: zero stays zero. */
export const predecessor = (n) => (natIsZero(n) ? natZero : natural(big(n) - 1n));
/** Addition of naturals. */
export const natAdd = (left, right) => natural(big(left) + big(right));
/** Multiplication of naturals. */
export const natMultiply = (left, right) => natural(big(left) * big(right));
/** Truncated subtraction of naturals (never negative). */
export const monus = (left, right) => { const d = big(left) - big(right); return natural(d < 0n ? 0n : d); };
/** Euclidean division of naturals; throws on division by zero. */
export function natDivmod(n, d) {
  const divisor = big(d);
  if (divisor === 0n) throw new RangeError("natural divmod: division by zero");
  const dividend = big(n);
  return Object.freeze({ quotient: natural(dividend / divisor), remainder: natural(dividend % divisor) });
}
/** Greatest common divisor of two naturals. */
export const gcd = (left, right) => natural(gcdBig(big(left), big(right)));
/** The cardinality of a collection, as a natural. */
export const count = (items) => {
  let value = 0n;
  for (const _item of items) value += 1n;
  return natural(value);
};

// — integers —

/** The integer pos − neg. */
export const integer = (pos, neg) => integerOf(big(pos) - big(neg));
/** A natural as a non-negative integer. */
export const fromNatural = (n) => integerOf(big(n));
/** The integer zero. */
export const intZero = integerOf(0n);
/** The integer one. */
export const intOne = integerOf(1n);
/** Negation of an integer. */
export const intNegate = (z) => integerOf(-big(z));
/** Addition of integers. */
export const intAdd = (left, right) => integerOf(big(left) + big(right));
/** Subtraction of integers. */
export const intSubtract = (left, right) => integerOf(big(left) - big(right));
/** Multiplication of integers. */
export const intMultiply = (left, right) => integerOf(big(left) * big(right));
/** Equality on integers. */
export const intEqual = (left, right) => big(left) === big(right);
/** Value equivalence of integers (the same as equality: integers are stored canonically). */
export const equivalent = intEqual;
/** Whether an integer is zero. */
export const intIsZero = (z) => big(z) === 0n;
/** Whether an integer is positive. */
export const isPositive = (z) => big(z) > 0n;
/** Whether an integer is negative. */
export const isNegative = (z) => big(z) < 0n;
/** The sign of an integer: −1, 0, or 1. */
export const sign = (z) => signBig(big(z));
/** The absolute value of an integer, as a natural. */
export const magnitude = (z) => natural(absBig(big(z)));
/** Division of integers truncating toward zero, with the remainder taking the dividend's sign;
 *  throws on division by zero. */
export function intDivmod(left, right) {
  const divisor = big(right);
  if (divisor === 0n) throw new RangeError("integer divmod: division by zero");
  const dividend = big(left), q = dividend / divisor;
  return Object.freeze({ quotient: integerOf(q), remainder: integerOf(dividend - q * divisor) });
}
/** The quotient of dividing two integers, truncating toward zero. */
export const quotient = (left, right) => intDivmod(left, right).quotient;
/** Whether divisor divides value exactly. */
export const divides = (divisor, value) => intIsZero(intDivmod(value, divisor).remainder);
/** Three-way comparison of integers. */
export const intCompare = (left, right) => signBig(big(left) - big(right));

// — rationals —

const rationalOf = (num, den) => {
  if (den === 0n) throw new RangeError("rational: zero denominator");
  if (num === 0n) return Object.freeze({ kind: "exactNumber.rational", num: "0", den: "1" });
  const factor = gcdBig(num, den), s = den < 0n ? -1n : 1n;
  return Object.freeze({ kind: "exactNumber.rational", num: ((s * num) / factor).toString(), den: ((s * den) / factor).toString() });
};
const parts = (q) => {
  if (q?.kind !== "exactNumber.rational" || typeof q.num !== "string" || typeof q.den !== "string") throw new TypeError(`exact number: not a rational carrier: ${JSON.stringify(q)}`);
  return [BigInt(q.num), BigInt(q.den)];
};
/** A rational's numerator, as an integer. */
export const numerator = (q) => integerOf(parts(q)[0]);
/** A rational's denominator, as a positive integer. */
export const denominator = (q) => integerOf(parts(q)[1]);
/** A rational's numerator and denominator as bigints. */
export const rationalParts = (q) => Object.freeze(parts(q));
/** The canonical rational of bigint numerator and denominator. */
export const rationalOfBigInts = (num, den) => rationalOf(num, den);
/** The canonical rational num/den; throws on a zero denominator. */
export const rational = (num, den) => rationalOf(big(num), big(den));
/** An integer as a rational. */
export const fromInteger = (z) => rationalOf(big(z), 1n);
/** The rational zero. */
export const ratZero = fromInteger(intZero);
/** The rational one. */
export const ratOne = fromInteger(intOne);
/** Negation of a rational. */
export const ratNegate = (q) => { const [n, d] = parts(q); return rationalOf(-n, d); };
/** The reciprocal of a rational; throws on zero. */
export const reciprocal = (q) => { const [n, d] = parts(q); return rationalOf(d, n); };
/** Addition of rationals. */
export const ratAdd = (left, right) => { const [a, b] = parts(left), [c, d] = parts(right); return rationalOf(a * d + c * b, b * d); };
/** Subtraction of rationals. */
export const ratSubtract = (left, right) => { const [a, b] = parts(left), [c, d] = parts(right); return rationalOf(a * d - c * b, b * d); };
/** Multiplication of rationals. */
export const ratMultiply = (left, right) => { const [a, b] = parts(left), [c, d] = parts(right); return rationalOf(a * c, b * d); };
/** Division of rationals; throws on division by zero. */
export const divide = (left, right) => { const [a, b] = parts(left), [c, d] = parts(right); return rationalOf(a * d, b * c); };
/** Equality on rationals. */
export const ratEqual = (left, right) => { const [a, b] = parts(left), [c, d] = parts(right); return a === c && b === d; };
/** Whether a rational is zero. */
export const ratIsZero = (q) => parts(q)[0] === 0n;
/** The sign of a rational. */
export const ratSign = (q) => signBig(parts(q)[0]);
/** Three-way comparison of rationals. */
export const ratCompare = (left, right) => { const [a, b] = parts(left), [c, d] = parts(right); return signBig(a * d - c * b); };

// — exact lifts of host integers (no float, no loss) —

const hostInteger = (value, label) => {
  if (typeof value === "bigint") return value;
  if (!Number.isSafeInteger(value)) throw new RangeError(`${label}: expected a safe integer or a bigint`);
  return BigInt(value);
};
const hostNumber = (value, label) => {
  if (value > BigInt(Number.MAX_SAFE_INTEGER) || value < BigInt(Number.MIN_SAFE_INTEGER)) throw new RangeError(`${label}: the value leaves the safe integer range; read it as a bigint or a string`);
  return Number(value);
};
/** A natural's value as a host number; throws beyond the safe integer range. */
export const toCount = (n) => hostNumber(big(n), "toCount");
/** A non-negative host integer (or bigint) as a natural. */
export function fromCount(value) {
  const v = hostInteger(value, "fromCount");
  if (v < 0n) throw new RangeError("fromCount: expected a non-negative integer");
  return natural(v);
}
/** An integer's value as a host number; throws beyond the safe integer range. */
export const toInt = (z) => hostNumber(big(z), "toInt");
/** A host integer (or bigint) as an integer. */
export const fromInt = (value) => integerOf(hostInteger(value, "fromInt"));
/** A natural's or integer's value as a bigint. */
export const toBigInt = (carrier) => big(carrier);
/** A host integer as a rational with denominator one. */
export const ratFromInt = (value) => fromInteger(fromInt(value));
/** Host numerator and denominator as a reduced rational. */
export const fromRatio = (num, den) => rationalOf(hostInteger(num, "fromRatio"), hostInteger(den, "fromRatio"));
/** Rows of host integers as an exact integer matrix. */
export const fromInts = (rows) => Object.freeze(rows.map((row) => Object.freeze(row.map(fromInt))));
/** A rational read as a host floating-point value (lossy). */
export const toNumber = (q) => { const [n, d] = parts(q); return Number(n) / Number(d); };

// — exact integer matrices —

const bigMatrix = (matrix) => matrix.map((row) => row.map(big));
const carrierRow = (row) => Object.freeze(row.map(integerOf));

/** The transpose of a matrix. */
export const matTranspose = (matrix) => Object.freeze(matrix[0].map((_, column) => Object.freeze(matrix.map((row) => row[column]))));
/** The product of two matrices. */
export const matmul = (left, right) => {
  const a = bigMatrix(left), b = bigMatrix(right);
  return Object.freeze(a.map((row) => carrierRow(b[0].map((_, column) => row.reduce((sum, item, index) => sum + item * b[index][column], 0n)))));
};
/** Equality on matrices. */
export const matEqual = (left, right) => left.length === right.length
  && left.every((row, rowIndex) => row.length === right[rowIndex].length && row.every((item, columnIndex) => intEqual(item, right[rowIndex][columnIndex])));

const bareissDeterminant = (work) => {
  const n = work.length;
  if (n === 0) return 1n;
  let signValue = 1n, previous = 1n;
  for (let k = 0; k < n - 1; k += 1) {
    let pivotRow = k;
    while (pivotRow < n && work[pivotRow][k] === 0n) pivotRow += 1;
    if (pivotRow === n) return 0n;
    if (pivotRow !== k) { [work[k], work[pivotRow]] = [work[pivotRow], work[k]]; signValue = -signValue; }
    for (let i = k + 1; i < n; i += 1) {
      for (let j = k + 1; j < n; j += 1) work[i][j] = (work[i][j] * work[k][k] - work[i][k] * work[k][j]) / previous;
      work[i][k] = 0n;
    }
    previous = work[k][k];
  }
  return signValue * work[n - 1][n - 1];
};
/** The exact integer determinant (fraction-free Bareiss elimination). */
export const determinant = (matrix) => integerOf(bareissDeterminant(bigMatrix(matrix)));

/** The characteristic polynomial det(λI − M), ascending-degree integer coefficients (Berkowitz's
 *  division-free algorithm). */
export function charPoly(matrix) {
  const m = bigMatrix(matrix), n = m.length;
  let descending = [1n];
  for (let k = 0; k < n; k += 1) {
    const R = m[k].slice(0, k), c = m.slice(0, k).map((row) => row[k]), A = m.slice(0, k).map((row) => row.slice(0, k));
    const column = [1n, -m[k][k]];
    let v = c;
    for (let i = 0; i < k; i += 1) {
      column.push(-R.reduce((sum, value, j) => sum + value * v[j], 0n));
      v = A.map((row) => row.reduce((sum, value, j) => sum + value * v[j], 0n));
    }
    descending = Array.from({ length: k + 2 }, (_, i) => column.slice(0, i + 1).reduce((sum, t, j) => sum + t * (descending[i - j] ?? 0n), 0n));
  }
  return Object.freeze([...descending].reverse().map(integerOf));
}

/** The invariant factors of a matrix from its Smith normal form. */
export function smithNormalForm(matrix) {
  const work = bigMatrix(matrix), rows = work.length, columns = work[0]?.length ?? 0;
  const swapRows = (left, right) => { [work[left], work[right]] = [work[right], work[left]]; };
  const swapColumns = (left, right) => { for (const row of work) [row[left], row[right]] = [row[right], row[left]]; };
  const addRow = (destination, source, factor) => { for (let column = 0; column < columns; column += 1) work[destination][column] -= factor * work[source][column]; };
  const addColumn = (destination, source, factor) => { for (let row = 0; row < rows; row += 1) work[row][destination] -= factor * work[row][source]; };
  const limit = Math.min(rows, columns);
  for (let t = 0; t < limit; t += 1) {
    let found = false;
    outer: for (let row = t; row < rows; row += 1) for (let column = t; column < columns; column += 1) if (work[row][column] !== 0n) { swapRows(t, row); swapColumns(t, column); found = true; break outer; }
    if (!found) break;
    for (;;) {
      let changed = false;
      for (let row = t + 1; row < rows; row += 1) {
        if (work[row][t] === 0n) continue;
        addRow(row, t, work[row][t] / work[t][t]);
        if (work[row][t] !== 0n) { swapRows(t, row); changed = true; }
      }
      for (let column = t + 1; column < columns; column += 1) {
        if (work[t][column] === 0n) continue;
        addColumn(column, t, work[t][column] / work[t][t]);
        if (work[t][column] !== 0n) { swapColumns(t, column); changed = true; }
      }
      if (!changed) break;
    }
    let fixed = false;
    outer2: for (let row = t + 1; row < rows; row += 1) for (let column = t + 1; column < columns; column += 1) if (work[row][column] % work[t][t] !== 0n) { addRow(t, row, -1n); fixed = true; break outer2; }
    if (fixed) t -= 1;
  }
  return Object.freeze(Array.from({ length: limit }, (_, index) => integerOf(absBig(work[index]?.[index] ?? 0n))));
}
/** The rank of a matrix: the count of nonzero invariant factors. */
export const rank = (matrix) => count(smithNormalForm(matrix).filter((factor) => !intIsZero(factor)));
