import assert from "node:assert/strict";
import test from "node:test";
import {
  addDecimalStrings, compareDecimalStrings, exactDecimalOfRational, expandDecimalNotation,
  rationalOfDecimal, readDecimal,
} from "../src/decimal-string.mjs";
import { rationalOfBigInts } from "@red-cup-engineering/metrologic/number/exact-number";

test("finite decimal readout preserves small increments and reduces the spelling", () => {
  for (const [input, expected] of [
    ["10.000000", "10"], ["7.980", "7.98"], ["-0.0", "0"], [".5", "0.5"], ["+3", "3"],
    ["-0.000000000000000001", "-0.000000000000000001"],
    ["123456789012345678901234567890.5", "123456789012345678901234567890.5"],
  ]) assert.equal(exactDecimalOfRational(rationalOfDecimal(input)), expected);
  assert.equal(exactDecimalOfRational(rationalOfBigInts(1n, 8n)), "0.125");
  assert.equal(exactDecimalOfRational(rationalOfBigInts(-7n, 5n)), "-1.4");
  assert.throws(() => exactDecimalOfRational(rationalOfBigInts(1n, 3n)), RangeError);
  assert.equal(addDecimalStrings(["1.5", "-1.499999999999999999"]), "0.000000000000000001");
  assert.equal(addDecimalStrings(["1000000000000000000000000000000", "1"]), "1000000000000000000000000000001");
  assert.equal(compareDecimalStrings("10.000000000000000001", "10"), 1);
});

test("decimal admission retains the declared scale independently of value", () => {
  assert.deepEqual(readDecimal("1.2500"), {
    value: rationalOfBigInts(5n, 4n), places: 4,
  });
  assert.deepEqual(readDecimal("-0.00"), {
    value: rationalOfBigInts(0n, 1n), places: 2,
  });
});
test("notation expands into exact arithmetic without rounding coefficient digits", () => {
  assert.equal(expandDecimalNotation("9007199254740993.000001e0"), "9007199254740993.000001");
  const tiny = expandDecimalNotation("1e-25");
  assert.equal(addDecimalStrings([tiny, tiny]), "0.0000000000000000000000002");
  assert.equal(expandDecimalNotation("1e21"), "1000000000000000000000");
  assert.equal(expandDecimalNotation("-.25e2"), "-25");
  assert.equal(expandDecimalNotation("2.000"), "2.000");
  assert.throws(() => expandDecimalNotation("Infinity"), TypeError);
  assert.throws(() => expandDecimalNotation("1e1000001"), RangeError);
});
