import test from "node:test";
import assert from "node:assert/strict";
import { ratMatrix, ratNullity, ratRank } from "../src/rational-matrix.mjs";
import { rationalOfBigInts } from "../src/exact-number.mjs";
import { rationalToFiniteNumber, toNumber } from "../src/exact-number-host.mjs";

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


test("rational host projection preserves finite ratios even when each exact integer exceeds binary64",()=>{
  const a=10n**400n+1n,b=10n**400n+2n;
  assert.ok(Number.isNaN(Number(a)/Number(b)), "the retired eager conversion loses lawful ratios");
  assert.equal(rationalToFiniteNumber(a,b),1);
  assert.equal(rationalToFiniteNumber(10n**400n,10n**400n),1);
  assert.equal(toNumber(rationalOfBigInts(a,b)),1);
  assert.equal(rationalToFiniteNumber(-a,b),-1);
  assert.equal(rationalToFiniteNumber(1n,3n),1/3);
  assert.equal(rationalToFiniteNumber(1n,2n**1074n),Number.MIN_VALUE);
  assert.equal(rationalToFiniteNumber(3n,2n**1075n),Number.MIN_VALUE*2,
    "nearest-even rounding still holds at the subnormal half-step");
  assert.equal(rationalToFiniteNumber((2n**53n-1n)*2n**971n,1n),Number.MAX_VALUE);
  assert.equal(rationalToFiniteNumber(0n,a),0);
});

test("rational host projection refuses unrepresentable nonzero exact values",()=>{
  for(const [num,den] of [[1n,0n],[1n,2n**1075n],[2n**1024n,1n]]){
    assert.throws(()=>rationalToFiniteNumber(num,den),RangeError);
  }
  assert.throws(()=>rationalToFiniteNumber(1,3n),TypeError);
});
