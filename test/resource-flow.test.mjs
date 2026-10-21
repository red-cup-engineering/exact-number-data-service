import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveResourceFlowReadings,deriveResourceEventReadings,compareResourceFlowWindows,compareResourceFlowIntensityWindows,RESOURCE_FLOW_WINDOWS} from '../src/resource-flow.mjs';

const ni=index=>'ni:///sha-256;'+String.fromCharCode(65+index).repeat(43);
const amount=(numerator,denominator='1')=>({numerator,denominator});
const sample=(id,time,measurements,overrides={})=>({
 sourceObservationAddress:ni(id),startAt:time,
 endAt:new Date(Date.parse(time)+1000).toISOString(),
 feedRef:'urn:feed:node-inference',serviceActorRef:'urn:ame:group-compute',
 supplierActorRef:'urn:ame:host-compute',consumerActorRef:'urn:ame:agent-one',
 measurements, ...overrides
});
const meter=(resource,unit,numerator,denominator='1')=>({
 resource,unit,amount:amount(numerator,denominator)
});
const rows=(results,resolution,resource)=>results.filter(x=>
 x.resolution===resolution&&x.resource===resource);

test('derives four time resolutions from original one-second evidence, without rounding quantities',()=>{
 const source=[
  sample(0,'2026-10-18T20:03:00.000Z',[meter('network-egress','byte','9007199254740993')]),
  sample(1,'2026-10-18T20:03:01.000Z',[meter('network-egress','By','7')])
 ];
 const readings=deriveResourceFlowReadings(source);
 assert.equal(RESOURCE_FLOW_WINDOWS.length,4);
 assert.equal(rows(readings,'second','network-egress').length,2);
 for(const resolution of ['minute','hour','day']){
  const [reading]=rows(readings,resolution,'network-egress');
  assert.deepEqual(reading.amount,amount('9007199254741000'));
  assert.equal(reading.observedSeconds,2);
  assert.equal(reading.sourceCount,2);
  assert.equal(reading.unit,'By');
  assert.equal(reading.evidenceStatus,'derived-from-observed-intervals-not-financial-posting');
 }
 assert.equal(rows(readings,'minute','network-egress')[0].windowSeconds,60);
 assert.deepEqual(deriveResourceFlowReadings([...source].reverse()),readings);
});

test('memory-peak uses max while residency sums, and distinct resources never get mixed',()=>{
 const readings=deriveResourceFlowReadings([
  sample(0,'2026-10-18T20:03:00.000Z',[
   meter('memory-peak','byte','100'),meter('ram-residency','byte-second','100'),
   meter('cpu-user-runtime','millisecond','1250'),meter('cpu-system-runtime','ms','100')
  ]),
  sample(1,'2026-10-18T20:03:01.000Z',[
   meter('memory-peak','By','250'),meter('ram-residency','By.s','250'),
   meter('cpu-user-runtime','s','5','4'),meter('cpu-system-runtime','ms','200')
  ])
 ]);
 const minute=resource=>rows(readings,'minute',resource)[0];
 assert.equal(minute('memory-peak').aggregation,'peak');
 assert.deepEqual(minute('memory-peak').amount,amount('250'));
 assert.equal(minute('ram-residency').aggregation,'sum');
 assert.deepEqual(minute('ram-residency').amount,amount('350'));
 assert.deepEqual(minute('cpu-user-runtime').amount,amount('5','2'));
 assert.deepEqual(minute('cpu-system-runtime').amount,amount('3','10'));
});

test('sparse and boundary readings do not invent unmeasured seconds or smear usage across windows',()=>{
 const readings=deriveResourceFlowReadings([
  sample(0,'2026-10-18T21:59:57.000Z',[meter('disk-write','byte','8')]),
  sample(1,'2026-10-18T21:59:59.000Z',[meter('disk-write','bit','4')]),
  sample(2,'2026-10-18T22:00:00.000Z',[meter('disk-write','byte','1')])
 ]);
 const seconds=rows(readings,'second','disk-write');
 assert.equal(seconds.length,3);
 assert.equal(seconds.find(x=>x.startAt==='2026-10-18T21:59:58.000Z'),undefined);
 const minutes=rows(readings,'minute','disk-write');
 assert.equal(minutes.length,2);
 assert.deepEqual(minutes[0].amount,amount('17','2'));
 assert.equal(minutes[0].observedSeconds,2);
 assert.equal(minutes[0].windowSeconds,60);
 assert.deepEqual(minutes[1].amount,amount('1'));
 assert.equal(rows(readings,'day','disk-write').length,1);
 assert.deepEqual(rows(readings,'day','disk-write')[0].amount,amount('19','2'));
});

test('retried source identity is idempotent, while an address collision refuses',()=>{
 const one=sample(0,'2026-10-18T20:03:00.000Z',[meter('inference-input','token','14')]);
 assert.deepEqual(deriveResourceFlowReadings([one,one]),deriveResourceFlowReadings([one]));
 assert.throws(()=>deriveResourceFlowReadings([
  one,{...one,measurements:[meter('inference-input','token','15')]}
 ]),/source address was reused/u);
});

test('same time and same resource from distinct actors, services and feeds do not commingle',()=>{
 const a=sample(0,'2026-10-18T20:03:00.000Z',[meter('network-egress','byte','4')]);
 const b=sample(1,'2026-10-18T20:03:00.000Z',[meter('network-egress','byte','8')],
  {consumerActorRef:'urn:ame:agent-two'});
 const c=sample(2,'2026-10-18T20:03:00.000Z',[meter('network-egress','byte','16')],
  {feedRef:'urn:feed:other'});
 const d=sample(3,'2026-10-18T20:03:00.000Z',[meter('network-egress','byte','32')],
  {serviceActorRef:'urn:ame:other-service'});
 const readings=rows(deriveResourceFlowReadings([a,b,c,d]),'hour','network-egress');
 assert.equal(readings.length,4);
 assert.deepEqual(readings.map(x=>x.amount.numerator).sort(),['16','32','4','8']);
});

test('refuses invalid time precision, dimensional misuse, missing actor and fictitious source evidence',()=>{
 const one=sample(0,'2026-10-18T20:03:00.000Z',[meter('cpu-runtime','ms','10')]);
 for(const changed of [
  {...one,sourceObservationAddress:'unverified'},
  {...one,startAt:'2026-10-18T20:03:00Z'},
  {...one,startAt:'2026-02-30T20:03:00.000Z'},
  {...one,endAt:'2026-10-18T20:03:02.000Z'},
  {...one,supplierActorRef:''},
  {...one,feedRef:''},
  {...one,measurements:[meter('network-ingress','USD','10')]},
  {...one,measurements:[meter('cpu-runtime','ms','10'),meter('cpu-runtime','s','1')]}
 ])assert.throws(()=>deriveResourceFlowReadings([changed]));
 assert.deepEqual(deriveResourceFlowReadings([]),[]);
});


const tokenEvent=(id,observedAt,amounts={},other={})=>({
 sourceObservationAddress:ni(id),observedAt,
 feedRef:'ni:///sha-256;'+'F'.repeat(43),
 resourceSubjectRef:'ni:///sha-256;'+'S'.repeat(43),
 measurements:Object.entries(amounts).map(([resource,numerator])=>meter(resource,'token',numerator)),
 ...other
});

test('source event-time readings group token events without inventing uniform second usage',()=>{
 const inputs=[
  tokenEvent(0,'2026-10-18T20:03:00.127Z',{
   'inference-input':'9007199254740993','inference-output':'2',
   'inference-cached-input':'2'
  }),
  tokenEvent(1,'2026-10-18T20:03:00.832Z',{
   'inference-input':'7','inference-output':'1',
   'inference-cached-input':'1'
  }),
  tokenEvent(2,'2026-10-18T20:04:00.000Z',{'inference-input':'1'})
 ];
 const result=deriveResourceEventReadings(inputs);
 assert.equal(result.filter(x=>x.resolution==='second'&&x.resource==='inference-input').length,2);
 const seconds=result.filter(x=>x.resolution==='second'&&x.resource==='inference-input');
 assert.deepEqual(seconds.find(x=>x.startAt==='2026-10-18T20:03:00.000Z').amount,
  amount('9007199254741000'));
 assert.equal(seconds[0].temporalBasis,'observed-event-time-not-interval-usage');
 assert.equal(Object.hasOwn(seconds[0],'observedSeconds'),false);
 const [hour]=result.filter(x=>x.resolution==='hour'&&x.resource==='inference-input');
 assert.deepEqual(hour.amount,amount('9007199254741001'));
 assert.equal(hour.attribution,'consumer-unattributed');
 assert.equal(hour.sourceCount,3);
 assert.equal(result.filter(x=>x.resolution==='hour'&&x.resource==='inference-output')[0].amount.numerator,'3');
 assert.equal(result.filter(x=>x.resolution==='hour'&&x.resource==='inference-cached-input')[0].amount.numerator,'3');
 assert.deepEqual(deriveResourceEventReadings([...inputs].reverse()),result);
 assert.deepEqual(deriveResourceEventReadings([inputs[0],inputs[0]]),
  deriveResourceEventReadings([inputs[0]]));
});

test('source event-time tokens retain category, consumer, provider/session and source-unit separation',()=>{
 const src=tokenEvent(0,'2026-10-18T21:59:59.999Z',{
  'inference-cache-creation-input':'5','inference-cache-read-input':'10'
 });
 const result=deriveResourceEventReadings([src,
  tokenEvent(1,'2026-10-18T22:00:00.001Z',{'inference-cache-read-input':'3'},
   {resourceSubjectRef:'ni:///sha-256;'+'T'.repeat(43)}),
  tokenEvent(2,'2026-10-18T22:00:00.001Z',{'inference-cache-read-input':'2'},
   {consumerActorRef:'urn:ame:known-agent'})
 ]);
 assert.equal(result.filter(x=>x.resolution==='minute').length,4);
 assert.equal(result.filter(x=>x.resolution==='day'&&x.resource==='inference-cache-read-input').length,3);
 assert.equal(result.find(x=>x.consumerActorRef==='urn:ame:known-agent')?.attribution,'consumer-source-attributed');
});

test('source event identity and exact timestamp admission refuse ambiguous or contradictory sources',()=>{
 const a=tokenEvent(0,'2026-10-18T20:03:01.107Z',{'inference-input':'2'});
 for(const bad of [
  {...a,sourceObservationAddress:'unresolved'},
  {...a,observedAt:'2026-10-18'},
  {...a,observedAt:'2026-02-30T10:00:00.000Z'},
  {...a,resourceSubjectRef:'unknown'},
  {...a,consumerActorRef:'someone'},
  {...a,measurements:[meter('inference-output','USD','5')]},
  {...a,measurements:[meter('inference-output','token','5'),meter('inference-output','{token}','5')]}
 ])assert.throws(()=>deriveResourceEventReadings([bad]));
 assert.throws(()=>deriveResourceEventReadings([
  a,{...a,measurements:[meter('inference-input','token','9')]}
 ]),/source address reused/u);
 assert.deepEqual(deriveResourceEventReadings([]),[]);
});


const comparisons={
 comparisonRef:ni(20),resolution:'second',
 baselineStartAt:'2026-10-18T20:03:00.000Z',
 successorStartAt:'2026-10-18T20:03:01.000Z'
};
const compare=(baseline,successor,other={})=>compareResourceFlowWindows({
 ...comparisons,baselineObservations:baseline,successorObservations:successor,...other
});

test('an original pair of complete second windows has exact signed energy and peak differences',()=>{
 const baseline=sample(0,comparisons.baselineStartAt,[
  meter('energy','J','2','3'),meter('memory-peak','By','100'),
  meter('network-egress','By','9')
 ]);
 const successor=sample(1,comparisons.successorStartAt,[
  meter('energy','joule','1','2'),meter('memory-peak','byte','250')
 ]);
 const result=compare([baseline],[successor],{matchedWorkEvidenceRef:ni(21)});
 const energy=result.readings.find(x=>x.resource==='energy');
 const memory=result.readings.find(x=>x.resource==='memory-peak');
 const missing=result.readings.find(x=>x.resource==='network-egress');
 assert.equal(result.kind,'source-window-resource-change-reading');
 assert.equal(result.comparedDimensionCount,2);
 assert.equal(result.unknownDimensionCount,1);
 assert.deepEqual(energy.baseline.amount,amount('2','3'));
 assert.deepEqual(energy.successor.amount,amount('1','2'));
 assert.deepEqual(energy.difference,amount('-1','6'));
 assert.deepEqual(energy.successorOverBaseline,amount('3','4'));
 assert.equal(energy.direction,'decrease');
 assert.equal(energy.unit,'J');
 assert.equal(energy.status,'observed-exact-difference');
 assert.equal(energy.baseline.observedSeconds,1);
 assert.deepEqual(memory.difference,amount('150'));
 assert.equal(memory.interpretation,'window-maximum-difference-not-additive-consumption');
 assert.equal(missing.status,'unobserved-dimension-on-one-side');
 assert.equal(missing.successor,null);
 assert.equal('difference' in missing,false,'missing meter must not become zero');
 assert.equal(result.matchedWorkEvidenceStatus,'caller-supplied-reference-not-independently-verified');
 assert.equal(result.requirementOrEngineeringAcceptanceClaimAllowed,false);
 assert.equal(result.meterCalibrationAndIndependentRecipientVerified,false);
 assert.deepEqual(compare([baseline],[successor]),{
  ...result,matchedWorkEvidenceRef:null,
  matchedWorkEvidenceStatus:'no-independent-matched-work-evidence-provided'
 });
});

test('a partial minute cannot claim a full-window resource improvement',()=>{
 const original=sample(0,'2026-10-18T20:03:00.000Z',[meter('energy','J','9')]);
 const after=sample(1,'2026-10-18T20:04:00.000Z',[meter('energy','J','1')]);
 const args={resolution:'minute',baselineStartAt:'2026-10-18T20:03:00.000Z',
  successorStartAt:'2026-10-18T20:04:00.000Z'};
 const partial=compare([original],[after],args);
 assert.equal(partial.readings.length,1);
 assert.equal(partial.readings[0].status,'unobserved-seconds-prevent-comparison');
 assert.equal(partial.readings[0].baseline.observedSeconds,1);
 assert.equal(partial.readings[0].windowSeconds,60);
 assert.equal('difference' in partial.readings[0],false);
 assert.equal(partial.comparedDimensionCount,0);
 assert.equal(partial.unknownDimensionCount,1);
});

test('full-minute resource flow comparison is stable under sample permutation and canonical aliases',()=>{
 const first='2026-10-18T20:03:00.000Z';
 const second='2026-10-18T20:04:00.000Z';
 const original=[],after=[];
 for(let i=0;i<60;i++){
  original.push(sample(0,new Date(Date.parse(first)+1000*i).toISOString(),
   [meter('energy','joule','3')],{
    sourceObservationAddress:'ni:///sha-256;'+String(i).padStart(3,'0')+'Z'.repeat(40)
   }));
  after.push(sample(1,new Date(Date.parse(second)+1000*i).toISOString(),
   [meter('energy','J','2')],{
    sourceObservationAddress:'ni:///sha-256;'+String(60+i).padStart(3,'0')+'Z'.repeat(40)
   }));
 }
 const args={resolution:'minute',baselineStartAt:first,successorStartAt:second};
 const result=compare(original,after,args);
 const reversed=compare([...original].reverse(),[...after].reverse(),args);
 assert.deepEqual(reversed,result);
 assert.equal(result.comparedDimensionCount,1);
 const [row]=result.readings;
 assert.deepEqual(row.baseline.amount,amount('180'));
 assert.deepEqual(row.successor.amount,amount('120'));
 assert.deepEqual(row.difference,amount('-60'));
 assert.deepEqual(row.successorOverBaseline,amount('2','3'));
 assert.equal(row.baseline.observedSeconds,60);
 assert.equal(row.successor.observedSeconds,60);
 assert.equal(row.baseline.sourceCount,60);
 assert.equal(row.successor.sourceCount,60);
});

test('zero source usage yields undefined relative change, never an invented percentage',()=>{
 const a=sample(0,comparisons.baselineStartAt,[meter('energy','J','0')]);
 const b=sample(1,comparisons.successorStartAt,[meter('energy','J','2')]);
 const [reading]=compare([a],[b]).readings;
 assert.deepEqual(reading.difference,amount('2'));
 assert.equal(reading.successorOverBaseline,null);
 assert.equal(reading.direction,'increase');
});

test('different actor or feed observations never become one comparable resource grade',()=>{
 const a=sample(0,comparisons.baselineStartAt,[meter('energy','J','3')]);
 const after=sample(1,comparisons.successorStartAt,[meter('energy','J','2')],{
  consumerActorRef:'urn:ame:other'
 });
 const flow=compare([a],[after]);
 assert.equal(flow.comparedDimensionCount,0);
 assert.equal(flow.unknownDimensionCount,2);
 assert.ok(flow.readings.every(x=>x.status==='unobserved-dimension-on-one-side'));
 assert.ok(flow.readings.every(x=>!('difference' in x)));
});

test('source identity, incompatible time scope and nonphysical money inputs refuse comparison',()=>{
 const a=sample(0,comparisons.baselineStartAt,[meter('energy','J','1')]);
 const b=sample(1,comparisons.successorStartAt,[meter('energy','J','1')]);
 assert.throws(()=>compare([a],[{...a,startAt:b.startAt,endAt:b.endAt}]),
  /reuse an original source observation identity/u);
 assert.throws(()=>compare([a],[b],{resolution:'invalid'}),/named UTC window/u);
 assert.throws(()=>compare([a],[b],{baselineStartAt:'2026-10-18T20:03:00Z'}),
  /exact UTC seconds/u);
 assert.throws(()=>compare([a],[b],{resolution:'minute',
  baselineStartAt:'2026-10-18T20:03:01.000Z'}),/must be aligned/u);
 assert.throws(()=>compare([a],[b],{successorStartAt:comparisons.baselineStartAt}),
  /disjoint/u);
 assert.throws(()=>compare([a],[b],{comparisonRef:'unsupported'}),/source-owned NI/u);
 assert.throws(()=>compare([a],[b],{matchedWorkEvidenceRef:'not-a-witness'}),/source-owned NI/u);
 assert.throws(()=>compare([a],[{...b,measurements:[meter('energy','USD','7')]}]),
  /contradictory dimensions/u);
 assert.deepEqual(compare([],[]).readings,[]);
 assert.equal(compare([],[]).comparedDimensionCount,0);
});


test('independently named same-second meters cannot manufacture source-complete savings',()=>{
 const baseline=[
  sample(0,comparisons.baselineStartAt,[meter('energy','J','2')]),
  sample(2,comparisons.baselineStartAt,[meter('energy','J','3')])
 ];
 const successor=[sample(1,comparisons.successorStartAt,[meter('energy','J','2')])];
 const result=compare(baseline,successor);
 const [row]=result.readings;
 assert.equal(row.baseline.sourceCount,2);
 assert.equal(row.baseline.observedSeconds,1);
 assert.equal(row.status,'multiple-sources-per-second-without-partition-law');
 assert.equal(result.comparedDimensionCount,0);
 assert.equal(result.unknownDimensionCount,1);
 assert.equal('difference' in row,false);
});


// Original Wednesday efficiency extension: exact meter/input-normalized results,
// not a source-authenticated beneficiary acceptance or fabricated Requirement.
const reportedOutcome=(evidence,units,unit=ni(35))=>({
 sourceEvidenceRef:ni(evidence),functionalUnitRef:unit,
 acceptedUnits:amount(units)
});
const intensity=(first,second,before,after,other={})=>
 compareResourceFlowIntensityWindows({
  ...comparisons,baselineObservations:first,successorObservations:second,
  baselineOutcome:before,successorOutcome:after,...other
 });

test('higher total joules can have lower exact joules per reported accepted result',()=>{
 const b=sample(0,comparisons.baselineStartAt,[meter('energy','J','100')]);
 const a=sample(1,comparisons.successorStartAt,[meter('energy','joule','120')]);
 const r=intensity([b],[a],reportedOutcome(30,'1'),reportedOutcome(31,'2'));
 assert.equal(r.kind,'source-window-reported-functional-intensity-reading');
 assert.equal(r.qualifiedIntensityCount,1);
 assert.equal(r.unqualifiedIntensityCount,0);
 assert.equal(r.independentFunctionalEquivalenceAndAcceptanceVerified,false);
 assert.equal(r.requirementOrEngineeringAcceptanceClaimAllowed,false);
 const [x]=r.readings;
 assert.equal(x.resource,'energy');
 assert.equal(x.unit,'J');
 assert.equal(x.direction,'increase','total source-metered energy increased');
 assert.deepEqual(x.difference,amount('20'));
 assert.deepEqual(x.baselinePerReportedAcceptedUnit,amount('100'));
 assert.deepEqual(x.successorPerReportedAcceptedUnit,amount('60'));
 assert.deepEqual(x.differencePerReportedAcceptedUnit,amount('-40'));
 assert.deepEqual(x.successorOverBaselineIntensity,amount('3','5'));
 assert.equal(x.intensityDirection,'decrease');
 assert.match(x.intensityStatus,/not-receiver-verified/u);
 assert.deepEqual(r.resourceComparison.readings[0].difference,amount('20'));
});

test('lower total input can still worsen resource intensity per result',()=>{
 const b=sample(0,comparisons.baselineStartAt,[meter('energy','J','100')]);
 const a=sample(1,comparisons.successorStartAt,[meter('energy','J','80')]);
 const [x]=intensity([b],[a],reportedOutcome(30,'2'),reportedOutcome(31,'1')).readings;
 assert.equal(x.direction,'decrease');
 assert.equal(x.intensityDirection,'increase');
 assert.deepEqual(x.baselinePerReportedAcceptedUnit,amount('50'));
 assert.deepEqual(x.successorPerReportedAcceptedUnit,amount('80'));
 assert.deepEqual(x.differencePerReportedAcceptedUnit,amount('30'));
 assert.deepEqual(x.successorOverBaselineIntensity,amount('8','5'));
});

test('zero reported accepted work, nonadditive gauge, and absent dimension refuse ratio',()=>{
 const before=sample(0,comparisons.baselineStartAt,[
  meter('energy','J','25'),meter('memory-peak','By','100'),meter('disk-read','By','50')]);
 const after=sample(1,comparisons.successorStartAt,[
  meter('energy','J','20'),meter('memory-peak','By','90')]);
 const zero=intensity([before],[after],reportedOutcome(30,'0'),reportedOutcome(31,'1'));
 assert.equal(zero.qualifiedIntensityCount,0);
 assert.ok(zero.readings.every(x=>!Object.hasOwn(x,'successorOverBaselineIntensity')));
 assert.equal(zero.readings.find(x=>x.resource==='energy').intensityStatus,'zero-reported-accepted-output');
 const result=intensity([before],[after],reportedOutcome(30,'1'),reportedOutcome(31,'1'));
 assert.equal(result.qualifiedIntensityCount,1);
 assert.equal(result.unqualifiedIntensityCount,2);
 assert.equal(result.readings.find(x=>x.resource==='memory-peak').intensityStatus,
  'nonadditive-gauge-not-consumable-input');
 assert.equal(result.readings.find(x=>x.resource==='disk-read').intensityStatus,
  'unqualified-source-window-or-dimension');
 assert.equal(Object.hasOwn(result.readings.find(x=>x.resource==='memory-peak'),
  'baselinePerReportedAcceptedUnit'),false);
});

test('unobserved seconds never become measured normalized savings',()=>{
 const b=sample(0,'2026-10-18T20:03:00.000Z',[meter('energy','J','100')]);
 const a=sample(1,'2026-10-18T20:04:00.000Z',[meter('energy','J','70')]);
 const comparison=intensity([b],[a],reportedOutcome(30,'2'),reportedOutcome(31,'2'),{
  resolution:'minute',baselineStartAt:'2026-10-18T20:03:00.000Z',
  successorStartAt:'2026-10-18T20:04:00.000Z'
 });
 assert.equal(comparison.qualifiedIntensityCount,0);
 assert.equal(comparison.readings[0].intensityStatus,'unqualified-source-window-or-dimension');
 assert.equal(Object.hasOwn(comparison.readings[0],'baselinePerReportedAcceptedUnit'),false);
});

test('different functional unit, reused source, malformed quantity and absent report refuse',()=>{
 const b=sample(0,comparisons.baselineStartAt,[meter('energy','J','100')]);
 const a=sample(1,comparisons.successorStartAt,[meter('energy','J','50')]);
 const p=reportedOutcome(30,'1'),q=reportedOutcome(31,'1');
 for(const [badBefore,badAfter] of [
  [p,{...q,functionalUnitRef:ni(36)}],
  [p,{...q,sourceEvidenceRef:p.sourceEvidenceRef}],
  [{...p,acceptedUnits:amount('-1')},q],
  [{...p,acceptedUnits:amount('01')},q],
  [{...p,acceptedUnits:amount('1','0')},q],
  [{...p,acceptedUnits:amount('1'),inferred:true},q],
  [undefined,q]
 ])assert.throws(()=>intensity([b],[a],badBefore,badAfter));
});

test('zero baseline consumption has exact absolute intensity change but no invented relative percent',()=>{
 const b=sample(0,comparisons.baselineStartAt,[meter('energy','J','0')]);
 const a=sample(1,comparisons.successorStartAt,[meter('energy','J','10')]);
 const [reading]=intensity([b],[a],reportedOutcome(30,'1'),reportedOutcome(31,'2')).readings;
 assert.deepEqual(reading.baselinePerReportedAcceptedUnit,amount('0'));
 assert.deepEqual(reading.successorPerReportedAcceptedUnit,amount('5'));
 assert.deepEqual(reading.differencePerReportedAcceptedUnit,amount('5'));
 assert.equal(reading.successorOverBaselineIntensity,null);
});
