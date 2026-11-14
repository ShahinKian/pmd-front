import assert from "node:assert/strict";
import test from "node:test";
import { amountExceeds, displayNumber, parseDeduction } from "../lib/certificate/format.ts";

test("accepts Persian and Arabic money input while preserving decimal precision", () => {
  assert.equal(parseDeduction(" ۱۲٬۳۴۵٫۶۷ "), "12345.67");
  assert.equal(parseDeduction("٠٠٤٥.٥"), "45.5");
  assert.equal(parseDeduction("۹٬۹۹۹٬۹۹۹٬۹۹۹٬۹۹۹٬۹۹۹٫۹۹"), "9999999999999999.99");
  assert.equal(displayNumber("9999999999999999.99"), "۹٬۹۹۹٬۹۹۹٬۹۹۹٬۹۹۹٬۹۹۹٫۹۹");
});

test("rejects malformed, negative, or over-precise deductions", () => {
  for (const input of ["", "-1", "1e3", "۱۲٬۳۴", "1.005", "10000000000000000"]) {
    assert.equal(parseDeduction(input), null);
  }
});

test("compares exact decimal values at the deduction limit", () => {
  assert.equal(amountExceeds("9999999999999999.99", "9999999999999999.98"), true);
  assert.equal(amountExceeds("100", "100.00"), false);
  assert.equal(amountExceeds("99.99", "100"), false);
});
