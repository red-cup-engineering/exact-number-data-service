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


/**
 * Solve A x = b exactly over Q, including underdetermined section constraints.
 *
 * This extends this original arithmetic owner beyond rank/nullity: returns
 * one ACTUAL global coordinate vector and a basis of all homogeneous freedom,
 * or a source-equation linear-combination witness of inconsistency.
 *
 * Integer row operations include an identity tracking block: each reduced row
 * remains the explicitly weighted sum of the caller's original equations,
 * so an inconsistent row can be checked by a separate recipient. No floating
 * approximation, arbitrary "near compatible" repair or fabricated source
 * authentication occurs here. Matrix row meaning stays with its caller.
 */
export function ratSolve(matrix, rightHandSide, { columns } = {}) {
  if (!Array.isArray(matrix) || !Array.isArray(rightHandSide) ||
      matrix.length !== rightHandSide.length)
    throw new TypeError("rational matrix: equal-length rows and right-hand side are required");
  const width = columns ?? (matrix.length ? matrix[0]?.length : 0);
  if (!Number.isSafeInteger(width) || width < 0 ||
      matrix.length > 256 || width > 256 ||
      matrix.some(row => !Array.isArray(row) || row.length !== width))
    throw new RangeError("rational matrix: bounded rectangular coefficient system required");
  const equations = matrix.length;
  const rational = (n, d = 1n) => rationalOfBigInts(n, d);
  const reduceRow = row => {
    const g = row.reduce((result, value) => gcdBig(result, value), 0n);
    if (g > 1n) return row.map(value => value / g);
    return row;
  };
  const work = matrix.map((row, index) => {
    const entries = [...row, rightHandSide[index]].map(ratPairOfEntry);
    const scale = entries.reduce((acc, [, d]) => lcmBig(acc, d), 1n);
    return [
      ...entries.map(([n, d]) => n * (scale / d)),
      ...Array.from({length:equations}, (_, j) => index === j ? scale : 0n),
    ];
  });
  const pivotColumns = [];
  let pivotRow = 0;
  for (let column = 0; column < width && pivotRow < equations; column++) {
    let source = pivotRow;
    while (source < equations && work[source][column] === 0n) source++;
    if (source === equations) continue;
    [work[pivotRow],work[source]] = [work[source],work[pivotRow]];
    const pivot = work[pivotRow];
    for (let i = 0; i < equations; i++) {
      if (i === pivotRow || work[i][column] === 0n) continue;
      const coefficient = work[i][column];
      // Each operation is an exact linear combination of original equations.
      work[i] = reduceRow(work[i].map((value,j) =>
        value * pivot[column] - coefficient * pivot[j]));
    }
    work[pivotRow] = reduceRow(work[pivotRow]);
    pivotColumns.push(column);
    pivotRow++;
  }
  const rank = pivotColumns.length;
  const pivots = new Set(pivotColumns);
  const freeColumns = Array.from({length:width},(_,i)=>i).filter(i=>!pivots.has(i));
  const contradictionRow = work.find(row =>
    row.slice(0,width).every(value=>value===0n) && row[width]!==0n);
  if (contradictionRow) {
    return Object.freeze({
      kind:"exactNumber.affineLinearSolve.v1",
      status:"inconsistent",equations,variables:width,rank,
      pivotColumns:Object.freeze(pivotColumns),freeColumns:Object.freeze(freeColumns),
      particular:null,kernelBasis:null,
      obstruction:Object.freeze({
        reducedRightHandSide:rational(contradictionRow[width]),
        // Source-equation weights certify 0 = nonzero by exact combination.
        // These are not semantic witnesses or third-party attestations.
        sourceEquationWeights:Object.freeze(contradictionRow.slice(width+1).map(n=>rational(n))),
      }),
    });
  }
  const particular = Array.from({length:width},()=>rational(0n));
  for (let i = 0; i < rank; i++) {
    const column=pivotColumns[i];
    particular[column]=rational(work[i][width],work[i][column]);
  }
  const kernelBasis = freeColumns.map(free=>{
    const vector=Array.from({length:width},(_,column)=>rational(column===free ? 1n : 0n));
    for (let i = 0; i < rank; i++) {
      const pivot=pivotColumns[i];
      vector[pivot]=rational(-work[i][free],work[i][pivot]);
    }
    return Object.freeze(vector);
  });
  return Object.freeze({
    kind:"exactNumber.affineLinearSolve.v1",
    status:"solution-family",equations,variables:width,rank,
    pivotColumns:Object.freeze(pivotColumns),freeColumns:Object.freeze(freeColumns),
    particular:Object.freeze(particular),
    kernelBasis:Object.freeze(kernelBasis),
    obstruction:null,
  });
}
