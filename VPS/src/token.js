const jwt = require("jsonwebtoken");
const config = require("./config");

function signLicenseToken(payload) {
  const tokenPayload = {
    licenseKey: payload.licenseKey,
    fingerprint: payload.fingerprint,
    tier: payload.tier,
    email: payload.email,
    seatLimit: payload.seatLimit,
    appVersion: payload.appVersion || null
  };

  return jwt.sign(tokenPayload, config.jwtSecret, {
    expiresIn: `${config.tokenTtlHours}h`,
    issuer: config.jwtIssuer,
    audience: config.jwtAudience
  });
}

function verifyLicenseToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: config.jwtIssuer,
    audience: config.jwtAudience
  });
}

module.exports = {
  signLicenseToken,
  verifyLicenseToken
};

