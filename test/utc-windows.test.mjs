import test from 'node:test';
import assert from 'node:assert/strict';
import {utcWindowsAt} from '../src/utc-windows.mjs';

test('one timestamp yields exact half-open UTC seconds, minutes, hours and days',()=>{
 const w=utcWindowsAt('2026-10-19T23:59:59.900Z');
 assert.deepEqual(w.map(x=>x.resolution),['second','minute','hour','day']);
 assert.equal(w[0].startAt,'2026-10-19T23:59:59.000Z');
 assert.equal(w[0].endAt,'2026-10-20T00:00:00.000Z');
 assert.equal(w[3].startAt,'2026-10-19T00:00:00.000Z');
});
test('journal day-only and minute-only evidence cannot fabricate finer reporting',()=>{
 assert.deepEqual(utcWindowsAt('2026-10-19T00:00:00.000Z',{finest:'day'}).map(x=>x.resolution),['day']);
 assert.deepEqual(utcWindowsAt('2026-10-19T12:03:00.000Z',{finest:'minute'}).map(x=>x.resolution),['minute','hour','day']);
 assert.deepEqual(utcWindowsAt('2026-10-19T12:03:00.000Z',{finest:'hour'}).map(x=>x.resolution),['hour','day']);
});
test('invalid clock and unsupported precision cannot enter a flow',()=>{
 for(const t of ['2026-02-30T00:00:00.000Z','2026-10-19T25:00:00.000Z','2026-10-19T00:00:00Z','2026-10-19T00:00:00.000-05:00'])
  assert.throws(()=>utcWindowsAt(t),TypeError);
 assert.throws(()=>utcWindowsAt('2026-10-19T00:00:00.000Z',{finest:'millisecond'}),/precision/);
});
