/**
 * Derive time-windowed resource flows from original one-second observations.
 *
 * This is a pure fold over source-metered quantities, not a second journal or
 * a bookkeeper. A reading has already been identified by its SignCell source
 * address, and its quantities are admitted by the shared exact-number module.
 * Keeping only source observations lets readers reconstruct arbitrary windows
 * without storing four redundant aggregates per event.
 *
 * The input contract is deliberately strict: an interval wider than one second
 * cannot be subdivided into second-level use without inventing measurements.
 * Every output advertises the number of seconds actually represented; absence
 * of a row means unobserved, NEVER zero consumption.
 */
import {admitResourceMeasurements} from './resource-measurement.mjs';
import {gradedAdd,gradedCompare,gradedValue} from './graded.mjs';
import {rationalParts} from './exact-number.mjs';

export const RESOURCE_FLOW_WINDOWS=Object.freeze([
 Object.freeze({resolution:'second',milliseconds:1000}),
 Object.freeze({resolution:'minute',milliseconds:60000}),
 Object.freeze({resolution:'hour',milliseconds:3600000}),
 Object.freeze({resolution:'day',milliseconds:86400000})
]);

const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const ACTOR=/^(?:actor:|urn:ame:)[^\s]+$/u;
const UTC=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000Z$/u;
const invalid=reason=>{throw new TypeError('resource flow: '+reason)};
const asActor=(value,name)=>{
 if(typeof value!=='string'||value.length>300||!ACTOR.test(value))
  invalid(name+' must be a source-owned actor reference');
 return value;
};
const asFeed=value=>{
 if(typeof value!=='string'||value.length>300||!(/^(?:urn:|ni:|actor:)[^\s]+$/u).test(value))
  invalid('feedRef must be a bounded source-owned reference');
 return value;
};
const instant=(value,name)=>{
 if(typeof value!=='string'||!UTC.test(value))invalid(name+' must be exact UTC seconds');
 const parsed=Date.parse(value);
 if(!Number.isFinite(parsed)||new Date(parsed).toISOString()!==value)
  invalid(name+' is not a real canonical UTC instant');
 return parsed;
};
const exactAmount=value=>{
 const [numerator,denominator]=rationalParts(gradedValue(value));
 return Object.freeze({numerator:numerator.toString(),denominator:denominator.toString()});
};
const order=(a,b)=>a.localeCompare(b,'en');

/**
 * Input: source-observation-addressed, one-second observations.
 *
 *  {sourceObservationAddress, startAt, endAt, feedRef, serviceActorRef,
 *   supplierActorRef, consumerActorRef,
 *   measurements:[{resource,unit,amount:{numerator,denominator}}]}
 *
 * All intervals are half-open [startAt,endAt), in UTC; one source observation
 * may carry multiple different dimensions, but never the same one twice.
 * Duplicate identical source observations are counted once, including when a
 * provider retries delivery. Reuse of an address for different content fails.
 *
 * Every returned window is a derived reading, never a new ledger posting.
 * "memory-peak" is a gauge and composes by max; increments and integrals
 * compose by sum. Nothing invents monetary prices, makes token/byte
 * conversions or imputes observations for missing seconds.
 */
export function deriveResourceFlowReadings(samples){
 if(!Array.isArray(samples)||samples.length>100000)
  invalid('expected at most 100000 source observations');
 const sourceContents=new Map();
 const buckets=new Map();
 for(const sample of samples){
  if(sample===null||typeof sample!=='object'||Array.isArray(sample))
   invalid('observation must be an object');
  if(typeof sample.sourceObservationAddress!=='string'||!NI.test(sample.sourceObservationAddress))
   invalid('observation needs an existing SignCell source address');
  const previous=sourceContents.get(sample.sourceObservationAddress);
  const serialized=JSON.stringify(sample);
  if(previous!==undefined){
   if(previous!==serialized)invalid('source address was reused for different observations');
   continue;
  }
  const start=instant(sample.startAt,'startAt');
  const end=instant(sample.endAt,'endAt');
  if(end-start!==1000)invalid('second-level flow needs one-second input intervals; do not fabricate missing samples');
  const feedRef=asFeed(sample.feedRef);
  const serviceActorRef=asActor(sample.serviceActorRef,'serviceActorRef');
  const supplierActorRef=asActor(sample.supplierActorRef,'supplierActorRef');
  const consumerActorRef=asActor(sample.consumerActorRef,'consumerActorRef');
  const measurements=admitResourceMeasurements(sample.measurements,
   {supplierActorRef,consumerActorRef});
  sourceContents.set(sample.sourceObservationAddress,serialized);
  for(const {resolution,milliseconds} of RESOURCE_FLOW_WINDOWS){
   const windowStart=Math.floor(start/milliseconds)*milliseconds;
   const startAt=new Date(windowStart).toISOString();
   const endAt=new Date(windowStart+milliseconds).toISOString();
   for(const observed of measurements){
    const {resource,unit,gradedAmount}=observed;
    const aggregation=resource==='memory-peak'?'peak':'sum';
    const key=JSON.stringify([resolution,startAt,feedRef,serviceActorRef,
     supplierActorRef,consumerActorRef,resource,unit,aggregation]);
    const prior=buckets.get(key);
    if(prior===undefined){
     buckets.set(key,{
      resolution,startAt,endAt,feedRef,serviceActorRef,
      supplierActorRef,consumerActorRef,resource,unit,aggregation,
      total:gradedAmount,seconds:new Set([start]),sourceCount:1
     });
    }else{
     prior.total=aggregation==='peak'
      ?(gradedCompare(prior.total,gradedAmount)>=0?prior.total:gradedAmount)
      :gradedAdd(prior.total,gradedAmount);
     prior.seconds.add(start);
     prior.sourceCount++;
    }
   }
  }
 }
 const result=[...buckets.values()].map(row=>Object.freeze({
  resolution:row.resolution,startAt:row.startAt,endAt:row.endAt,
  feedRef:row.feedRef,serviceActorRef:row.serviceActorRef,
  supplierActorRef:row.supplierActorRef,consumerActorRef:row.consumerActorRef,
  resource:row.resource,unit:row.unit,aggregation:row.aggregation,
  amount:exactAmount(row.total),observedSeconds:row.seconds.size,
  windowSeconds:RESOURCE_FLOW_WINDOWS.find(w=>w.resolution===row.resolution).milliseconds/1000,
  sourceCount:row.sourceCount,
  evidenceStatus:'derived-from-observed-intervals-not-financial-posting'
 }));
 result.sort((a,b)=>order(JSON.stringify([
  a.startAt,a.resolution,a.feedRef,a.serviceActorRef,a.supplierActorRef,
  a.consumerActorRef,a.resource,a.unit
 ]),JSON.stringify([
  b.startAt,b.resolution,b.feedRef,b.serviceActorRef,b.supplierActorRef,
  b.consumerActorRef,b.resource,b.unit
 ])));
 return Object.freeze(result);
}
