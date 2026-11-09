import { readSourceArray } from "@red-cup-engineering/signcell/cell";

const MAX_CELLS = 100_000;
const MAX_OBJECTS = 1_000_000;

function logFactorialBits(count) {
  let total = 0;
  for (let factor = 2; factor <= count; factor += 1) total += Math.log2(factor);
  return total;
}

/** Read an exact occupation count as floating-point log-factorial and entropy bits. */
export function occupationEntropy(input) {
  const occupation = readSourceArray(input, "occupation", MAX_CELLS);
  if (occupation.length === 0) throw new RangeError("occupation must contain at least one cell");
  let totalObjects = 0;
  let nonempty = 0;
  for (const count of occupation) {
    if (!Number.isSafeInteger(count) || count < 0 || count > MAX_OBJECTS - totalObjects)
      throw new RangeError(`occupation must contain natural counts totaling at most ${MAX_OBJECTS}`);
    totalObjects += count;
    if (count > 0) nonempty += 1;
  }

  const configH = occupation.reduce((total, count) => total + logFactorialBits(count), 0);
  const entropyBits = nonempty < 2 ? 0 : logFactorialBits(totalObjects) - configH;
  return Object.freeze({ cells: occupation.length, totalObjects, configH, entropyBits });
}
