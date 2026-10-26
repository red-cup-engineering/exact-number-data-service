import test from "node:test";
import assert from "node:assert/strict";
import { ratMatrix, ratNullity, ratRank, ratSolve, ratPairOfEntry } from "../src/rational-matrix.mjs";
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


// A real exact extension rather than rank-only diagnosis: this output is
// consumed by cellular sheaf applications with proof-source custody separate.
const add = (a,b) => {
  const [an,ad]=ratPairOfEntry(a),[bn,bd]=ratPairOfEntry(b);
  return rationalOfBigInts(an*bd+bn*ad,ad*bd);
};
const mul = (a,b) => {
  const [an,ad]=ratPairOfEntry(a),[bn,bd]=ratPairOfEntry(b);
  return rationalOfBigInts(an*bn,ad*bd);
};
const equal=(a,b)=>{
  const [an,ad]=ratPairOfEntry(a),[bn,bd]=ratPairOfEntry(b);
  return an*bd===bn*ad;
};
const dot=(row,x)=>row.reduce((sum,value,i)=>add(sum,mul(value,x[i])),0);

test("exact constrained section admits a whole affine solution and actual free generators",()=>{
  const A=[["1/2","1/3","0"],["1/4","1/6","0"]];
  const b=["1/4","1/8"];
  const answer=ratSolve(A,b);
  assert.equal(answer.status,"solution-family");
  assert.equal(answer.rank,1);
  assert.equal(answer.particular.length,3);
  assert.equal(answer.kernelBasis.length,2);
  for(let i=0;i<A.length;i++)assert.ok(equal(dot(A[i],answer.particular),b[i]));
  for(const basis of answer.kernelBasis)
    for(const row of A)assert.ok(equal(dot(row,basis),0),
      "every free generator is actually in the kernel of the source equation");
  assert.equal(answer.obstruction,null);
});

test("incompatible source-local equations give a checkable no-glue linear combination",()=>{
  const A=[[1,1],[1,1]],b=[2,3];
  const answer=ratSolve(A,b);
  assert.equal(answer.status,"inconsistent");
  assert.equal(answer.particular,null);
  const weights=answer.obstruction.sourceEquationWeights;
  for(let j=0;j<2;j++)assert.ok(equal(
    dot(weights,A.map(row=>row[j])),0),"source row combination cancels every unknown");
  assert.ok(equal(dot(weights,b),answer.obstruction.reducedRightHandSide));
  assert.ok(!equal(answer.obstruction.reducedRightHandSide,0));
});

test("empty source constraints retain the complete free solution space",()=>{
  const answer=ratSolve([],[],{columns:2});
  assert.equal(answer.status,"solution-family");
  assert.equal(answer.rank,0);
  assert.equal(answer.kernelBasis.length,2);
  const inconsistent=ratSolve([[]],[1],{columns:0});
  assert.equal(inconsistent.status,"inconsistent");
});
