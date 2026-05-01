const fs = require("fs").promises;
const path = require("path");
const { fetchTallyData, pingTally } = require("../tally/connector");
const {
  resolveDataType,
  isTransactionType,
  isMasterType,
  isFullFileType
} = require("../tally/data-types");
const { formatTallyDate } = require("../tally/xml-builder");
const { compressToGzip, getFileSize } = require("./compressor");
const {
  getLocalBackupPath,
  cleanupOldBackups,
  ensureFreeDiskSpace
} = require("./local-manager");
const { getLastBackupDate, updateBackupState } = require("./incremental");
const { runFull900Backup } = require("./full-900");
const { enqueueBackupJob } = require("./xml-queue");
const { getSetting } = require("../db/queries");
const { syncBackupRunArtifacts } = require("../sync/service");

const FULL_BACKUP_START_DATE = "19000101";
const DEFAULT_REQUIRED_FREE_BYTES = 50 * 1024 * 1024; // 50 MB

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

function normalizeDateRangeMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  const allowed = new Set([
    "full",
    "incremental",
    "thisfinancialyear",
    "lastfinancialyear",
    "custom"
  ]);
  return allowed.has(normalized) ? normalized : "incremental";
}

function addDays(dateStringYYYYMMDD, days) {
  const value = String(dateStringYYYYMMDD || "");
  if (!/^\d{8}$/.test(value)) return null;
  const date = new Date(
    Number.parseInt(value.slice(0, 4), 10),
    Number.parseInt(value.slice(4, 6), 10) - 1,
    Number.parseInt(value.slice(6, 8), 10)
  );
  date.setDate(date.getDate() + days);
  return formatTallyDate(date);
}

function getCurrentFinancialYearStart(date = new Date()) {
  const year = date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}0401`;
}

function getLastFinancialYearRange(date = new Date()) {
  const currentStartYear = date.getMonth() + 1 >= 4 ? date.getFullYear() : date.getFullYear() - 1;
  const from = `${currentStartYear - 1}0401`;
  const to = `${currentStartYear}0331`;
  return { from, to };
}

function normalizeProfile(profile) {
  return {
    id: profile.id || profile.profile_id || `profile_${Date.now()}`,
    name: profile.name || "Unnamed Profile",
    companyId: profile.company_id || profile.companyId || profile.tally_company || "",
    companyName:
      profile.company_name ||
      profile.companyName ||
      profile.tallyCompany ||
      profile.tally_company ||
      "",
    dataTypes: Array.isArray(profile.data_types)
      ? profile.data_types
      : Array.isArray(profile.dataTypes)
      ? profile.dataTypes
      : ["Sales"],
    dateRangeMode: normalizeDateRangeMode(
      profile.date_range_mode || profile.dateRangeMode || "incremental"
    ),
    customFrom: profile.custom_from || profile.customFrom || "",
    customTo: profile.custom_to || profile.customTo || "",
    localPath: profile.local_path || profile.localPath || path.resolve(process.cwd(), "backups"),
    retentionDays: Number.parseInt(profile.retention_days || profile.retentionDays || "30", 10),
    gdriveEnabled: parseBoolean(profile.gdrive_enabled ?? profile.gdriveEnabled, false),
    tallyPort: Number.parseInt(profile.tally_port || profile.tallyPort || "9000", 10),
    tallyHost: profile.tally_host || profile.tallyHost || "127.0.0.1"
  };
}

function validateBackupProfile(profile) {
  const normalized = normalizeProfile(profile || {});
  const errors = [];
  if (!normalized.name) errors.push("Profile name is required.");
  if (!normalized.companyName) errors.push("Company name is required.");
  if (!Array.isArray(normalized.dataTypes) || normalized.dataTypes.length === 0) {
    errors.push("At least one data type is required.");
  }
  if (!normalized.localPath) errors.push("Local backup path is required.");

  return {
    isValid: errors.length === 0,
    errors,
    normalized
  };
}

async function runPreflightChecks(profile) {
  const requiredBytes = Math.max(
    DEFAULT_REQUIRED_FREE_BYTES,
    Number(profile.dataTypes.length || 1) * 10 * 1024 * 1024
  );
  const diskCheck = await ensureFreeDiskSpace(profile.localPath, requiredBytes);
  if (!diskCheck.ok) {
    return {
      ok: false,
      error: `Insufficient disk space. Required ${requiredBytes} bytes, available ${diskCheck.freeBytes} bytes.`
    };
  }

  return { ok: true };
}

async function writeCompressedBackupFile(targetFilePath, payload) {
  await fs.mkdir(path.dirname(targetFilePath), { recursive: true });
  await compressToGzip(JSON.stringify(payload, null, 2), targetFilePath);
  return getFileSize(targetFilePath);
}

function extractRecordsForType(dataTypeDefinition, parsedResult) {
  if (isTransactionType(dataTypeDefinition)) {
    return Array.isArray(parsedResult.vouchers) ? parsedResult.vouchers : [];
  }
  if (isMasterType(dataTypeDefinition)) {
    return Array.isArray(parsedResult.masters) ? parsedResult.masters : [];
  }
  return [];
}

function maybeLogBackupRun(db, profile, status, filePath, fileSizeBytes, errorMessage = "") {
  if (!db || typeof db.prepare !== "function") return;

  try {
    const stmt = db.prepare(
      `INSERT INTO backup_runs
      (profile_id, profile_name, backup_type, started_at, completed_at, status, file_path, file_size, error_log)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const now = new Date().toISOString();
    stmt.run(
      profile.id,
      profile.name,
      profile.dateRangeMode,
      now,
      now,
      status,
      filePath || "",
      fileSizeBytes || 0,
      errorMessage || ""
    );
  } catch (_error) {
    // table may not exist yet in early setup
  }
}

async function resolveTransactionRange(profile, dataTypeId, context, defaultToDate) {
  let fromDate = profile.customFrom ? formatTallyDate(profile.customFrom) : getCurrentFinancialYearStart();
  let toDate = profile.customTo ? formatTallyDate(profile.customTo) : defaultToDate;
  let effectiveMode = profile.dateRangeMode;

  if (profile.dateRangeMode === "full") {
    fromDate = FULL_BACKUP_START_DATE;
    return { fromDate, toDate, effectiveMode: "full" };
  }

  if (profile.dateRangeMode === "incremental") {
    if (!profile.customFrom) {
      const lastToDate = await getLastBackupDate(
        context.db,
        profile.companyId || profile.companyName,
        dataTypeId,
        profile.id
      );

      if (lastToDate) {
        fromDate = addDays(lastToDate, 1) || fromDate;
      } else {
        fromDate = FULL_BACKUP_START_DATE;
        effectiveMode = "full-first-run";
      }
    }

    return { fromDate, toDate, effectiveMode };
  }

  if (profile.dateRangeMode === "thisfinancialyear") {
    fromDate = getCurrentFinancialYearStart();
    return { fromDate, toDate, effectiveMode };
  }

  if (profile.dateRangeMode === "lastfinancialyear") {
    const lastFy = getLastFinancialYearRange();
    return {
      fromDate: lastFy.from,
      toDate: lastFy.to,
      effectiveMode
    };
  }

  if (profile.dateRangeMode === "custom") {
    fromDate = profile.customFrom ? formatTallyDate(profile.customFrom) : getCurrentFinancialYearStart();
    toDate = profile.customTo ? formatTallyDate(profile.customTo) : defaultToDate;
    return { fromDate, toDate, effectiveMode };
  }

  return { fromDate, toDate, effectiveMode };
}

async function maybeRun900Fallback(profile, reason = "manual") {
  const fallbackEnabled = parseBoolean(safeGetSetting("fallback_900_enabled"), true);
  const profileRequires900 = profile.dataTypes.some((type) => String(type).toUpperCase() === "FULL_900_BACKUP");
  if (!fallbackEnabled && !profileRequires900) {
    return {
      success: false,
      skipped: true,
      error: "Fallback .900 backup is disabled in Settings."
    };
  }

  const tallyDataPath = safeGetSetting("tally_data_path") || "";
  return runFull900Backup(profile, {
    reason,
    tallyDataPath
  });
}

async function runBackup(profile, context = {}) {
  const validation = validateBackupProfile(profile);
  if (!validation.isValid) {
    return {
      success: false,
      errors: validation.errors,
      failedCount: validation.errors.length
    };
  }

  const normalized = validation.normalized;
  const startTime = new Date();

  const preflight = await runPreflightChecks(normalized);
  if (!preflight.ok) {
    maybeLogBackupRun(context.db, normalized, "failed", "", 0, preflight.error);
    return {
      success: false,
      startedAt: startTime.toISOString(),
      completedAt: new Date().toISOString(),
      error: preflight.error
    };
  }

  const health = await pingTally(normalized.tallyPort, normalized.tallyHost);
  if (!health.connected) {
    const queueErrorParts = [];
    try {
      enqueueBackupJob({
        profileId: normalized.id,
        queuedAt: new Date().toISOString(),
        reason: "tally_disconnected"
      });
    } catch (error) {
      queueErrorParts.push(`Queue error: ${error.message}`);
    }

    const fallback = await maybeRun900Fallback(normalized, "tally_disconnected");
    const queuedMessage = `Tally is not reachable: ${health.error || "unknown error"}. XML backup queued for retry.`;
    const fallbackMessage =
      fallback.success
        ? ` .900 fallback completed (${fallback.files?.length || 0} file(s)).`
        : fallback.skipped
        ? ` .900 fallback skipped.`
        : ` .900 fallback failed: ${fallback.error || "unknown error"}.`;

    const combinedError = [queuedMessage + fallbackMessage, ...queueErrorParts].join(" ");
    const fallbackFirstFile = Array.isArray(fallback.files) && fallback.files.length > 0
      ? fallback.files[0].filePath
      : "";
    const fallbackTotalBytes = Number(fallback.totalBytes || 0);

    maybeLogBackupRun(
      context.db,
      normalized,
      fallback.success ? "queued" : "failed",
      fallbackFirstFile,
      fallbackTotalBytes,
      combinedError
    );

    return {
      success: Boolean(fallback.success),
      queued: true,
      status: fallback.success ? "queued" : "failed",
      startedAt: startTime.toISOString(),
      completedAt: new Date().toISOString(),
      error: combinedError,
      fallback900: fallback
    };
  }

  const backupDir = await getLocalBackupPath(normalized.localPath, normalized.companyName);
  const toDate = formatTallyDate(new Date());
  const results = [];
  let successCount = 0;
  let failedCount = 0;
  let totalSizeBytes = 0;

  for (const rawType of normalized.dataTypes) {
    const typeDefinition = resolveDataType(rawType);
    if (!typeDefinition) {
      failedCount += 1;
      results.push({
        dataType: rawType,
        success: false,
        error: "Unsupported data type"
      });
      continue;
    }

    if (isFullFileType(typeDefinition)) {
      try {
        const fullResult = await maybeRun900Fallback(normalized, "profile_full_900");
        if (!fullResult.success) {
          throw new Error(fullResult.error || "Unable to complete .900 full backup.");
        }

        const firstFile = Array.isArray(fullResult.files) ? fullResult.files[0] : null;
        totalSizeBytes += Number(fullResult.totalBytes || 0);
        successCount += 1;
        results.push({
          dataType: typeDefinition.id,
          effectiveMode: "full-900-file",
          success: true,
          recordCount: Number(fullResult.files?.length || 0),
          fromDate: "",
          toDate,
          filePath: firstFile ? firstFile.filePath : "",
          size: {
            bytes: Number(fullResult.totalBytes || 0),
            kb: Math.ceil(Number(fullResult.totalBytes || 0) / 1024),
            mb: Number((Number(fullResult.totalBytes || 0) / (1024 * 1024)).toFixed(2))
          }
        });
      } catch (error) {
        failedCount += 1;
        results.push({
          dataType: typeDefinition.id,
          success: false,
          error: error.message
        });
      }
      continue;
    }

    try {
      let fromDate = FULL_BACKUP_START_DATE;
      let effectiveToDate = toDate;
      let effectiveMode = normalized.dateRangeMode;

      if (isTransactionType(typeDefinition)) {
        const range = await resolveTransactionRange(
          normalized,
          typeDefinition.id,
          context,
          toDate
        );
        fromDate = range.fromDate;
        effectiveToDate = range.toDate;
        effectiveMode = range.effectiveMode;
      } else if (isMasterType(typeDefinition)) {
        // Tally master data is always exported in full.
        fromDate = FULL_BACKUP_START_DATE;
        effectiveToDate = toDate;
        effectiveMode = "full-master";
      }

      if (String(fromDate) > String(effectiveToDate)) {
        successCount += 1;
        results.push({
          dataType: typeDefinition.id,
          effectiveMode,
          success: true,
          recordCount: 0,
          fromDate,
          toDate: effectiveToDate,
          skipped: true,
          reason: "already_up_to_date"
        });
        continue;
      }

      const parsed = await fetchTallyData({
        dataType: typeDefinition.id,
        companyName: normalized.companyName,
        fromDate,
        toDate: effectiveToDate,
        host: normalized.tallyHost,
        port: normalized.tallyPort
      });

      const records = extractRecordsForType(typeDefinition, parsed);
      const recordCount = records.length;

      if (recordCount > 0) {
        const safeType = String(typeDefinition.id).replace(/[^a-zA-Z0-9_-]/g, "_");
        const outputFile = path.join(backupDir, `${safeType}_${fromDate}_${effectiveToDate}.json.gz`);

        const payload = {
          meta: {
            profileId: normalized.id,
            profileName: normalized.name,
            companyName: normalized.companyName,
            dataType: typeDefinition.id,
            fromDate,
            toDate: effectiveToDate,
            exportedAt: new Date().toISOString()
          },
          records
        };

        const size = await writeCompressedBackupFile(outputFile, payload);
        totalSizeBytes += size.bytes;

        await updateBackupState(context.db, {
          companyId: normalized.companyId || normalized.companyName,
          dataType: typeDefinition.id,
          profileId: normalized.id,
          lastFromDate: fromDate,
          lastToDate: effectiveToDate,
          lastFilePath: outputFile,
          recordCount,
          sizeKb: size.kb
        });

        results.push({
          dataType: typeDefinition.id,
          effectiveMode,
          success: true,
          recordCount,
          fromDate,
          toDate: effectiveToDate,
          filePath: outputFile,
          size
        });
      } else {
        await updateBackupState(context.db, {
          companyId: normalized.companyId || normalized.companyName,
          dataType: typeDefinition.id,
          profileId: normalized.id,
          lastFromDate: fromDate,
          lastToDate: effectiveToDate,
          lastFilePath: null,
          recordCount: 0,
          sizeKb: 0
        });

        results.push({
          dataType: typeDefinition.id,
          effectiveMode,
          success: true,
          recordCount: 0,
          fromDate,
          toDate: effectiveToDate,
          skipped: true
        });
      }

      successCount += 1;
    } catch (error) {
      failedCount += 1;
      results.push({
        dataType: rawType,
        success: false,
        error: error.message
      });
    }
  }

  await cleanupOldBackups(backupDir, normalized.retentionDays);

  const summary = {
    success: failedCount === 0,
    status: failedCount === 0 ? "success" : successCount > 0 ? "partial" : "failed",
    startedAt: startTime.toISOString(),
    completedAt: new Date().toISOString(),
    profileId: normalized.id,
    profileName: normalized.name,
    successCount,
    failedCount,
    totalTypes: normalized.dataTypes.length,
    totalSizeBytes,
    results
  };

  let driveSyncErrors = [];
  try {
    const driveSync = await syncBackupRunArtifacts(normalized, summary);
    summary.driveSync = driveSync;
    driveSyncErrors = Array.isArray(driveSync?.errors)
      ? driveSync.errors.map((item) => item.error).filter(Boolean)
      : [];

    if (driveSync.enabled && driveSyncErrors.length > 0 && summary.status === "success") {
      summary.status = "partial";
      summary.success = false;
    }
  } catch (driveError) {
    summary.driveSync = {
      enabled: true,
      syncedCount: 0,
      skippedCount: 0,
      errors: [{ error: driveError.message }],
      files: []
    };
    driveSyncErrors = [driveError.message];
    if (summary.status === "success") {
      summary.status = "partial";
      summary.success = false;
    }
  }

  const firstFile = results.find((item) => item.filePath);
  const totalRecordCount = results.reduce(
    (sum, item) => sum + (Number.isFinite(Number(item.recordCount)) ? Number(item.recordCount) : 0),
    0
  );
  summary.totalRecordCount = totalRecordCount;
  summary.noData = totalRecordCount === 0;
  summary.filePath = firstFile ? firstFile.filePath : backupDir;

  const typeErrors = failedCount > 0 ? results.filter((r) => !r.success).map((r) => r.error).filter(Boolean) : [];
  const allErrors = [...typeErrors, ...driveSyncErrors].filter(Boolean);
  maybeLogBackupRun(
    context.db,
    normalized,
    summary.status,
    summary.filePath || "",
    totalSizeBytes,
    allErrors.join(" | ")
  );

  // Send email notifications
  try {
    const emailService = require("../services/email-service");
    if (emailService.isReady) {
      if (summary.success) {
        await emailService.sendBackupSuccess(normalized, {
          size: totalSizeBytes,
          duration: `${Math.round((new Date() - startTime) / 1000)}s`,
          completedAt: summary.completedAt,
          successCount,
          failedCount
        });
      } else {
        const errorMessage = allErrors.join("; ") || "Backup failed with unknown error";
        await emailService.sendBackupFailure(normalized, new Error(errorMessage));
      }
    }
  } catch (error) {
    // Don't let email errors interrupt the backup process
    // Just log them silently
  }

  return summary;
}

class BackupEngine {
  constructor(db, options = {}) {
    this.db = db;
    this.options = options;
  }

  async runBackup(profile) {
    return runBackup(profile, {
      db: this.db,
      ...this.options
    });
  }
}

module.exports = {
  BackupEngine,
  runBackup,
  validateBackupProfile
};
