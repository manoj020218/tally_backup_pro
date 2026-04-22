const test = require("node:test");
const assert = require("node:assert/strict");
const {
  generateLicenseKey,
  isLicenseKeyFormatValid,
  normalizeLicenseKey
} = require("../src/licenseKey");

test("generateLicenseKey returns valid format", () => {
  const key = generateLicenseKey();
  assert.equal(isLicenseKeyFormatValid(key), true);
});

test("normalizeLicenseKey normalizes casing and whitespace", () => {
  const input = "  tbp-abcd-1234-efgh-5678 ";
  assert.equal(normalizeLicenseKey(input), "TBP-ABCD-1234-EFGH-5678");
});

test("isLicenseKeyFormatValid rejects invalid key", () => {
  assert.equal(isLicenseKeyFormatValid("INVALID-KEY"), false);
});

