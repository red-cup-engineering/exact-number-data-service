import test from "node:test";
import assert from "node:assert/strict";
import { ratMatrix, ratNullity, ratRank } from "../src/rational-matrix.mjs";

test("ratRank: integer, rational and carrier entries", () => {
  assert.equal(ratRank([]), 0);
  assert.equal(ratRank([[0, 0], [0, 0]]), 0);
  assert.equal(ratRank([[1, 2], [2, 4]]), 1);
  assert.equal(ratRank([["1/2", "1/3"], ["1/4", "1/6"]]), 1);
  assert.equal(ratRank([["1/2", "1/3"], ["1/4", "1/5"]]), 2);
  assert.equal(ratRank(ratMatrix([[1, 2, 3], [4, 5, 6], [7, 8, 9]])), 2);
  assert.equal(ratNullity([[1, 2, 3], [4, 5, 6], [7, 8, 9]], 3), 1);
});

test("ratRank: refuses inexact entries", () => {
  assert.throws(() => ratRank([[0.5]]), RangeError);
});

test("ratRank: bigints beyond the safe range stay exact", () => {
  const big = 10n ** 30n;
  assert.equal(ratRank([[big, big + 1n], [big + 1n, big + 2n]]), 2);
  assert.equal(ratRank([[big, 2n * big], [1n, 2n]]), 1);
});
