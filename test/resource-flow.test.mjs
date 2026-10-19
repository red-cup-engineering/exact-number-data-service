import test from 'node:test';
import assert from 'node:assert/strict';
import {deriveResourceFlowReadings,RESOURCE_FLOW_WINDOWS} from '../src/resource-flow.mjs';

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
