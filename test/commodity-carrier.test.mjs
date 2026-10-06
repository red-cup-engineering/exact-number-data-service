import assert from 'node:assert/strict';
import {gradedOfDecimal,gradedAdd,admitGraded,gradedToExactString} from '@red-cup-engineering/exact-number-data-service/graded';
const hive=gradedOfDecimal('9007199254740993.000001','HIVE');
const addition=gradedOfDecimal('0.000001','HIVE');
const total=gradedAdd(hive,addition);
assert.equal(gradedToExactString(total),'4503599627370496500001/500000 HIVE');
assert.deepEqual(admitGraded(JSON.parse(JSON.stringify(total))),total);
assert.throws(()=>gradedAdd(hive,gradedOfDecimal('1.000','HBD')),/grade mismatch/);
