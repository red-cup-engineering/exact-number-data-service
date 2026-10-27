import test from "node:test";
import assert from "node:assert/strict";
import {
  DISCOUNT_RATE_BRACKET_KIND, DISCOUNT_RATE_BRACKET_LIMITS,
  admitDiscountRateBracketWork, computeDiscountRateBracketWork,
  verifyDiscountRateBracketWork,
} from "../src/discount-rate-bracket.mjs";

const copy = value => JSON.parse(JSON.stringify(value));
const body = (patch = {}) => ({
  currency:"USD",periodUnit:"year",
  cashFlows:[{period:0,amount:"-100"},{period:1,amount:"110"}],
  lowerRate:"0",upperRate:"0.2",iterations:16,...patch,
});
const check = request => {
  const result = computeDiscountRateBracketWork(request);
  assert.deepEqual(verifyDiscountRateBracketWork(request,copy(result)).ok,true);
  return result;
};
const refuses = (callback, code) =>
  assert.throws(callback,error=>typeof error?.code==="string" &&
    (!code||error.code===code), "must refuse with typed error");

test("analytic 10 percent one-period yield has exact 1/10 root and a verifiable receipt",()=>{
  const value=check(body());
  assert.equal(value.kind,DISCOUNT_RATE_BRACKET_KIND);
  assert.equal(value.guaranteedUnique,true);
  assert.equal(value.exactRoot,true);
  assert.equal(value.iterationsPerformed,1);
  assert.deepEqual(value.lower.rate,{kind:"exactNumber.rational",num:"1",den:"10"});
  assert.deepEqual(value.upper,value.lower);
  assert.deepEqual(value.lower.npv,{kind:"exactNumber.rational",num:"0",den:"1"});
  assert.equal(Object.hasOwn(value,"payment"),false);
});

test("irrational sqrt(2)-1 yield is a narrow exact rational enclosure, not a fabricated point decimal",()=>{
  const request=body({cashFlows:[{period:0,amount:"-100"},{period:2,amount:"200"}],
    lowerRate:"0",upperRate:"1",iterations:24});
  const r=check(request);
  assert.equal(r.exactRoot,false);
  assert.equal(r.iterationsPerformed,24);
  const low=BigInt(r.lower.rate.num)*BigInt(r.lower.rate.den);
  assert.ok(low>=0n); // wire fractions are nonnegative in the original interval
  // For this case, positive NPV means 1+r has square below 2, negative above.
  for(const [endpoint,relation] of [[r.lower,-1],[r.upper,1]]) {
    const n=BigInt(endpoint.rate.num),d=BigInt(endpoint.rate.den);
    const gap=(n+d)**2n-2n*d*d;
    assert.equal(Math.sign(Number(gap)),relation);
  }
});

test("negative yields and zero-value endpoints preserve exact period discount conventions",()=>{
  const investment=body({cashFlows:[{period:0,amount:"-100"},{period:1,amount:"90"}],
    lowerRate:"-0.5",upperRate:"0.5",iterations:20});
  assert.equal(check(investment).guaranteedUnique,true);
  const endpoint=body({lowerRate:"0.1",upperRate:"0.2",iterations:32});
  const result=check(endpoint);
  assert.equal(result.exactRoot,true);
  assert.equal(result.iterationsPerformed,0);
  assert.deepEqual(result.lower.rate,{kind:"exactNumber.rational",num:"1",den:"10"});
});

test("valid host admission is structural and bounded before iterated exact computation",()=>{
  assert.deepEqual(DISCOUNT_RATE_BRACKET_LIMITS,{
    maxCashFlows:24,maxPeriod:64,maxDigits:32,maxPlaces:0,maxArithmeticDigits:16000,
  });
  assert.equal(admitDiscountRateBracketWork(body()).admitted,true);
  for(const invalid of [
    body({iterations:0}),body({iterations:33}),
    body({lowerRate:"-1"}),body({upperRate:"-1"}),
    body({lowerRate:"0.2",upperRate:"0.1"}),
    body({cashFlows:[{period:0,amount:"0"},{period:1,amount:"110"}]}),
    body({cashFlows:[{period:0,amount:"-100"},{period:1,amount:"0"}]}),
    body({cashFlows:[{period:0,amount:"-100"},{period:1,amount:"110"},{period:2,amount:"-1"}]}),
    body({cashFlows:[{period:0,amount:"-100"},{period:65,amount:"110"}]}),
    body({lowerRate:"NaN"}),body({lowerRate:"0",upperRate:"0"}),
    {...body(), verified:true}, {...body(), currency:"US"},
    {...body(), cashFlows:[{period:0,amount:"-100"},, {period:1,amount:"110"}]},
  ]) assert.throws(()=>admitDiscountRateBracketWork(invalid));
  const unbracketed=body({lowerRate:"0.2",upperRate:"0.3"});
  refuses(()=>admitDiscountRateBracketWork(unbracketed),"RATE_BRACKET_NO_ROOT");
  refuses(()=>computeDiscountRateBracketWork(unbracketed),"RATE_BRACKET_NO_ROOT");
});

test("independent polynomial receiver rejects altered endpoints, algebra, source, width and false authority",()=>{
  const original=body({cashFlows:[{period:0,amount:"-100"},{period:2,amount:"200"}],
    lowerRate:"0",upperRate:"1",iterations:20});
  const valid=check(original);
  const adversaries=[
    r=>{r.lower.npv.num="99";},
    r=>{r.upper.rate.num="0";},
    r=>{r.lower.rate.num="2";r.lower.rate.den="2";}, // noncanonical and out of range
    r=>{r.lower.rate.den="0";},
    r=>{r.lower.rate.den="02";},
    r=>{r.iterationsPerformed=1;},
    r=>{r.requestedIterations=19;},
    r=>{r.currency="EUR";},
    r=>{r.periodUnit="month";},
    r=>{r.guaranteedUnique=false;},
    r=>{r.exactRoot=true;},
    r=>{r.scope="all markets";},
    r=>{r.payment={settled:true};},
    r=>{r.cashFlows[1].amount="201";},
    r=>{r.cashFlows.reverse();},
    r=>{r.cashFlows.push({period:3,amount:"1"});},
    r=>{r.lower.npv={kind:"exactNumber.rational",num:"0",den:"1"};},
  ];
  for(const mutate of adversaries){
    const forged=copy(valid);mutate(forged);
    const verdict=verifyDiscountRateBracketWork(original,forged);
    assert.equal(verdict.ok,false,JSON.stringify(forged));
    assert.match(verdict.code,/^RATE_BRACKET_/);
  }
  const replacedSource=copy(original);
  replacedSource.cashFlows[1].amount="199";
  assert.equal(verifyDiscountRateBracketWork(replacedSource,valid).ok,false);
  assert.equal(verifyDiscountRateBracketWork(original,null).ok,false);
});

test("input occurrences are source-relative; repeated payments stay separate",()=>{
  const case0=body({cashFlows:[
    {period:0,amount:"-100"},{period:1,amount:"55"},{period:1,amount:"55"},
  ]});
  const result=check(case0);
  assert.equal(result.exactRoot,true);
  assert.deepEqual(result.lower.rate,{kind:"exactNumber.rational",num:"1",den:"10"});
  assert.equal(verifyDiscountRateBracketWork(body(),result).ok,false);
});
