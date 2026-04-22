const crypto = require("crypto");

const LICENSE_KEY_REGEX = /^TBP-[A-Z0-9]{4}(?:-[A-Z0-9]{4}){3}$/;

function normalizeLicenseKey(value) {
  return String(value || "").trim().toUpperCase();
}

function isLicenseKeyFormatValid(value) {
  return LICENSE_KEY_REGEX.test(normalizeLicenseKey(value));
}

function randomChunk(length = 4) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

function generateLicenseKey(prefix = "TBP") {
  const p = String(prefix || "TBP").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const normalizedPrefix = p || "TBP";
  return `${normalizedPrefix}-${randomChunk()}-${randomChunk()}-${randomChunk()}-${randomChunk()}`;
}

module.exports = {
  LICENSE_KEY_REGEX,
  normalizeLicenseKey,
  isLicenseKeyFormatValid,
  generateLicenseKey
};

