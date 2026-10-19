import test from 'node:test';
import assert from 'node:assert/strict';
import {gradedAdd,gradedToExactString} from '../src/graded.mjs';
import {admitResourceQuantity,admitResourceQuantities,admitResourceMeasurement,admitResourceMeasurements}
 from '../src/resource-measurement.mjs';

const actors={
 supplierActorRef:'urn:ame:red-cup-inference',
 consumerActorRef:'urn:ame:causeway-public-fiction'
};
const amount=(numerator,denominator='1')=>({numerator,denominator});
const row=(resource,unit,numerator,denominator='1')=>({
 resource,unit,amount:amount(numerator,denominator)
});
const NI='ni:///sha-256;'+'A'.repeat(43);

test('genuine source metering reduces and grades CPU milliseconds in seconds without float loss',()=>{
 const a=admitResourceMeasurement(row('cpu-runtime','millisecond','960'),actors);
 assert.deepEqual(a.amount,amount('24','25'));
 assert.equal(a.unit,'s');
 assert.equal(a.sourceUnit,'millisecond');
 assert.equal(a.interpretation,'recognized-physical-dimension');
 const b=admitResourceMeasurement(row('cpu-runtime','s','3','2'),actors);
 assert.equal(gradedToExactString(gradedAdd(a.gradedAmount,b.gradedAmount)),
  '123/50 '+a.gradedAmount.grade);
 assert.equal(a.evidenceStatus,'observed-quantity-not-financial-settlement');
});

test('genuinely different quantities retain distinct physical grades even with equal numerals',()=>{
 const readings=admitResourceMeasurements([
  row('cpu-runtime','millisecond','1000'),
  row('ram-residency','byte-second','12582912000'),
  row('network-egress','byte','4096'),
  row('inference-output','token','137'),
  row('energy','joule','18')
 ],actors);
 assert.equal(readings.length,5);
 assert.deepEqual(readings.map(x=>x.unit),['s','By.s','By','{token}','J']);
 assert.deepEqual(readings[1].amount,amount('12582912000'));
 assert.throws(()=>gradedAdd(readings[0].gradedAmount,readings[1].gradedAmount),
  /grade mismatch/u);
 assert.equal(readings[0].gradedAmount.grade.includes(actors.consumerActorRef),true);
});

test('source alias of an already counted physical resource cannot double-count',()=>{
 assert.throws(()=>admitResourceMeasurements([
  row('cpu-runtime','millisecond','1000'),row('cpu-runtime','s','1')
 ],actors),/duplicate canonical resource and unit/u);
});

test('supplier and customer grade scopes isolate otherwise identical quantities',()=>{
 const one=admitResourceMeasurement(row('network-egress','By','12'),actors);
 const other=admitResourceMeasurement(row('network-egress','By','12'),
  {...actors,consumerActorRef:'urn:ame:other-private-customer'});
 assert.throws(()=>gradedAdd(one.gradedAmount,other.gradedAmount),/grade mismatch/u);
});

test('source-identified new commodities retain their authored grades without inventing conversions',()=>{
 const opaque=admitResourceMeasurement(row(NI,'{wild-rice-pound}','7','2'),actors);
 assert.equal(opaque.interpretation,'source-defined-opaque-unit');
 assert.deepEqual(opaque.amount,amount('7','2'));
 assert.throws(()=>admitResourceMeasurement(row('unapproved-token','usd','1'),actors),
  /source-owned NI/u);
 assert.throws(()=>admitResourceMeasurement(row(NI,'USD','1'),actors),
  /noncurrency unit/u);
});

test('cannot dress provider credits or money as physical CPU, network or inference usage',()=>{
 for(const misuse of [
  row('cpu-runtime','USD','25'),
  row('inference-output','credit','1'),
  row('network-egress','token','25'),
  row('energy','millisecond','100')
 ])assert.throws(()=>admitResourceMeasurement(misuse,actors),
  /contradictory dimensions/u);
});

test('bounded rational arithmetic accepts beyond IEEE exact integer range without rounding',()=>{
 const huge=admitResourceMeasurement(row('cpu-runtime','s','9007199254740993','3'),actors);
 assert.deepEqual(huge.amount,amount('3002399751580331'));
 const fractional=admitResourceMeasurement(row('network-egress','By','15','4'),actors);
 assert.deepEqual(fractional.amount,amount('15','4'));
 assert.throws(()=>admitResourceMeasurement(row('cpu-runtime','s','0','0'),actors),
  /positive denominator/u);
 assert.throws(()=>admitResourceMeasurement(row('cpu-runtime','s','-1'),actors),
  /unsigned canonical decimal/u);
 assert.throws(()=>admitResourceMeasurement({
  resource:'cpu-runtime',unit:'s',amount:0.1},actors),
  /exact numerator and denominator/u);
});

test('native disk and network bits normalize exactly into bytes',()=>{
 const readings=admitResourceMeasurements([
  row('disk-read','bit','15'),
  row('disk-write','byte','4096'),
  row('network-egress','bit','1')
 ],actors);
 assert.deepEqual(readings.map(x=>x.unit),['By','By','By']);
 assert.deepEqual(readings.map(x=>x.amount),[
  amount('15','8'),amount('4096'),amount('1','8')
 ]);
 assert.throws(()=>admitResourceMeasurements([
  row('disk-write','byte','1'),row('disk-write','bit','8')
 ],actors),/duplicate canonical resource and unit/u);
});

test('CPU user and system time are distinct graded physical resources',()=>{
 const readings=admitResourceMeasurements([
  row('cpu-user-runtime','ms','1500'),
  row('cpu-system-runtime','s','1','4')
 ],actors);
 assert.deepEqual(readings.map(x=>x.amount),[amount('3','2'),amount('1','4')]);
 assert.throws(()=>gradedAdd(readings[0].gradedAmount,readings[1].gradedAmount),
  /grade mismatch/u);
 assert.throws(()=>admitResourceMeasurement(row('disk-read','USD','1'),actors),
  /contradictory dimensions/u);
});



test('normalize exact source quantities independently before binding a genuine economic actor',()=>{
 const bare=admitResourceQuantity(row('disk-write','bit','9'));
 assert.equal(bare.unit,'By');
 assert.deepEqual(bare.amount,amount('9','8'));
 assert.equal(bare.evidenceStatus,'observed-quantity-unattributed-not-financial-settlement');
 assert.equal(bare.gradedAmount.grade.includes('urn:ame:'),false);
 const scoped=admitResourceMeasurement(row('disk-write','bit','9'),actors);
 assert.deepEqual(scoped.amount,bare.amount);
 assert.equal(scoped.gradedAmount.grade.includes(actors.consumerActorRef),true);
 assert.throws(()=>gradedAdd(bare.gradedAmount,scoped.gradedAmount),/grade mismatch/u);
 assert.throws(()=>admitResourceMeasurement(row('disk-write','byte','1')),
  /supplying actor/u);
});

test('source quantity collections reject category aliases even with no identifiable consumer',()=>{
 assert.deepEqual(admitResourceQuantities([
  row('inference-cache-creation-input','token','7'),
  row('inference-cache-read-input','{token}','8')
 ]).map(x=>x.amount),[amount('7'),amount('8')]);
 assert.throws(()=>admitResourceQuantities([
  row('inference-cache-read-input','token','9'),
  row('inference-cache-read-input','{token}','9')
 ]),/duplicate canonical resource/u);
 assert.throws(()=>admitResourceQuantity(row('inference-total','USD','99')),
  /contradictory dimensions/u);
});
