/**
 * Exact interval-resource network admission and bounded optimal-throughput
 * guarantees. Both endpoint networks use the original exact flow optimizer
 * and independent dual/primal verification preserved from Math Engineering.
 *
 * If each realized per-unit cost lies within its provided interval, then:
 * pessimistic-optimal volume <= realized-optimal volume <= optimistic-optimal
 * volume. Claims are conditional on the *fixed linear graph*. An interval
 * from physical JS floating estimates is not a certified physical bound.
 */
import { ratCompare, ratEqual, rationalOfBigInts } from "@red-cup-engineering/metrologic/number/exact-number";
import { admitExactResourceFlowWork, computeExactResourceFlowWork } from "./flow-work.mjs";

export function admitExactResourceEnvelope(input) {
  if(!input||typeof input!=="object"||!Array.isArray(input.links)||
     input.budget===null||input.budget===undefined)
    throw new TypeError("interval network needs links and an explicit finite resource budget");
  const shape=(o,keys)=>{
    if(!o||typeof o!=="object"||Array.isArray(o)||Object.keys(o).some(k=>!keys.includes(k)))
      throw new TypeError("unexpected interval network shape");
  };
  shape(input,["nodes","links","sources","demands","budget"]);
  const pairs=input.links.map(l=>{
    shape(l,["id","from","to","capacity","unitResourceLower","unitResourceUpper"]);
    return l;
  });
  const form = key => ({
    nodes:input.nodes,sources:input.sources,demands:input.demands,budget:input.budget,
    links:pairs.map(l=>({id:l.id,from:l.from,to:l.to,capacity:l.capacity,unitResourceCost:l[key]}))
  });
  const low=form("unitResourceLower"),high=form("unitResourceUpper");
  admitExactResourceFlowWork(low);
  admitExactResourceFlowWork(high);
  const parse=x=>{
    if(typeof x==="number")x=String(x);
    const [n,d="1"]=x.split("/");
    return rationalOfBigInts(BigInt(n), BigInt(d));
  };
  for(const l of pairs) {
    if((ratCompare(parse(l.unitResourceUpper), parse(l.unitResourceLower)) < 0))
      throw new RangeError("upper per-unit cost must be >= lower: "+l.id);
  }
  return {low,high};
}
export function computeExactResourceEnvelopeWork(input) {
  const {low,high}=admitExactResourceEnvelope(input);
  const optimistic=computeExactResourceFlowWork(low);
  const pessimistic=computeExactResourceFlowWork(high);
  const optimumLow=optimistic.result.withBudget.delivered;
  const optimumHigh=pessimistic.result.withBudget.delivered;
  const rational=x=>{
    const [n,d="1"]=x.split("/");
    return rationalOfBigInts(BigInt(n), BigInt(d));
  };
  if((ratCompare(rational(optimumLow), rational(optimumHigh)) < 0))
    throw new Error("monotonic cost bound was violated");
  const full=optimistic.result.totalDemand;
  const verdict=(ratCompare(rational(optimumLow), rational(full)) < 0)?"excluded-even-with-optimistic-costs":
    ratEqual(rational(optimumHigh), rational(full))?"energy-sufficient-under-all-admitted-costs":
    "indeterminate-between-optimistic-and-pessimistic-costs";
  return {
    model:"exact-capacitated-resource-cost-envelope/v1",
    classification:verdict,
    guarantee:"in a fixed capacitated network with per-unit costs between the stated nonnegative rational bounds, best-case and worst-case maximum deliverable volumes bracket every intermediate cost model",
    minimumBudgetFeasibleDelivery:optimumHigh,
    maximumBudgetFeasibleDelivery:optimumLow,
    requestedVolume:full,resourceBudget:optimistic.result.budget,
    optimistic, pessimistic,
    exclusions:["no proof every possible hydraulic state is within the supplied bounds",
      "no temporal storage/demand scheduling","no pipe pressure or pump-curve qualification",
      "no source water rights, public jurisdiction, fairness or ecological authorization"]
  };
}
