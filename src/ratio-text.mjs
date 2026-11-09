import { rationalParts } from "@red-cup-engineering/metrologic/number/exact-number";
import { rationalOfHostRatio } from "./wire-ratio.mjs";

/** Write the exact reduced numerator and denominator separated by a slash. */
export function ratioTextOfRational(value, { integerShorthand = false } = {}) {
  const [numerator, denominator] = rationalParts(value);
  return integerShorthand && denominator === 1n ? numerator.toString() : `${numerator}/${denominator}`;
}

/** Read a canonical reduced ratio from slash-separated integer strings. */
export function rationalOfRatioText(text, { integerShorthand = false } = {}) {
  if (typeof text !== "string") throw new TypeError("ratio text must be a string");
  const parts = text.split("/");
  if (integerShorthand && parts.length === 1)
    return rationalOfHostRatio({ numerator: text, denominator: "1" });
  if (parts.length !== 2) throw new TypeError("ratio text requires one slash");
  return rationalOfHostRatio({ numerator: parts[0], denominator: parts[1] });
}
