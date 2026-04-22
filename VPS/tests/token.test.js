const test = require("node:test");
const assert = require("node:assert/strict");
const { signLicenseToken, verifyLicenseToken } = require("../src/token");

test("token sign and verify round-trip", () => {
  const token = signLicenseToken({
    licenseKey: "TBP-ABCD-EFGH-IJKL-MNPQ",
    fingerprint: "DEVICE-123456",
    tier: "starter",
    email: "client@example.com",
    seatLimit: 1,
    appVersion: "1.0.0"
  });

  const decoded = verifyLicenseToken(token);
  assert.equal(decoded.licenseKey, "TBP-ABCD-EFGH-IJKL-MNPQ");
  assert.equal(decoded.fingerprint, "DEVICE-123456");
  assert.equal(decoded.tier, "starter");
});

