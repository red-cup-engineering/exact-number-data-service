import test from "node:test";
import assert from "node:assert/strict";
import { decimalOfRational, rationalOfDecimal, rationalUnits } from "../src/decimal-string.mjs";

const at = (text, places, rounding) => decimalOfRational(rationalOfDecimal(text), places, rounding === undefined ? undefined : { rounding });

test("half-even sends an exact tie to the even unit, positive and negative", () => {
  assert.equal(at("0.125", 2, "half-even"), "0.12");
  assert.equal(at("0.135", 2, "half-even"), "0.14");
  assert.equal(at("2.675", 2, "half-even"), "2.68");
  assert.equal(at("2.665", 2, "half-even"), "2.66");
  assert.equal(at("0.5", 0, "half-even"), "0");
  assert.equal(at("1.5", 0, "half-even"), "2");
  assert.equal(at("2.5", 0, "half-even"), "2");
  assert.equal(at("-0.125", 2, "half-even"), "-0.12");
  assert.equal(at("-2.5", 0, "half-even"), "-2");
  assert.equal(at("-3.5", 0, "half-even"), "-4");
});

test("half-even agrees with half-away-from-zero off the tie, and rounds a one-eighth by thirds correctly", () => {
  assert.equal(at("0.126", 2, "half-even"), "0.13");
  assert.equal(at("0.124", 2, "half-even"), "0.12");
  assert.equal(rationalUnits(rationalOfDecimal("12.5"), 0, { rounding: "half-even" }), 12n);
  assert.equal(rationalUnits(rationalOfDecimal("12.5"), 0), 13n);
  assert.equal(at("1.25", 1), "1.3");
  assert.equal(at("1.25", 1, "half-even"), "1.2");
});

test("half-even pads exact values and still refuses an unknown rounding", () => {
  assert.equal(at("2", 3, "half-even"), "2.000");
  assert.throws(() => at("1", 0, "half-odd"), RangeError);
});
