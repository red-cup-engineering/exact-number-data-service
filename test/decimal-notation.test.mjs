import assert from "node:assert/strict";
import test from "node:test";
import { expandDecimalNotation, addDecimalStrings } from "../src/decimal-string.mjs";
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
