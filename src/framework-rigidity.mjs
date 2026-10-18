/**
 * Exact finite framework rigidity matrices over Q in 2D or 3D.
 *
 * Reuses the owning exact-number matrix and rank algorithm; it does not
 * invent a second Gaussian eliminator or infer chemical bonding.
 *
 * For each undirected bar {i,j}, the differential of
 *   (p_i - p_j) · (p_i - p_j) / 2
 * has the row (p_i - p_j) at i and its negation at j.
 *
 * This measures a SPECIFIED coordinate realization. It is not the generic
 * planar (2,3)-sparsity matroid and is not a combinatorial 3D rigidity oracle.
 */
import { ratPairOfEntry, ratRank } from "./rational-matrix.mjs";

const gcd = (left, right) => {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
};

function exactString(numerator, denominator = 1n) {
  if (denominator === 0n) throw new RangeError("zero rational denominator");
  if (numerator === 0n) return "0";
  const factor = gcd(numerator, denominator);
  const sign = denominator < 0n ? -1n : 1n;
  const n = sign * numerator / factor;
  const d = sign * denominator / factor;
  return d === 1n ? String(n) : `${n}/${d}`;
}

function subtract(left, right) {
  return exactString(left[0] * right[1] - right[0] * left[1], left[1] * right[1]);
}

function negate(value) {
  const [num, den] = ratPairOfEntry(value);
  return exactString(-num, den);
}

function admit(vertices, contacts) {
  if (!Array.isArray(vertices) || vertices.length < 2) {
    throw new TypeError("vertices must contain at least two exact coordinate vectors");
  }
  const dimension = vertices[0]?.length;
  if (dimension !== 2 && dimension !== 3) {
    throw new TypeError("framework space must be exactly 2D or 3D");
  }
  const coordinates = vertices.map((vertex, index) => {
    if (!Array.isArray(vertex) || vertex.length !== dimension) {
      throw new TypeError(`vertices[${index}] must have ${dimension} exact coordinates`);
    }
    return vertex.map((value, axis) => {
      try { return ratPairOfEntry(value); }
      catch { throw new TypeError(`vertices[${index}][${axis}] must be an exact rational`); }
    });
  });
  if (!Array.isArray(contacts)) throw new TypeError("contacts must be an array");
  const seen = new Set();
  const bonds = contacts.map((contact, index) => {
    if (!Array.isArray(contact) || contact.length !== 2 ||
        contact.some((v) => !Number.isSafeInteger(v) || v < 0 || v >= vertices.length) ||
        contact[0] === contact[1]) {
      throw new TypeError(`contacts[${index}] must join distinct indexed vertices`);
    }
    const pair = [...contact].sort((a, b) => a - b);
    const key = `${pair[0]}:${pair[1]}`;
    if (seen.has(key)) throw new TypeError("contacts must be unique undirected pairs");
    seen.add(key);
    return pair;
  });
  return { dimension, coordinates, bonds };
}

/** Rows of the exact infinitesimal rigidity matrix, in supplied contact order. */
export function frameworkRigidityRows(vertices, contacts) {
  const { dimension, coordinates, bonds } = admit(vertices, contacts);
  const columns = vertices.length * dimension;
  return bonds.map(([left, right]) => {
    const row = Array(columns).fill("0");
    for (let axis = 0; axis < dimension; axis += 1) {
      const delta = subtract(coordinates[left][axis], coordinates[right][axis]);
      row[left * dimension + axis] = delta;
      row[right * dimension + axis] = negate(delta);
    }
    return row;
  });
}

/**
 * Actual finite coordinate realization's exact rank over Q. Its nullity
 * includes rigid-body infinitesimal motions, and may also contain flexes.
 * We deliberately do NOT identify that nullity with the physical softness
 * or bulk modulus of any material sample.
 */
export function frameworkRigidityReadout(vertices, contacts) {
  const rows = frameworkRigidityRows(vertices, contacts);
  const dimension = vertices[0].length;
  const columns = vertices.length * dimension;
  const rank = ratRank(rows);
  return Object.freeze({
    model: "exact-finite-bar-framework-rigidity-matrix/v1",
    provenance: "caller-specified-exact-coordinate-and-contact-hypotheses",
    spaceDimension: dimension,
    vertices: vertices.length,
    contacts: contacts.length,
    columns,
    rank,
    kernelDimension: columns - rank,
    limitations: [
      "Coordinate-specific infinitesimal rank, not generic graph rigidity or 3D rigidity percolation",
      "Contacts and coordinates are caller-specified hypotheses, not material measurements",
      "No chemical phase, modulus, temperature or associative reaction is inferred",
    ],
  });
}
