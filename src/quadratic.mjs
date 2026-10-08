/**
 * number/quadratic — exact arithmetic in a real quadratic field ℚ(√d).
 *
 * Elements are `unit + root·√d` over a fixed nonsquare radicand d ≥ 2, with exact
 * rational coefficients — the minimal coordinate system in which a 1-D cut of a
 * 2-D lattice has an irrational but exactly decidable slope. Signs and
 * comparisons never touch a float; Galois conjugation √d ↦ −√d is the algebraic
 * form of the cut-and-project physical/internal swap.
 */
import { fromRatio, ratAdd, ratEqual, ratFromInt, ratIsZero, ratMultiply, ratNegate, ratSign, ratSubtract, toNumber } from "./exact-number.mjs";
const isPerfectSquare = (value) => {
    const candidate = Math.round(Math.sqrt(value));
    return candidate * candidate === value;
};
/** Construct a ℚ(√d) element; throws unless d is a nonsquare safe integer ≥ 2. */
export const quadraticRational = (radicand, unit, root) => {
    if (!Number.isSafeInteger(radicand) || radicand < 2 || isPerfectSquare(radicand)) {
        throw new TypeError("quadraticRational: radicand must be a nonsquare integer >= 2");
    }
    return Object.freeze({ kind: "exactNumber.quadratic", radicand, unit, root });
};
/** Construct from integer unit and root coefficients. */
export const quadraticFromInts = (radicand, unit, root) => quadraticRational(radicand, ratFromInt(unit), ratFromInt(root));
/** Embed a plain rational into ℚ(√d) as its unit part. */
export const quadraticFromRational = (radicand, value) => quadraticRational(radicand, value, ratFromInt(0));
/** Whether two elements live in the same field ℚ(√d). */
export const sameRadicand = (left, right) => left.radicand === right.radicand;
const requireSameRadicand = (operation, left, right) => {
    if (!sameRadicand(left, right))
        throw new TypeError(`${operation}: radicands differ`);
};
const carry = (source, unit, root) => Object.freeze({ kind: "exactNumber.quadratic", radicand: source.radicand, unit, root });
/** Add componentwise over a shared radicand. */
export const quadraticAdd = (left, right) => {
    requireSameRadicand("quadraticAdd", left, right);
    return carry(left, ratAdd(left.unit, right.unit), ratAdd(left.root, right.root));
};
/** Subtract componentwise over a shared radicand. */
export const quadraticSubtract = (left, right) => {
    requireSameRadicand("quadraticSubtract", left, right);
    return carry(left, ratSubtract(left.unit, right.unit), ratSubtract(left.root, right.root));
};
/** Negate both coefficients. */
export const quadraticNegate = (value) => carry(value, ratNegate(value.unit), ratNegate(value.root));
/** (a + b√d)(c + e√d) = (ac + bed) + (ae + bc)√d. */
export const quadraticMultiply = (left, right) => {
    requireSameRadicand("quadraticMultiply", left, right);
    const radicand = fromRatio(left.radicand, 1);
    return carry(left, ratAdd(ratMultiply(left.unit, right.unit), ratMultiply(radicand, ratMultiply(left.root, right.root))), ratAdd(ratMultiply(left.unit, right.root), ratMultiply(left.root, right.unit)));
};
/** Scale by a plain rational. */
export const quadraticScale = (value, scalar) => carry(value, ratMultiply(value.unit, scalar), ratMultiply(value.root, scalar));
/** value + q for rational q. */
export const quadraticAddRational = (value, scalar) => carry(value, ratAdd(value.unit, scalar), value.root);
/** Galois conjugation √d ↦ −√d. */
export const quadraticConjugate = (value) => carry(value, value.unit, ratNegate(value.root));
/** Exact equality. */
export const quadraticEqual = (left, right) => sameRadicand(left, right) && ratEqual(left.unit, right.unit) && ratEqual(left.root, right.root);
/** Whether the element is a plain rational (zero root). */
export const quadraticIsRational = (value) => ratIsZero(value.root);
/** Exact sign of t + s√d (mixed signs decided by t² − ds²). */
export const quadraticSign = (value) => {
    const unitSign = ratSign(value.unit);
    const rootSign = ratSign(value.root);
    if (rootSign === 0)
        return unitSign;
    if (unitSign === 0)
        return rootSign;
    if (unitSign === rootSign)
        return unitSign;
    const radicand = fromRatio(value.radicand, 1);
    const discriminant = ratSubtract(ratMultiply(value.unit, value.unit), ratMultiply(radicand, ratMultiply(value.root, value.root)));
    return (unitSign * ratSign(discriminant));
};
/** Exact three-way comparison. */
export const quadraticCompare = (left, right) => quadraticSign(quadraticSubtract(left, right));
/** Strictly less than. */
export const quadraticLess = (left, right) => quadraticCompare(left, right) === -1;
/** Less than or equal. */
export const quadraticLeq = (left, right) => quadraticCompare(left, right) !== 1;

/** A ℚ(√d) element read as a native floating-point value (lossy; exactness ends here). */
export const quadraticToNumber = (value) => toNumber(value.unit) + toNumber(value.root) * Math.sqrt(value.radicand);
