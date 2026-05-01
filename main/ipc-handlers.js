const fs = require("fs").promises;
const path = require("path");
const { app, ipcMain, shell } = require("electron");
const { pingTally, getCompanyList } = require("./tally/connector");
const { BackupEngine } = require("./backup/engine");
const { estimateBackupSize } = require("./backup/size-estimator");
const {
  getAllBackupProfiles,
  getBackupProfileById,
  getBackupRuns,
  getSetting,
  setSetting
} = require("./db/queries");
const {
  validateLicense,
  validateLicenseOnStartup,
  revalidateLicenseOnServer,
  getLicenseStatus
} = require("./license");
const {
  getGoogleDriveStatus,
  connectGoogleDrive,
  disconnectGoogleDrive
} = require("./sync/service");

let backupEngine = null;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return defaultValue;
}

function parseInteger(value, defaultValue) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

const DUMMY_GOOGLE_CLIENT_ID =
  "000000000000-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com";
const DUMMY_GOOGLE_CLIENT_SECRET = "dummy-client-secret";

function normalizeSettingsPayload(settings = {}) {
  return {
    tally_port: String(parseInteger(settings.tallyPort, 9000)),
    tally_data_path: String(settings.tallyDataPath || "").trim(),
    gdrive_folder_id: String(settings.gdriveFolderId || "").trim(),
    gdrive_client_id: String(settings.gdriveClientId || "").trim(),
    gdrive_client_secret: String(settings.gdriveClientSecret || "").trim(),
    gdrive_redirect_uri: String(settings.gdriveRedirectUri || "").trim(),
    auto_sync: parseBoolean(settings.autoSync, true) ? "1" : "0",
    notifications: parseBoolean(settings.notifications, true) ? "1" : "0",
    fallback_900_enabled: parseBoolean(settings.fallback900Enabled, true) ? "1" : "0",
    start_on_boot: parseBoolean(settings.startOnBoot, true) ? "1" : "0",
    update_channel: String(settings.updateChannel || "stable").trim().toLowerCase() || "stable"
  };
}

function mapSettingsFromStore() {
  const loginSettings = app.getLoginItemSettings();
  const startOnBootSetting = getSetting("start_on_boot");
  const resolvedStartOnBoot =
    startOnBootSetting === null
      ? Boolean(loginSettings.openAtLogin)
      : parseBoolean(startOnBootSetting, true);

  return {
    tallyPort: parseInteger(getSetting("tally_port"), 9000),
    tallyDataPath: getSetting("tally_data_path") || "",
    gdriveFolderId: getSetting("gdrive_folder_id") || "",
    gdriveClientId:
      getSetting("gdrive_client_id") ||
      process.env.GOOGLE_CLIENT_ID ||
      process.env.VITE_GOOGLE_CLIENT_ID ||
      DUMMY_GOOGLE_CLIENT_ID,
    gdriveClientSecret:
      getSetting("gdrive_client_secret") || process.env.GOOGLE_CLIENT_SECRET || DUMMY_GOOGLE_CLIENT_SECRET,
    gdriveRedirectUri:
      getSetting("gdrive_redirect_uri") ||
      process.env.GOOGLE_REDIRECT_URI ||
      "http://127.0.0.1:3478/oauth2callback",
    autoSync: parseBoolean(getSetting("auto_sync"), true),
    notifications: parseBoolean(getSetting("notifications"), true),
    fallback900Enabled: parseBoolean(getSetting("fallback_900_enabled"), true),
    startOnBoot: resolvedStartOnBoot,
    updateChannel: getSetting("update_channel") || "stable",
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged
  };
}

function mergeProfileOverrides(baseProfile, options = {}) {
  const overrides = options && typeof options === "object" ? options.overrides || {} : {};
  const merged = { ...baseProfile };

  if (Array.isArray(overrides.data_types)) {
    merged.data_types = overrides.data_types;
  } else if (Array.isArray(overrides.dataTypes)) {
    merged.data_types = overrides.dataTypes;
  }

  if (overrides.date_range_mode !== undefined) {
    merged.date_range_mode = overrides.date_range_mode;
  } else if (overrides.dateRangeMode !== undefined) {
    merged.date_range_mode = overrides.dateRangeMode;
  }

  if (overrides.custom_from !== undefined) {
    merged.custom_from = overrides.custom_from;
  } else if (overrides.customFrom !== undefined) {
    merged.custom_from = overrides.customFrom;
  }

  if (overrides.custom_to !== undefined) {
    merged.custom_to = overrides.custom_to;
  } else if (overrides.customTo !== undefined) {
    merged.custom_to = overrides.customTo;
  }

  return merged;
}

function toCsv(rows = []) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "profile_name,backup_type,status,started_at,completed_at,file_size,file_path,error_log\n";
  }

  const headers = [
    "profile_name",
    "backup_type",
    "status",
    "started_at",
    "completed_at",
    "file_size",
    "file_path",
    "error_log"
  ];

  function escapeCell(value) {
    const raw = String(value ?? "");
    if (/[",\n]/.test(raw)) {
      return `"${raw.replace(/"/g, "\"\"")}"`;
    }
    return raw;
  }

  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const line = headers.map((header) => escapeCell(row[header] ?? row[header.toLowerCase()] ?? "")).join(",");
    lines.push(line);
  });

  return `${lines.join("\n")}\n`;
}

async function runBackupWithProfileId(profileId, options = {}) {
  const profile = getBackupProfileById(profileId);
  if (!profile) throw new Error("Profile not found");

  const effectiveProfile = mergeProfileOverrides(profile, options);

  if (!backupEngine) {
    const { getDatabase } = require("./db");
    const db = getDatabase();
    backupEngine = new BackupEngine(db);
  }

  return backupEngine.runBackup(effectiveProfile);
}

function registerIpcHandlers(mainWindow) {
  // Tally handlers
  ipcMain.handle("tally:ping", async (_event, port) => {
    try {
      return await pingTally(port);
    } catch (error) {
      return { connected: false, error: error.message };
    }
  });

  ipcMain.handle("tally:getCompanies", async (_event, port) => {
    try {
      return await getCompanyList(port);
    } catch (error) {
      return { error: error.message };
    }
  });

  // Backup handlers
  ipcMain.handle("backup:start", async (_event, profileId) => {
    try {
      const result = await runBackupWithProfileId(profileId);
      mainWindow.webContents.send("backup:complete", result);
      return result;
    } catch (error) {
      mainWindow.webContents.send("backup:error", error.message);
      throw error;
    }
  });

  ipcMain.handle("backup:manual", async (_event, options = {}) => {
    try {
      const profileId = options.profileId || options.id;
      if (!profileId) {
        throw new Error("profileId is required for manual backup");
      }

      const result = await runBackupWithProfileId(profileId, options);
      mainWindow.webContents.send("backup:complete", result);
      return result;
    } catch (error) {
      mainWindow.webContents.send("backup:error", error.message);
      throw error;
    }
  });

  ipcMain.handle("backup:estimate", async (_event, profile = {}) => {
    try {
      return await estimateBackupSize(profile);
    } catch (error) {
      throw new Error(error.message);
    }
  });

  ipcMain.handle("runs:getAll", async (_event, limit = 200) => {
    return getBackupRuns(limit);
  });

  // Google Drive handlers
  ipcMain.handle("drive:status", async () => {
    return getGoogleDriveStatus();
  });

  ipcMain.handle("drive:connect", async () => {
    return connectGoogleDrive();
  });

  ipcMain.handle("drive:disconnect", async () => {
    return disconnectGoogleDrive();
  });

  // Profile handlers
  ipcMain.handle("profiles:getAll", async () => getAllBackupProfiles());

  ipcMain.handle("profiles:create", async (_event, profile) => {
    const { createBackupProfile } = require("./db/queries");
    return createBackupProfile(profile);
  });

  ipcMain.handle("profiles:update", async (_event, id, updates) => {
    const { updateBackupProfile } = require("./db/queries");
    return updateBackupProfile(id, updates);
  });

  ipcMain.handle("profiles:delete", async (_event, id) => {
    const { deleteBackupProfile } = require("./db/queries");
    return deleteBackupProfile(id);
  });

  // Restore / export handlers
  ipcMain.handle("restore:openInFolder", async (_event, filePath) => {
    const target = String(filePath || "").trim();
    if (!target) throw new Error("filePath is required.");
    shell.showItemInFolder(path.normalize(target));
    return { success: true };
  });

  ipcMain.handle("restore:exportCsv", async (_event, rows = [], options = {}) => {
    const docsPath = app.getPath("documents");
    const exportDir = path.join(docsPath, "TallyBackupExports");
    await fs.mkdir(exportDir, { recursive: true });

    const suffix = new Date().toISOString().replace(/[:.]/g, "-");
    const preferredName = String(options.fileName || "").trim().replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = preferredName || `backup_export_${suffix}.csv`;
    const targetPath = path.join(exportDir, fileName);

    await fs.writeFile(targetPath, toCsv(rows), "utf8");
    return {
      success: true,
      path: targetPath
    };
  });

  // Settings handlers
  ipcMain.handle("settings:get", async () => mapSettingsFromStore());

  ipcMain.handle("settings:update", async (_event, settings) => {
    const normalized = normalizeSettingsPayload(settings);
    Object.entries(normalized).forEach(([key, value]) => {
      setSetting(key, value);
    });

    app.setLoginItemSettings({
      openAtLogin: normalized.start_on_boot === "1",
      path: app.getPath("exe")
    });

    return mapSettingsFromStore();
  });

  // Email handlers
  ipcMain.handle("email:saveSettings", async (_event, emailSettings) => {
    try {
      const emailService = require("./services/email-service");
      
      // Validate configuration
      const validation = emailService.validateConfig(emailSettings);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join("; ")
        };
      }

      // Encrypt sensitive data before storing
      const { encrypt } = require("../../shared/utils/cryptoUtils");
      const encryptedSettings = { ...emailSettings };
      
      if (emailSettings.provider === "smtp" && emailSettings.smtpPassword) {
        encryptedSettings.smtpPassword = encrypt(emailSettings.smtpPassword);
      } else if (emailSettings.provider === "sendgrid" && emailSettings.sendgridApiKey) {
        encryptedSettings.sendgridApiKey = encrypt(emailSettings.sendgridApiKey);
      }

      // Save to settings
      await setSetting("emailSettings", JSON.stringify(encryptedSettings));

      // Initialize email service with new config
      await emailService.initialize(encryptedSettings);

      return { success: true };
    } catch (error) {
      console.error("Failed to save email settings:", error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  ipcMain.handle("email:testSend", async (_event, toEmail) => {
    try {
      const emailService = require("./services/email-service");
      
      if (!emailService.isReady) {
        return {
          success: false,
          message: "Email service not configured"
        };
      }

      return await emailService.sendTestEmail(toEmail);
    } catch (error) {
      console.error("Failed to send test email:", error);
      return {
        success: false,
        message: error.message
      };
    }
  });

  ipcMain.handle("email:getSettings", async () => {
    try {
      const storedSettings = await getSetting("emailSettings");
      if (!storedSettings) {
        return {
          enabled: false,
          provider: "smtp",
          recipientEmails: [],
          notifyOnSuccess: true,
          notifyOnFailure: true
        };
      }

      const settings = JSON.parse(storedSettings);
      // Don't return encrypted passwords/keys
      return {
        enabled: settings.enabled,
        provider: settings.provider,
        recipientEmails: settings.recipientEmails || [],
        notifyOnSuccess: settings.notifyOnSuccess,
        notifyOnFailure: settings.notifyOnFailure,
        fromEmail: settings.fromEmail,
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser
      };
    } catch (error) {
      console.error("Failed to get email settings:", error);
      return {
        enabled: false,
        provider: "smtp",
        recipientEmails: [],
        notifyOnSuccess: true,
        notifyOnFailure: true
      };
    }
  });

  // License handlers
  ipcMain.handle("license:validate", async (_event, licenseKey) => {
    return validateLicense(licenseKey);
  });

  ipcMain.handle("license:revalidate", async () => {
    return revalidateLicenseOnServer();
  });

  ipcMain.handle("license:validateOnStartup", async () => {
    return validateLicenseOnStartup();
  });

  ipcMain.handle("license:status", async () => {
    return getLicenseStatus();
  });
}

module.exports = { registerIpcHandlers };
