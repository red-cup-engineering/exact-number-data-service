/**
 * number/graded — a rational carried in a grade: money, a commodity amount, a dimensioned quantity.
 *
 * A graded rational is an exact rational under an opaque grade (a currency or commodity, a species,
 * a dimension, a conserved-quantity type):
 *
 *   { kind: "exactNumber.gradedRational", value: Rational, grade: "USD" }
 *
 * Its one law is that addition is defined only within a grade: you cannot add dollars to hours.
 * Scaling by an ungraded rational stays in the grade; the graded product pairs two grades into a
 * third (dimensional multiplication); the ratio of two same-grade values is an ungraded rational.
 * At a JSON boundary a graded rational is admitted by its exact shape and canonicalized; its
 * readings are the exact "num/den grade" audit string and decimal strings.
 */
import { decimalOfRational, terminatingPlaces } from "./decimal-string.mjs";
import { ratAdd, ratCompare, ratEqual, ratIsZero, ratMultiply, ratNegate, ratSign, ratSubtract, ratZero, divide, rationalOfBigInts, rationalParts } from "./exact-number.mjs";

const GRADED = "exactNumber.gradedRational";
const requireGrade = (grade) => {
  if (typeof grade !== "string" || grade.length === 0) throw new TypeError("graded: grade must be a non-empty string");
  return grade;
};
const requireSameGrade = (left, right) => {
  if (left.grade !== right.grade) throw new TypeError(`graded: grade mismatch ${left.grade} != ${right.grade}`);
};

/** A graded rational: an exact rational in a grade. */
export const graded = (value, grade) => {
  rationalParts(value);
  return Object.freeze({ kind: GRADED, value, grade: requireGrade(grade) });
};
/** A graded rational from bigint numerator and denominator (reduced here). */
export const gradedFromParts = (num, den, grade) => graded(rationalOfBigInts(BigInt(num), BigInt(den)), grade);
/** The grade. */
export const gradeOf = (g) => g.grade;
/** The ungraded value. */
export const gradedValue = (g) => g.value;
/** The zero of a grade. */
export const gradedZero = (grade) => graded(ratZero, grade);
/** Whether a value is a graded rational. */
export const isGradedRational = (x) => x !== null && typeof x === "object" && x.kind === GRADED;
/** Whether two graded rationals share a grade. */
export const sameGrade = (left, right) => left.grade === right.grade;

/** Addition within a grade. */
export const gradedAdd = (left, right) => { requireSameGrade(left, right); return graded(ratAdd(left.value, right.value), left.grade); };
/** Subtraction within a grade. */
export const gradedSubtract = (left, right) => { requireSameGrade(left, right); return graded(ratSubtract(left.value, right.value), left.grade); };
/** Negation, keeping the grade. */
export const gradedNegate = (g) => graded(ratNegate(g.value), g.grade);
/** Whether a graded rational is zero. */
export const gradedIsZero = (g) => ratIsZero(g.value);
/** The sign of a graded rational. */
export const gradedSign = (g) => ratSign(g.value);
/** The absolute value, same grade. */
export const gradedAbs = (g) => (ratSign(g.value) < 0 ? gradedNegate(g) : g);
/** Three-way comparison within a grade. */
export const gradedCompare = (left, right) => { requireSameGrade(left, right); return ratCompare(left.value, right.value); };
/** Equality: same grade and equal value. */
export const gradedEqual = (left, right) => left.grade === right.grade && ratEqual(left.value, right.value);
/** Whether a graded rational's magnitude is within a same-grade tolerance. */
export const withinGradedTolerance = (g, tolerance) => gradedCompare(gradedAbs(g), gradedAbs(tolerance)) <= 0;
/** Scaling by an ungraded rational. */
export const gradedScale = (g, scalar) => graded(ratMultiply(g.value, scalar), g.grade);
/** The graded product into a result grade (dimensional multiplication). */
export const gradedTimes = (left, right, grade) => graded(ratMultiply(left.value, right.value), grade);
/** The graded quotient into a result grade (dimensional division, the dual of gradedTimes): a
 *  cost over a quantity is a price. Throws when the divisor is zero. */
export const gradedQuotient = (left, right, grade) => graded(divide(left.value, right.value), grade);
/** The ungraded ratio of two same-grade values; throws when the divisor is zero. */
export const gradedRatio = (left, right) => { requireSameGrade(left, right); return divide(left.value, right.value); };

// — the JSON boundary —

/** The JSON Schema of a graded rational. */
export const gradedSchema = Object.freeze({
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://schemas.561.group/number/graded-rational.schema.json",
  title: "GradedRational",
  description: "An exact rational carried in a grade: numerator and denominator as reduced decimal strings.",
  type: "object",
  required: ["kind", "value", "grade"],
  additionalProperties: false,
  properties: {
    kind: { const: GRADED },
    grade: { type: "string", minLength: 1 },
    value: {
      type: "object",
      required: ["kind", "num", "den"],
      additionalProperties: false,
      properties: {
        kind: { const: "exactNumber.rational" },
        num: { type: "string", pattern: "^-?[0-9]+$" },
        den: { type: "string", pattern: "^[1-9][0-9]*$" },
      },
    },
  },
});

const exactKeys = (value, keys, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${label}: expected an object`);
  const actual = Object.keys(value);
  if (actual.length !== keys.length || actual.some((key) => !keys.includes(key))) throw new TypeError(`${label}: expected exactly ${keys.join(", ")}`);
  return value;
};

/** Admit a graded rational received through a JSON boundary, canonicalizing its rational. */
export function admitGraded(value, label = "graded rational") {
  const outer = exactKeys(value, ["kind", "value", "grade"], label);
  if (outer.kind !== GRADED) throw new TypeError(`${label}: invalid kind`);
  const inner = exactKeys(outer.value, ["kind", "num", "den"], `${label}.value`);
  if (inner.kind !== "exactNumber.rational") throw new TypeError(`${label}.value: invalid kind`);
  if (typeof inner.num !== "string" || !/^-?[0-9]+$/.test(inner.num)) throw new TypeError(`${label}.value.num: expected an integer decimal string`);
  if (typeof inner.den !== "string" || !/^[1-9][0-9]*$/.test(inner.den)) throw new TypeError(`${label}.value.den: expected a positive integer decimal string`);
  return gradedFromParts(BigInt(inner.num), BigInt(inner.den), outer.grade);
}

// — readings —

/** The exact audit string "num/den grade". */
export const gradedToExactString = (g) => `${rationalParts(g.value).join("/")} ${g.grade}`;

/** The exact decimal string of a graded value whose denominator terminates in base ten, else "num/den". */
export function gradedToDecimalString(g) {
  const places = terminatingPlaces(g.value);
  return places === null ? rationalParts(g.value).join("/") : decimalOfRational(g.value, places);
}

/** A graded value rendered at a fixed number of places (default: its terminating places, else 2),
 *  rounded half away from zero, with optional thousands grouping. */
export function formatGraded(g, { places, grouping = true } = {}) {
  const renderedPlaces = places ?? terminatingPlaces(g.value) ?? 2;
  if (!Number.isInteger(renderedPlaces) || renderedPlaces < 0) throw new RangeError(`graded: invalid decimal places: ${renderedPlaces}`);
  const text = decimalOfRational(g.value, renderedPlaces);
  return grouping ? text.replace(/^(-?)(\d+)/u, (all, sign, whole) => sign + whole.replace(/\B(?=(\d{3})+(?!\d))/gu, ",")) : text;
}

/** A decimal string as a graded value, exactly. Accepts a leading sign and grouping commas. */
export function gradedOfDecimal(text, grade) {
  const parsed = parseDecimalAmount(text);
  if (parsed === undefined) throw new TypeError(`graded: invalid decimal ${JSON.stringify(text)}`);
  return graded(parsed.value, grade);
}

/** Parse a decimal magnitude without floating point, keeping its place count; grouping commas are
 *  accepted. Undefined when the text is not a decimal. */
export function parseDecimalAmount(text) {
  if (typeof text !== "string") return undefined;
  let body = text.trim(), sign = 1n;
  if (body.startsWith("+")) body = body.slice(1);
  else if (body.startsWith("-")) { sign = -1n; body = body.slice(1); }
  const match = /^(?:(\d+)(?:\.(\d*))?|\.(\d+))$/u.exec(body.replaceAll(",", ""));
  if (!match) return undefined;
  const whole = match[1] ?? "0", fraction = match[2] ?? match[3] ?? "";
  return Object.freeze({ value: rationalOfBigInts(sign * BigInt(`${whole}${fraction}` || "0"), 10n ** BigInt(fraction.length)), places: fraction.length });
}

// — conservation: a set of graded amounts balances when every grade sums to zero —

/** The signed per-sector residual of a 0-chain, in first-seen order, nonzero sectors only. */
export function gradedResidualBy(amounts, ops) {
    const order = [];
    const sums = new Map();
    for (const amount of amounts) {
        const grade = ops.gradeOf(amount);
        const prior = sums.get(grade);
        if (prior === undefined) {
            order.push(grade);
            sums.set(grade, amount);
        }
        else {
            sums.set(grade, ops.add(prior, amount));
        }
    }
    return Object.freeze(order.map((grade) => sums.get(grade)).filter((sum) => !ops.isZero(sum)));
}
/** Conservation over any GradedAdditive: conserved when the residual is empty. */
export function gradedConservedBy(amounts, ops) {
    const residual = gradedResidualBy(amounts, ops);
    return Object.freeze({ conserved: residual.length === 0, residual });
}
/** Infer the one quantity missing so the 0-chain conserves (residual in one sector). */
export function gradedCompleteBy(known, ops) {
    const residual = gradedResidualBy(known, ops);
    if (residual.length === 1)
        return { kind: "witness", inferred: ops.negate(residual[0]) };
    return { kind: "obstruction", reason: residual.length === 0 ? "balanced" : "ambiguous", residual };
}
const carrierAdditive = Object.freeze({
    gradeOf: (quantity) => quantity.grade,
    add: gradedAdd,
    isZero: gradedIsZero,
    negate: gradedNegate,
});
/** The signed per-sector residual of a carrier 0-chain. */
export function gradedResidual(amounts) {
    return gradedResidualBy(amounts, carrierAdditive);
}
/** Graded conservation judgment. */
export function gradedConserved(amounts) {
    const { conserved, residual } = gradedConservedBy(amounts, carrierAdditive);
    if (conserved)
        return Object.freeze({ kind: "meme-analysis.conservation.graded:witness", amounts: Object.freeze([...amounts]) });
    return Object.freeze({ kind: "meme-analysis.conservation.graded-obstruction", amounts: Object.freeze([...amounts]), residual });
}
/** Infer the one graded amount missing so the 0-chain conserves. */
export function gradedComplete(known) {
    const completion = gradedCompleteBy(known, carrierAdditive);
    if (completion.kind === "witness") {
        return Object.freeze({ kind: "meme-analysis.conservation.graded-completion:witness", known: Object.freeze([...known]), inferred: completion.inferred });
    }
    return Object.freeze({
        kind: "meme-analysis.conservation.graded-completion-obstruction",
        known: Object.freeze([...known]),
        reason: completion.reason,
        residual: completion.residual,
    });
}
