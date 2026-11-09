import {
  rationalOfBigInts, rationalParts,
} from "@red-cup-engineering/metrologic/number/exact-number";

const NUMERATOR = /^(?:0|-?[1-9][0-9]*)$/u;
const DENOMINATOR = /^[1-9][0-9]*$/u;

/** Encode a Metrologic rational as a reduced pair of integer strings. */
export function hostRatioOfRational(value) {
  const [numerator, denominator] = rationalParts(value);
  return Object.freeze({ numerator: numerator.toString(), denominator: denominator.toString() });
}

/** Decode a canonical wire ratio into a Metrologic rational. */
export function rationalOfHostRatio(value) {
  if (!value || typeof value !== "object" ||
      ![Object.prototype, null].includes(Object.getPrototypeOf(value)) ||
      Reflect.ownKeys(value).length !== 2)
    throw new TypeError("wire ratio must be a record with numerator and denominator");

  const numerator = Object.getOwnPropertyDescriptor(value, "numerator")?.value;
  const denominator = Object.getOwnPropertyDescriptor(value, "denominator")?.value;
  if (typeof numerator !== "string" || !NUMERATOR.test(numerator) ||
      typeof denominator !== "string" || !DENOMINATOR.test(denominator))
    throw new TypeError("wire ratio must contain canonical integer strings");

  const rational = rationalOfBigInts(BigInt(numerator), BigInt(denominator));
  if (rational.num !== numerator || rational.den !== denominator)
    throw new TypeError("wire ratio must be reduced");
  return rational;
}
