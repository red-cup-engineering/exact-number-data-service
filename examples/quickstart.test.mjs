import assert from "node:assert/strict";
import test from "node:test";
import { decimalOfRational, rationalOfDecimal } from "@red-cup-engineering/exact-number-data-service/decimal-string";

test("EXACT-ROUNDING-QUICKSTART", () => {
  const value = rationalOfDecimal("1.25");
  assert.equal(decimalOfRational(value, 1, { rounding: "half-even" }), "1.2");
  assert.equal(decimalOfRational(value, 1), "1.3");
});
