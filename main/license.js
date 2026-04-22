const { machineId } = require("node-machine-id");
const { app } = require("electron");
const { getSetting, setSetting } = require("./db/queries");

const LICENSE_API_BASE_URL =
  process.env.LICENSE_API_BASE_URL || "http://127.0.0.1:8080/api/v1";
const LICENSE_API_TIMEOUT_MS = Number.parseInt(
  process.env.LICENSE_API_TIMEOUT_MS || "10000",
  10
);
const OFFLINE_GRACE_DAYS = Number.parseInt(
  process.env.LICENSE_OFFLINE_GRACE_DAYS || "7",
  10
);

function safeGetSetting(key) {
  try {
    return getSetting(key);
  } catch (error) {
    console.warn(`Failed to read setting '${key}':`, error.message);
    return null;
  }
}

function safeSetSetting(key, value) {
  try {
    return setSetting(key, value);
  } catch (error) {
    console.warn(`Failed to write setting '${key}':`, error.message);
    return null;
  }
}

function getAppVersion() {
  try {
    return app.getVersion();
  } catch (_error) {
    return process.env.npm_package_version || "0.0.0";
  }
}

function getMachineFingerprint() {
  return machineId();
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || "").replace(/\/+$/, "");
}

async function postJson(url, payload, timeoutMs = LICENSE_API_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const errorMessage =
        typeof body === "object" && body && body.error
          ? body.error
          : `License API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    return body;
  } finally {
    clearTimeout(timeout);
  }
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload);
  } catch (_error) {
    return null;
  }
}

function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload || !payload.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

function isWithinOfflineGrace() {
  const lastVerifiedAt = safeGetSetting("license_last_verified_at");
  if (!lastVerifiedAt) return false;

  const verifiedMs = new Date(lastVerifiedAt).getTime();
  if (Number.isNaN(verifiedMs)) return false;

  const graceMs = OFFLINE_GRACE_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - verifiedMs <= graceMs;
}

function persistLicenseState(licenseKey, token, payload) {
  safeSetSetting("license_key", licenseKey);
  safeSetSetting("license_jwt", token);
  safeSetSetting("license_tier", payload?.license?.tier || "");
  safeSetSetting(
    "license_expires_at",
    payload?.license?.expiresAt ? String(payload.license.expiresAt) : ""
  );
  safeSetSetting("license_last_verified_at", new Date().toISOString());
}

function getLicenseStatus() {
  const licenseKey = safeGetSetting("license_key");
  const token = safeGetSetting("license_jwt");
  const expiresAt = safeGetSetting("license_expires_at");
  const tier = safeGetSetting("license_tier");
  const lastVerifiedAt = safeGetSetting("license_last_verified_at");

  return {
    configured: Boolean(licenseKey),
    licenseKey: licenseKey || null,
    tier: tier || null,
    expiresAt: expiresAt || null,
    lastVerifiedAt: lastVerifiedAt || null,
    hasToken: Boolean(token),
    tokenExpired: token ? isTokenExpired(token) : true
  };
}

async function validateLicense(licenseKey) {
  const normalizedKey = String(licenseKey || "").trim().toUpperCase();
  if (!normalizedKey) {
    throw new Error("License key is required.");
  }

  const fingerprint = await getMachineFingerprint();
  const appVersion = getAppVersion();

  try {
    const payload = await postJson(
      `${normalizeBaseUrl(LICENSE_API_BASE_URL)}/licenses/validate`,
      {
        licenseKey: normalizedKey,
        fingerprint,
        appVersion
      }
    );

    if (!payload || !payload.valid || !payload.token) {
      throw new Error("License validation failed: invalid server response.");
    }

    persistLicenseState(normalizedKey, payload.token, payload);

    return {
      valid: true,
      activatedNow: Boolean(payload.activatedNow),
      license: payload.license
    };
  } catch (error) {
    console.error("License validation failed:", error.message);
    throw error;
  }
}

async function revalidateLicenseOnServer() {
  const licenseKey = safeGetSetting("license_key");
  const token = safeGetSetting("license_jwt");

  if (!licenseKey || !token) {
    return {
      valid: false,
      reason: "missing_license_or_token"
    };
  }

  const fingerprint = await getMachineFingerprint();
  const appVersion = getAppVersion();

  const payload = await postJson(
    `${normalizeBaseUrl(LICENSE_API_BASE_URL)}/licenses/revalidate`,
    {
      token,
      fingerprint,
      appVersion
    }
  );

  if (!payload || !payload.valid || !payload.token) {
    throw new Error("License revalidation failed: invalid server response.");
  }

  persistLicenseState(licenseKey, payload.token, payload);

  return {
    valid: true,
    online: true,
    license: payload.license
  };
}

async function validateLicenseOnStartup() {
  try {
    const licenseKey = safeGetSetting("license_key");
    if (!licenseKey) {
      return {
        valid: true,
        mode: "demo"
      };
    }

    const token = safeGetSetting("license_jwt");
    if (!token) {
      return {
        valid: false,
        mode: "missing_token"
      };
    }

    try {
      return await revalidateLicenseOnServer();
    } catch (onlineError) {
      // Gracefully allow short offline usage if previously validated.
      if (!isTokenExpired(token) && isWithinOfflineGrace()) {
        return {
          valid: true,
          online: false,
          mode: "offline_grace",
          reason: onlineError.message
        };
      }

      return {
        valid: false,
        mode: "revalidation_failed",
        reason: onlineError.message
      };
    }
  } catch (error) {
    console.error("License startup validation error:", error.message);
    return {
      valid: false,
      mode: "error",
      reason: error.message
    };
  }
}

module.exports = {
  validateLicense,
  validateLicenseOnStartup,
  revalidateLicenseOnServer,
  getLicenseStatus,
  getMachineFingerprint
};
