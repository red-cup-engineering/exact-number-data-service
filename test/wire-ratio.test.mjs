import assert from "node:assert/strict";
import test from "node:test";
import { rationalOfBigInts } from "@red-cup-engineering/metrologic/number/exact-number";
import {
  hostRatioOfRational, rationalOfHostRatio,
} from "@red-cup-engineering/exact-number-data-service/wire-ratio";
import {
  ratioTextOfRational, rationalOfRatioText,
} from "@red-cup-engineering/exact-number-data-service/ratio-text";

test("a wire ratio round trips arbitrary exact integers without host rounding", () => {
  const rational = rationalOfBigInts(18014398509481985n, -6n);
  const wire = hostRatioOfRational(rational);
  assert.deepEqual(wire, { numerator: "-18014398509481985", denominator: "6" });
  assert.deepEqual(rationalOfHostRatio(JSON.parse(JSON.stringify(wire))), rational);
  assert.ok(Object.isFrozen(wire));
});

test("wire admission requires exactly two reduced integer-string fields", () => {
  for (const invalid of [
    { numerator: "2", denominator: "4" },
    { numerator: "1", denominator: "-2" },
    { numerator: "1", denominator: "0" },
    { numerator: "-0", denominator: "1" },
    { numerator: "1" },
    { numerator: 1, denominator: "2" },
    { numerator: "1", denominator: "2", extra: true },
    { get numerator() { assert.fail("wire admission invoked an accessor"); }, denominator: "2" },
  ]) {
    assert.throws(() => rationalOfHostRatio(invalid), TypeError);
  }
});

test("ratio text is an exact alternative to the wire record", () => {
  const rational = rationalOfBigInts(-7n, 3n);
  assert.equal(ratioTextOfRational(rational), "-7/3");
  assert.deepEqual(rationalOfRatioText("-7/3"), rational);
  const whole = rationalOfBigInts(7n, 1n);
  assert.equal(ratioTextOfRational(whole, { integerShorthand: true }), "7");
  assert.deepEqual(rationalOfRatioText("7", { integerShorthand: true }), whole);
  assert.throws(() => rationalOfRatioText("7"), TypeError);
  for (const text of ["-7/-3", "7/0", "14/6", "7/3/1", "7.0/3"])
    assert.throws(() => rationalOfRatioText(text), TypeError);
});
