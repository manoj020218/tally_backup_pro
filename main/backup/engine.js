const fs = require("fs").promises;
const path = require("path");
const {
  fetchTallyData,
  pingTally
} = require("../tally/connector");
const {
  resolveDataType,
  isTransactionType,
  isMasterType
} = require("../tally/data-types");
const { formatTallyDate } = require("../tally/xml-builder");
const { compressToGzip, getFileSize } = require("./compressor");
const { getLocalBackupPath, cleanupOldBackups } = require("./local-manager");
const { getLastBackupDate, updateBackupState } = require("./incremental");

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

function getDefaultFromDate() {
  const today = new Date();
  const year = today.getMonth() + 1 >= 4 ? today.getFullYear() : today.getFullYear() - 1;
  return `${year}0401`;
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
    dateRangeMode: profile.date_range_mode || profile.dateRangeMode || "incremental",
    customFrom: profile.custom_from || profile.customFrom || "",
    customTo: profile.custom_to || profile.customTo || "",
    localPath: profile.local_path || profile.localPath || path.resolve(process.cwd(), "backups"),
    retentionDays: Number.parseInt(profile.retention_days || profile.retentionDays || "30", 10),
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
  const health = await pingTally(normalized.tallyPort, normalized.tallyHost);
  if (!health.connected) {
    const error = `Tally is not reachable: ${health.error || "unknown error"}`;
    maybeLogBackupRun(context.db, normalized, "failed", "", 0, error);
    return {
      success: false,
      startedAt: startTime.toISOString(),
      completedAt: new Date().toISOString(),
      error
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

    try {
      let fromDate = normalized.customFrom ? formatTallyDate(normalized.customFrom) : getDefaultFromDate();
      if (normalized.dateRangeMode === "incremental" && isTransactionType(typeDefinition)) {
        const lastToDate = await getLastBackupDate(
          context.db,
          normalized.companyId || normalized.companyName,
          typeDefinition.id,
          normalized.id
        );
        if (lastToDate) {
          fromDate = addDays(lastToDate, 1) || fromDate;
        }
      }

      const effectiveToDate = normalized.customTo ? formatTallyDate(normalized.customTo) : toDate;
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
        const outputFile = path.join(
          backupDir,
          `${safeType}_${fromDate}_${effectiveToDate}.json.gz`
        );

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
          recordCount,
          sizeKb: size.kb
        });

        results.push({
          dataType: typeDefinition.id,
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
          recordCount: 0,
          sizeKb: 0
        });

        results.push({
          dataType: typeDefinition.id,
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

  const firstFile = results.find((item) => item.filePath);
  maybeLogBackupRun(
    context.db,
    normalized,
    summary.status,
    firstFile ? firstFile.filePath : "",
    totalSizeBytes,
    failedCount > 0 ? results.filter((r) => !r.success).map((r) => r.error).join(" | ") : ""
  );

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

