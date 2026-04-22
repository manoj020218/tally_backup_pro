const { pool } = require("./db");
const { AppError } = require("./errors");
const repository = require("./licenseRepository");
const {
  generateLicenseKey,
  isLicenseKeyFormatValid,
  normalizeLicenseKey
} = require("./licenseKey");

const DEFAULT_SEATS = {
  starter: 1,
  professional: 3,
  business: 10,
  reseller: 9999
};

async function createLicense(payload) {
  const licenseKey = payload.licenseKey
    ? normalizeLicenseKey(payload.licenseKey)
    : generateLicenseKey("TBP");

  if (!isLicenseKeyFormatValid(licenseKey)) {
    throw new AppError(400, "Invalid license key format.");
  }

  const durationDays = payload.durationDays || 365;
  const seatLimit = payload.seatLimit || DEFAULT_SEATS[payload.tier];
  const expiresAt = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const client = await pool.connect();
  try {
    const created = await repository.createLicense(client, {
      licenseKey,
      email: payload.email,
      tier: payload.tier,
      seatLimit,
      expiresAt,
      metadata: payload.metadata || {}
    });

    return {
      created: true,
      license: {
        licenseKey: created.licenseKey,
        email: created.email,
        tier: created.tier,
        seatLimit: created.seatLimit,
        seatsUsed: created.seatsUsed,
        expiresAt: created.expiresAt
      }
    };
  } catch (error) {
    if (error && error.code === "23505") {
      throw new AppError(409, "License key already exists.");
    }
    throw error;
  } finally {
    client.release();
  }
}

async function revokeLicense(payload) {
  const key = normalizeLicenseKey(payload.licenseKey);
  const client = await pool.connect();
  try {
    const updated = await repository.revokeLicense(client, key, payload.reason);
    if (!updated) throw new AppError(404, "License key not found.");
    return {
      revoked: true,
      license: {
        licenseKey: updated.licenseKey,
        revokedAt: updated.revokedAt,
        revokedReason: updated.revokedReason
      }
    };
  } finally {
    client.release();
  }
}

async function getLicenseByKey(licenseKey) {
  const key = normalizeLicenseKey(licenseKey);
  const client = await pool.connect();
  try {
    const license = await repository.getByLicenseKey(client, key, false);
    if (!license) throw new AppError(404, "License key not found.");
    return { license };
  } finally {
    client.release();
  }
}

async function listLicenses(limit = 50) {
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const client = await pool.connect();
  try {
    const licenses = await repository.listLicenses(client, safeLimit);
    return { count: licenses.length, licenses };
  } finally {
    client.release();
  }
}

module.exports = {
  createLicense,
  revokeLicense,
  getLicenseByKey,
  listLicenses
};

