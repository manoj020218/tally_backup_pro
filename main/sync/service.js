const path = require("path");
const { getSetting, setSetting } = require("../db/queries");
const {
  authorizeWithPkce,
  ensureValidAccessToken,
  loadAuthTokens,
  clearAuthTokens
} = require("./oauth");
const { getDriveAbout, ensureDriveFolder } = require("./gdrive");
const { uploadFileResumable } = require("./uploader");
const { addBackupToManifest } = require("./manifest");

const DEFAULT_DRIVE_FOLDER_NAME = "TallyBackupPro";
const DEFAULT_REDIRECT_URI = "http://127.0.0.1:3478/oauth2callback";
const DUMMY_GOOGLE_CLIENT_ID =
  "000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com";
const DUMMY_GOOGLE_CLIENT_SECRET = "dummy-client-secret";

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function safeGetSetting(key) {
  try {
    return getSetting(key);
  } catch (_error) {
    return null;
  }
}

function safeSetSetting(key, value) {
  try {
    setSetting(key, value);
  } catch (_error) {
    // ignore persistence errors in non-db contexts
  }
}

function isDummyGoogleClientId(value) {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  return (
    normalized === DUMMY_GOOGLE_CLIENT_ID ||
    normalized.includes("xxxxxxxx") ||
    normalized.includes("replace-me")
  );
}

function getOAuthConfig() {
  const clientId =
    String(safeGetSetting("gdrive_client_id") || "").trim() ||
    String(process.env.GOOGLE_CLIENT_ID || "").trim() ||
    String(process.env.VITE_GOOGLE_CLIENT_ID || "").trim() ||
    DUMMY_GOOGLE_CLIENT_ID;
  const clientSecret =
    String(safeGetSetting("gdrive_client_secret") || "").trim() ||
    String(process.env.GOOGLE_CLIENT_SECRET || "").trim() ||
    DUMMY_GOOGLE_CLIENT_SECRET;
  const redirectUri =
    String(safeGetSetting("gdrive_redirect_uri") || "").trim() ||
    String(process.env.GOOGLE_REDIRECT_URI || "").trim() ||
    DEFAULT_REDIRECT_URI;

  return {
    clientId,
    clientSecret,
    redirectUri,
    usingDummyClient: isDummyGoogleClientId(clientId)
  };
}

function ensureOAuthConfigUsable(config) {
  if (!config || !config.clientId || config.usingDummyClient) {
    throw new Error(
      "Google OAuth Client ID is dummy/placeholder. Replace GOOGLE_CLIENT_ID (or Settings -> Google OAuth Client ID) with real Web Client ID."
    );
  }
}

function getConfiguredFolderId() {
  return String(safeGetSetting("gdrive_folder_id") || "").trim();
}

function normalizeDriveStatus(status = {}, fallback = {}) {
  return {
    connected: Boolean(status.connected),
    configured: Boolean(status.configured),
    email: String(status.email || ""),
    displayName: String(status.displayName || ""),
    folderId: String(status.folderId || fallback.folderId || ""),
    quota: {
      used: Number(status.quota?.used || 0),
      total: Number(status.quota?.total || 0)
    },
    error: status.error ? String(status.error) : ""
  };
}

async function resolveDriveFolder(accessToken, preferredFolderId = "") {
  const provided = String(preferredFolderId || "").trim();
  if (provided) {
    return provided;
  }

  const folder = await ensureDriveFolder(accessToken, DEFAULT_DRIVE_FOLDER_NAME, null);
  if (!folder?.id) {
    throw new Error("Unable to create or resolve Google Drive target folder.");
  }

  safeSetSetting("gdrive_folder_id", folder.id);
  return folder.id;
}

async function getGoogleDriveStatus() {
  const folderId = getConfiguredFolderId();
  const storedTokens = loadAuthTokens();
  if (!storedTokens) {
    const config = getOAuthConfig();
    return normalizeDriveStatus({
      connected: false,
      configured: !config.usingDummyClient,
      folderId
    });
  }

  try {
    const config = getOAuthConfig();
    const accessToken = await ensureValidAccessToken(config);
    const about = await getDriveAbout(accessToken);
    return normalizeDriveStatus({
      connected: true,
      configured: true,
      email: about?.user?.emailAddress || storedTokens.email || "",
      displayName: about?.user?.displayName || "",
      folderId,
      quota: {
        used: Number(about?.storageQuota?.usage || 0),
        total: Number(about?.storageQuota?.limit || 0)
      }
    });
  } catch (error) {
    return normalizeDriveStatus({
      connected: false,
      configured: true,
      folderId,
      error: error.message
    });
  }
}

async function connectGoogleDrive() {
  const config = getOAuthConfig();
  ensureOAuthConfigUsable(config);
  const authResult = await authorizeWithPkce({
    clientId: config.clientId,
    clientSecret: config.clientSecret || undefined,
    redirectUri: config.redirectUri,
    openBrowser: true
  });

  const status = await getGoogleDriveStatus();
  return normalizeDriveStatus({
    ...status,
    connected: true,
    email: status.email || authResult.email || ""
  });
}

async function disconnectGoogleDrive() {
  clearAuthTokens();
  const config = getOAuthConfig();
  return normalizeDriveStatus({
    connected: false,
    configured: !config.usingDummyClient,
    folderId: getConfiguredFolderId()
  });
}

function isDriveSyncEnabledForProfile(profile = {}) {
  const autoSyncEnabled = parseBoolean(safeGetSetting("auto_sync"), true);
  const profileDriveEnabled = parseBoolean(
    profile.gdrive_enabled ?? profile.gdriveEnabled,
    false
  );
  return autoSyncEnabled && profileDriveEnabled;
}

async function syncBackupFileToDrive(profile, backupResultItem) {
  const localFilePath = String(backupResultItem?.filePath || "").trim();
  if (!localFilePath) {
    throw new Error("Backup file path is required for Drive upload.");
  }

  const config = getOAuthConfig();
  ensureOAuthConfigUsable(config);
  const accessToken = await ensureValidAccessToken(config);
  const folderId = await resolveDriveFolder(accessToken, getConfiguredFolderId());

  const driveFile = await uploadFileResumable(accessToken, localFilePath, {
    fileName: path.basename(localFilePath),
    parentFolderId: folderId,
    appProperties: {
      profileId: String(profile.id || ""),
      companyName: String(profile.companyName || ""),
      dataType: String(backupResultItem.dataType || "")
    },
    description: `TallyBackup Pro backup: ${profile.name || "profile"}`
  });

  await addBackupToManifest(accessToken, folderId, {
    companyId: profile.companyId || profile.companyName || "",
    companyName: profile.companyName || "",
    profileId: profile.id || "",
    dataType: backupResultItem.dataType || "",
    filePath: localFilePath,
    driveFileId: driveFile.id || "",
    driveFileName: driveFile.name || path.basename(localFilePath),
    recordCount: Number(backupResultItem.recordCount || 0),
    fromDate: backupResultItem.fromDate || "",
    toDate: backupResultItem.toDate || "",
    metadata: {
      effectiveMode: backupResultItem.effectiveMode || "",
      source: "backup_engine"
    }
  });

  return {
    folderId,
    driveFileId: driveFile.id || "",
    driveFileName: driveFile.name || path.basename(localFilePath)
  };
}

async function syncBackupRunArtifacts(profile, backupSummary) {
  const resultItems = Array.isArray(backupSummary?.results) ? backupSummary.results : [];
  const fileItems = resultItems.filter((item) => item && item.success && item.filePath);

  if (!isDriveSyncEnabledForProfile(profile)) {
    return {
      enabled: false,
      syncedCount: 0,
      skippedCount: fileItems.length,
      errors: [],
      files: []
    };
  }

  const files = [];
  const errors = [];

  for (const item of fileItems) {
    try {
      const synced = await syncBackupFileToDrive(profile, item);
      files.push({
        dataType: item.dataType,
        filePath: item.filePath,
        ...synced
      });
    } catch (error) {
      errors.push({
        dataType: item.dataType,
        filePath: item.filePath,
        error: error.message
      });
    }
  }

  return {
    enabled: true,
    syncedCount: files.length,
    skippedCount: Math.max(0, fileItems.length - files.length),
    errors,
    files
  };
}

module.exports = {
  getGoogleDriveStatus,
  connectGoogleDrive,
  disconnectGoogleDrive,
  syncBackupRunArtifacts
};
