import assert from "node:assert/strict";
import test from "node:test";
import { occupationEntropy } from "../src/occupation-entropy.mjs";

test("occupation counts remain exact and entropy is read in bits", () => {
  assert.deepEqual(occupationEntropy([0, 0]), { cells: 2, totalObjects: 0, configH: 0, entropyBits: 0 });
  assert.deepEqual(occupationEntropy([1, 1]), { cells: 2, totalObjects: 2, configH: 0, entropyBits: 1 });
  assert.deepEqual(occupationEntropy([0, 3]), { cells: 2, totalObjects: 3, configH: 1 + Math.log2(3), entropyBits: 0 });
  assert.equal(occupationEntropy([2, 1]).entropyBits, Math.log2(3));
});

test("occupation admission refuses sparse, fractional, and oversized models", () => {
  assert.throws(() => occupationEntropy(new Array(2)), TypeError);
  assert.throws(() => occupationEntropy([1, 0.5]), /natural counts/);
  assert.throws(() => occupationEntropy([1_000_000, 1]), /at most 1000000/);
});
