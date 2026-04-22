const { pool } = require("./db");
const { AppError } = require("./errors");
const repository = require("./licenseRepository");
const { normalizeLicenseKey } = require("./licenseKey");
const { signLicenseToken, verifyLicenseToken } = require("./token");

function isExpired(expiresAt) {
  return new Date(expiresAt).getTime() <= Date.now();
}

function buildLicenseResponse(license, fingerprint, appVersion, activatedNow) {
  const token = signLicenseToken({
    licenseKey: license.licenseKey,
    fingerprint,
    tier: license.tier,
    email: license.email,
    seatLimit: license.seatLimit,
    appVersion
  });

  return {
    valid: true,
    token,
    activatedNow,
    license: {
      licenseKey: license.licenseKey,
      tier: license.tier,
      email: license.email,
      seatLimit: license.seatLimit,
      seatsUsed: license.seatsUsed,
      expiresAt: license.expiresAt
    }
  };
}

async function validateLicense(request) {
  const key = normalizeLicenseKey(request.licenseKey);
  const fingerprint = request.fingerprint.trim();
  const appVersion = request.appVersion || null;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const license = await repository.getByLicenseKey(client, key, true);

    if (!license) {
      throw new AppError(404, "License key not found.");
    }
    if (license.isRevoked) {
      throw new AppError(403, "License key is revoked.");
    }
    if (isExpired(license.expiresAt)) {
      throw new AppError(403, "License key is expired.");
    }

    const currentFingerprints = license.activatedFingerprints || [];
    const alreadyActivated = currentFingerprints.includes(fingerprint);

    if (!alreadyActivated && currentFingerprints.length >= license.seatLimit) {
      throw new AppError(409, "Seat limit exceeded.", {
        seatLimit: license.seatLimit,
        seatsUsed: currentFingerprints.length
      });
    }

    let updatedLicense = license;
    let activatedNow = false;
    if (!alreadyActivated) {
      activatedNow = true;
      updatedLicense = await repository.updateActivations(client, key, [
        ...currentFingerprints,
        fingerprint
      ]);
    }

    await client.query("COMMIT");
    return buildLicenseResponse(updatedLicense, fingerprint, appVersion, activatedNow);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function revalidateLicense(request) {
  let decoded;
  try {
    decoded = verifyLicenseToken(request.token);
  } catch (error) {
    throw new AppError(401, "Invalid or expired token.");
  }

  const key = normalizeLicenseKey(decoded.licenseKey);
  const fingerprint = (request.fingerprint || decoded.fingerprint || "").trim();
  if (!fingerprint) {
    throw new AppError(400, "Fingerprint is required for revalidation.");
  }

  const client = await pool.connect();
  try {
    const license = await repository.getByLicenseKey(client, key, false);
    if (!license) throw new AppError(404, "License key not found.");
    if (license.isRevoked) throw new AppError(403, "License key is revoked.");
    if (isExpired(license.expiresAt)) throw new AppError(403, "License key is expired.");

    if (!license.activatedFingerprints.includes(fingerprint)) {
      throw new AppError(403, "Fingerprint is not activated for this license.");
    }

    return buildLicenseResponse(license, fingerprint, request.appVersion, false);
  } finally {
    client.release();
  }
}

module.exports = {
  validateLicense,
  revalidateLicense
};

