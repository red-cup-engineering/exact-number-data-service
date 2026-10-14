/**
 * Resource-usage boundary over the EXISTING exact graded-rational number law.
 *
 * A source-observed measurement is not a price, invoice, sale, allocation,
 * installed capacity, or permission to use a source. Units, grades, actor
 * boundaries and rational magnitudes must survive SCA/SEN/SEAVT projection.
 *
 * Familiar measures are normalized to the OpenTelemetry/UCUM-style unit
 * appropriate to their dimension; a new opaque resource may only be named
 * by its own SCA NI. Unit aliases are explicit linear maps, never exchange
 * rates (especially never Flow credits -> USD). The underlying graded
 * arithmetic is owned by exact-number-data-service/graded, not copied here.
 */
import {gradedFromParts,gradedSign,gradedValue} from './graded.mjs';
import {rationalParts} from './exact-number.mjs';

const NI=/^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u;
const UNIT=/^(?:[A-Za-z][A-Za-z0-9._-]{0,48}|\{[A-Za-z][A-Za-z0-9._-]{0,46}\})$/u;
const DIGITS=/^(?:0|[1-9][0-9]{0,127})$/u;
const invalid=message=>{throw new TypeError('resource measurement: '+message)};
const bounded=(x,name,max=300)=>{
 if(typeof x!=='string'||!x.trim()||x.length>max||/\s/u.test(x))
  invalid(name+' must be bounded nonblank text with no whitespace');
 return x;
};
const ratio=(num,den,resource,unit,supplier,consumer)=>{
 if(typeof num!=='string'||!DIGITS.test(num)||
    typeof den!=='string'||!/^[1-9][0-9]{0,127}$/u.test(den))
  invalid('exact resource quantity needs unsigned canonical decimal numerator and positive denominator');
 const grade=JSON.stringify(['resource',supplier,consumer,resource,unit]);
 const measured=gradedFromParts(BigInt(num),BigInt(den),grade);
 if(gradedSign(measured)<0)invalid('consumed resource cannot be negative');
 return measured;
};

// Explicit dimensional equivalences, NOT prices or currency conversion.
// Each tuple maps the source unit into [canonical measurement unit,
// numerator scale, denominator scale]. These names are existing 561 Group
// actual media/inference resource-carrier names; no new provider catalogue.
const KNOWN=Object.freeze({
 'cpu-runtime':Object.freeze({
  millisecond:['s','1','1000'],ms:['s','1','1000'],s:['s','1','1']}),
 'wall-runtime':Object.freeze({
  millisecond:['s','1','1000'],ms:['s','1','1000'],s:['s','1','1']}),
 'ram-residency':Object.freeze({
  'byte-second':['By.s','1','1'],'By.s':['By.s','1','1']}),
 'memory-peak':Object.freeze({byte:['By','1','1'],By:['By','1','1']}),
 'network-egress':Object.freeze({byte:['By','1','1'],By:['By','1','1']}),
 'network-ingress':Object.freeze({byte:['By','1','1'],By:['By','1','1']}),
 'inference-input':Object.freeze({token:['{token}','1','1'],'{token}':['{token}','1','1']}),
 'inference-output':Object.freeze({token:['{token}','1','1'],'{token}':['{token}','1','1']}),
 'inference-cached-input':Object.freeze({token:['{token}','1','1'],'{token}':['{token}','1','1']}),
 'inference-reasoning-output':Object.freeze({token:['{token}','1','1'],'{token}':['{token}','1','1']}),
 energy:Object.freeze({joule:['J','1','1'],J:['J','1','1']}),
 'gpu-runtime':Object.freeze({millisecond:['s','1','1000'],ms:['s','1','1000'],s:['s','1','1']})
});

/**
 * Receive exactly one existing {resource,unit,amount} source reading.
 * Preserve the original unit in sourceUnit if normalization changes it.
 * A new NI resource is an opaque, source-defined commodity; an unknown label
 * is not evidence that the commodity exists or has a recognized unit.
 */
export function admitResourceMeasurement(row,{supplierActorRef,consumerActorRef}={}){
 if(row===null||typeof row!=='object'||Array.isArray(row))
  invalid('one measured resource row required');
 const resource=bounded(row.resource,'resource',120);
 const unit=bounded(row.unit,'unit',60);
 const supplier=bounded(supplierActorRef,'supplying actor');
 const consumer=bounded(consumerActorRef,'consuming actor');
 if(!/^(?:actor:|urn:ame:)[^\s]+$/u.test(supplier)||
    !/^(?:actor:|urn:ame:)[^\s]+$/u.test(consumer))
  invalid('actor origin must be an existing typed micro-enterprise actor');
 let target,opaque=false;
 if(Object.hasOwn(KNOWN,resource)){
  target=KNOWN[resource][unit];
  if(target===undefined)invalid('known resource and unit have contradictory dimensions');
 }else{
  if(!NI.test(resource)||!UNIT.test(unit)||/^[A-Z]{3}$/u.test(unit))
   invalid('new resource needs a source-owned NI and explicit noncurrency unit');
  target=[unit,'1','1'];opaque=true;
 }
 const amount=typeof row.amount==='string'?
  {numerator:row.amount,denominator:'1'}:row.amount;
 if(amount===null||typeof amount!=='object'||Array.isArray(amount)||
    Object.keys(amount).sort().join(',')!=='denominator,numerator')
  invalid('resource amount must have exact numerator and denominator only');
 const [canonicalUnit,scaleNum,scaleDen]=target;
 const n=bounded(amount.numerator,'quantity numerator',128);
 const d=bounded(amount.denominator,'quantity denominator',128);
 // Exact-number graded arithmetic owns rational reduction and composition.
 const initial=ratio(n,d,resource,unit,supplier,consumer);
 const [a,b]=rationalParts(gradedValue(initial));
 const measured=ratio((a*BigInt(scaleNum)).toString(),
  (b*BigInt(scaleDen)).toString(),resource,canonicalUnit,supplier,consumer);
 const [num,den]=rationalParts(gradedValue(measured));
 return Object.freeze({
  resource,unit:canonicalUnit,
  amount:Object.freeze({numerator:num.toString(),denominator:den.toString()}),
  gradedAmount:measured,
  ...(unit===canonicalUnit?{}:{sourceUnit:unit}),
  interpretation:opaque?'source-defined-opaque-unit':'recognized-physical-dimension',
  evidenceStatus:'observed-quantity-not-financial-settlement'
 });
}

/** One exact resource/grade per period; source aliases cannot double-count. */
export function admitResourceMeasurements(rows,actors){
 if(!Array.isArray(rows)||rows.length<1||rows.length>64)
  invalid('resource quantity collection must contain 1..64 bounded observations');
 const seen=new Set(),out=[];
 for(const value of rows){
  const row=admitResourceMeasurement(value,actors);
  const key=JSON.stringify([row.resource,row.unit]);
  if(seen.has(key))invalid('duplicate canonical resource and unit in one observation');
  seen.add(key);out.push(row);
 }
 return Object.freeze(out);
}
