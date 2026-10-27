/**
 * Exact, bounded, uniqueness-certified internal-rate-of-return bracket.
 *
 * Domain: one strictly negative net period-zero investment and nonnegative
 * later flows, at least one strictly positive. For r > -1 the discrete NPV
 * is continuous and strictly decreasing: there is exactly one zero. Neither
 * arbitrary mixed-sign cash flows nor multiple-IRR claims are admissible.
 *
 * The producer bisects using canonical BigInt rational arithmetic. The
 * independent receiver evaluates a different, polynomial form of NPV using
 * the buyer's ORIGINAL submitted cash-flow rows and checks its exact signs,
 * endpoint inclusion, uniqueness prerequisites and guaranteed rate width.
 * No inferred source authenticity, customer payment or price is conferred.
 */
import {
  rationalOfBigInts, rationalParts, ratZero, ratOne, ratAdd, ratSubtract,
  ratMultiply, ratCompare, ratSign, ratEqual, divide,
} from "./exact-number.mjs";
import { rationalOfDecimal } from "./decimal-string.mjs";
import { admitCashFlowRequest } from "./cash-flow.mjs";

export const DISCOUNT_RATE_BRACKET_KIND = "exact-number.discount-rate-bracket/v1";
export const DISCOUNT_RATE_BRACKET_LIMITS = Object.freeze({
  maxCashFlows: 24, maxPeriod: 64, maxDigits: 32,
  maxPlaces: 0, maxArithmeticDigits: 16000,
});
const FIELDS = ["currency", "periodUnit", "cashFlows", "lowerRate", "upperRate", "iterations"];
const RESULT_FIELDS = ["kind","currency","periodUnit","cashFlows","lowerRate","upperRate",
  "requestedIterations","iterationsPerformed","exactRoot","lower","upper",
  "guaranteedUnique","scope"];
const TWO = rationalOfBigInts(2n, 1n);
const SCOPE = "unique conditional root of strictly decreasing discrete-period NPV on the admitted interval";

function refuse(code, message, Type = RangeError) {
  throw Object.assign(new Type(message), {code});
}
function exactFields(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) ||
      ![Object.prototype,null].includes(Object.getPrototypeOf(value)))
    refuse("RATE_BRACKET_SHAPE", `${label} must be a plain record`, TypeError);
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || own.some(key =>
       typeof key !== "string" || !keys.includes(key) ||
       !Object.hasOwn(Object.getOwnPropertyDescriptor(value,key),"value")))
    refuse("RATE_BRACKET_SHAPE", `${label} has an extra, missing or accessor field`, TypeError);
}
function rationalFromWire(value, maxDigits, label) {
  exactFields(value, ["kind","num","den"], label);
  if (value.kind !== "exactNumber.rational" ||
      typeof value.num !== "string" || typeof value.den !== "string" ||
      value.num.length > maxDigits + 1 || value.den.length > maxDigits ||
      !/^(?:0|-?[1-9][0-9]*)$/u.test(value.num) ||
      !/^[1-9][0-9]*$/u.test(value.den))
    refuse("RATE_BRACKET_PROOF", `${label} has invalid rational wire representation`);
  const made = rationalOfBigInts(BigInt(value.num), BigInt(value.den));
  if (made.num !== value.num || made.den !== value.den)
    refuse("RATE_BRACKET_PROOF", `${label} is not a reduced canonical exact rational`);
  return made;
}
function present(value) {
  const [num, den] = rationalParts(value);
  return Object.freeze({kind:"exactNumber.rational",num:num.toString(),den:den.toString()});
}
function validate(source) {
  exactFields(source,FIELDS,"discount-rate request");
  if (!Number.isSafeInteger(source.iterations) ||
      source.iterations < 1 || source.iterations > 32)
    refuse("RATE_BRACKET_WORK_LIMIT","iterations must be 1..32");
  // Source-owned admission enforces canonical decimal syntax, dense arrays,
  // precise period/cash-flow bounds and declared currency/unit semantics.
  const original = {
    currency:source.currency, periodUnit:source.periodUnit,
    rate:source.lowerRate, cashFlows:source.cashFlows,
    rounding:{places:0,mode:"toward-zero"},
  };
  const low=admitCashFlowRequest(original,DISCOUNT_RATE_BRACKET_LIMITS);
  const high=admitCashFlowRequest({...original,rate:source.upperRate},DISCOUNT_RATE_BRACKET_LIMITS);
  const lo=rationalOfDecimal(low.rate),hi=rationalOfDecimal(high.rate);
  if (ratCompare(lo,hi)>=0)
    refuse("RATE_BRACKET_BOUNDS","lowerRate must be strictly less than upperRate");
  let atZero=ratZero,positiveFuture=false;
  for(const flow of low.cashFlows){
    const amount=rationalOfDecimal(flow.amount);
    if(flow.period===0) atZero=ratAdd(atZero,amount);
    else {
      if (ratSign(amount)<0)
        refuse("RATE_BRACKET_SIGN_PATTERN","later cash flows must be nonnegative for unique-root certificate");
      if (ratSign(amount)>0) positiveFuture=true;
    }
  }
  if (ratSign(atZero)>=0 || !positiveFuture)
    refuse("RATE_BRACKET_SIGN_PATTERN","requires negative net period-zero investment and positive future proceeds");
  return {source:low,lo,hi,iterations:source.iterations,lowerRate:source.lowerRate,
    upperRate:high.rate};
}

// Reusable bounds and hypothesis check without entering the bisection loop.
export function admitDiscountRateBracketWork(input){
  const a=validate(input);
  return Object.freeze({
    admitted:true,kind:DISCOUNT_RATE_BRACKET_KIND,
    currency:a.source.currency,periodUnit:a.source.periodUnit,
    cashFlowCount:a.source.cashFlows.length,
    iterations:a.iterations,
    numericDomain:"exact rational",
    monotonicity:"strictly decreasing for every rate > -1",
  });
}
function powRational(base, exp) {
  let power=base, out=ratOne, n=exp;
  while(n>0){
    if(n%2===1)out=ratMultiply(out,power);
    n=Math.floor(n/2);
    if(n>0)power=ratMultiply(power,power);
  }
  return out;
}

// Producer evaluates the original discounted sum directly.
function sourceNPV(flows, rate){
  const growth=ratAdd(ratOne,rate);
  if(ratSign(growth)<=0)refuse("RATE_BRACKET_BOUNDS","rate must exceed -1");
  const inverse=divide(ratOne,growth);
  let value=ratZero;
  for(const {period,amount} of flows)
    value=ratAdd(value,ratMultiply(rationalOfDecimal(amount),powRational(inverse,period)));
  return value;
}

// Receiver uses the independent polynomial identity:
//    (1+r)^T NPV(r) = sum_i a_i (1+r)^(T-t_i).
// The positive multiplier preserves the sign of NPV for every r > -1.
function receivingNPV(flows, rate){
  const growth=ratAdd(ratOne,rate);
  if(ratSign(growth)<=0)refuse("RATE_BRACKET_BOUNDS","rate must exceed -1");
  const highest=flows.reduce((m,f)=>Math.max(m,f.period),0);
  let polynomial=ratZero;
  for(const {period,amount} of flows)
    polynomial=ratAdd(polynomial,ratMultiply(
      rationalOfDecimal(amount),powRational(growth,highest-period)));
  return divide(polynomial,powRational(growth,highest));
}
function conclusion(a,lower,upper,steps,exactRoot){
  return Object.freeze({
    kind:DISCOUNT_RATE_BRACKET_KIND,
    currency:a.source.currency,periodUnit:a.source.periodUnit,
    cashFlows:a.source.cashFlows,
    lowerRate:a.lowerRate,upperRate:a.upperRate,
    requestedIterations:a.iterations,iterationsPerformed:steps,
    exactRoot,
    lower:Object.freeze({rate:present(lower.rate),npv:present(lower.npv)}),
    upper:Object.freeze({rate:present(upper.rate),npv:present(upper.npv)}),
    guaranteedUnique:true,scope:SCOPE,
  });
}
export function computeDiscountRateBracketWork(input){
  const a=validate(input);
  let lower={rate:a.lo,npv:sourceNPV(a.source.cashFlows,a.lo)};
  let upper={rate:a.hi,npv:sourceNPV(a.source.cashFlows,a.hi)};
  if(ratSign(lower.npv)<0 || ratSign(upper.npv)>0)
    refuse("RATE_BRACKET_NO_ROOT","submitted bounds do not bracket the unique zero");
  let receipt;
  if(ratSign(lower.npv)===0)receipt=conclusion(a,lower,lower,0,true);
  else if(ratSign(upper.npv)===0)receipt=conclusion(a,upper,upper,0,true);
  else {
    for(let i=1;i<=a.iterations;i++){
      const rate=divide(ratAdd(lower.rate,upper.rate),TWO);
      const npv=sourceNPV(a.source.cashFlows,rate);
      if(ratSign(npv)===0){
        receipt=conclusion(a,{rate,npv},{rate,npv},i,true);
        break;
      }
      if(ratSign(npv)>0)lower={rate,npv};
      else upper={rate,npv};
    }
    receipt??=conclusion(a,lower,upper,a.iterations,false);
  }
  const verification=verifyDiscountRateBracketWork(input,receipt);
  if(!verification.ok)
    refuse("RATE_BRACKET_INTERNAL",`receiver rejected mathematical producer: ${verification.code}: ${verification.reason}`,Error);
  return receipt;
}
/**
 * The independent mathematical receiver does not call the producer,
 * trust any boolean in the receipt, or sample an unknown market. A returned
 * narrow interval is an exact conditional model fact, never a measured ROI.
 */
export function verifyDiscountRateBracketWork(original,received){
  try {
    const a=validate(original);
    exactFields(received,RESULT_FIELDS,"discount-rate result");
    if(received.kind!==DISCOUNT_RATE_BRACKET_KIND ||
       received.currency!==a.source.currency ||
       received.periodUnit!==a.source.periodUnit ||
       received.lowerRate!==a.lowerRate ||
       received.upperRate!==a.upperRate ||
       received.requestedIterations!==a.iterations ||
       received.guaranteedUnique!==true ||
       received.scope!==SCOPE ||
       typeof received.exactRoot!=="boolean" ||
       !Number.isSafeInteger(received.iterationsPerformed) ||
       received.iterationsPerformed<0 ||
       received.iterationsPerformed>a.iterations)
      refuse("RATE_BRACKET_SOURCE","receipt changes original claim, numerical limits or interpretation");
    // Payment occurrences are source facts, not interchangeable total sums.
    // Preserve exact lexical amounts, periods and submitted row order.
    if(!Array.isArray(received.cashFlows) ||
       Object.getPrototypeOf(received.cashFlows)!==Array.prototype ||
       received.cashFlows.length!==a.source.cashFlows.length ||
       Reflect.ownKeys(received.cashFlows).length!==received.cashFlows.length+1)
      refuse("RATE_BRACKET_SOURCE","receipt does not retain the exact original source occurrences");
    for(let index=0;index<a.source.cashFlows.length;index++){
      const descriptor=Object.getOwnPropertyDescriptor(received.cashFlows,String(index));
      if(!descriptor || !Object.hasOwn(descriptor,"value"))
        refuse("RATE_BRACKET_SOURCE","receipt has sparse or executable cash-flow rows");
      exactFields(descriptor.value,["period","amount"],"cash-flow row");
      if(descriptor.value.period!==a.source.cashFlows[index].period ||
         descriptor.value.amount!==a.source.cashFlows[index].amount)
        refuse("RATE_BRACKET_SOURCE","receipt cash-flow occurrence changed from the buyer's original");
    }
    exactFields(received.lower,["rate","npv"],"lower receipt");
    exactFields(received.upper,["rate","npv"],"upper receipt");
    const l=rationalFromWire(received.lower.rate,128,"lower rate");
    const h=rationalFromWire(received.upper.rate,128,"upper rate");
    const ln=rationalFromWire(received.lower.npv,8192,"lower NPV");
    const hn=rationalFromWire(received.upper.npv,8192,"upper NPV");
    if(ratCompare(l,a.lo)<0 || ratCompare(h,a.hi)>0 || ratCompare(l,h)>0 ||
       !ratEqual(ln,receivingNPV(a.source.cashFlows,l)) ||
       !ratEqual(hn,receivingNPV(a.source.cashFlows,h)) ||
       ratSign(ln)<0 || ratSign(hn)>0)
      refuse("RATE_BRACKET_PROOF","received endpoints fail original source NPV/sign/inclusion");
    if(received.exactRoot){
      if(!ratEqual(l,h) || ratSign(ln)!==0 || ratSign(hn)!==0)
        refuse("RATE_BRACKET_PROOF","claimed exact root does not vanish at a single rate");
    } else {
      if(received.iterationsPerformed!==a.iterations ||
         ratCompare(l,h)>=0 || ratSign(ln)<=0 || ratSign(hn)>=0)
        refuse("RATE_BRACKET_PROOF","nonexact interval requires strict opposing signs and all iterations");
      const maximum=divide(ratSubtract(a.hi,a.lo),
        rationalOfBigInts(2n**BigInt(a.iterations),1n));
      if(ratCompare(ratSubtract(h,l),maximum)>0)
        refuse("RATE_BRACKET_PROOF","received interval exceeds requested exact width");
    }
    return Object.freeze({ok:true,kind:DISCOUNT_RATE_BRACKET_KIND,
      scope:"unique root under the buyer's admitted monotone cash-flow model"});
  } catch(error){
    return Object.freeze({ok:false,code:error?.code??"RATE_BRACKET_REFUSED",
      reason:String(error?.message??error)});
  }
}
