const { fetchTallyData } = require("../tally/connector");
const {
  resolveDataType,
  isTransactionType,
  isMasterType,
  isFullFileType
} = require("../tally/data-types");
const { formatTallyDate } = require("../tally/xml-builder");
const { getLastBackupDate } = require("./incremental");
const { getDatabase } = require("../db");
const { getSetting } = require("../db/queries");
const { collect900Files } = require("./full-900");

const FULL_BACKUP_START_DATE = "19000101";

const SIZE_PER_RECORD = {
  Sales: 850,
  Purchase: 820,
  Receipt: 320,
  Payment: 320,
  Journal: 280,
  "Credit Note": 650,
  "Debit Note": 650,
  "Stock Journal": 760,
  "Delivery Note": 540,
  STOCKITEM: 480,
  LEDGER: 420,
  UNIT: 180,
  STOCKGROUP: 280
};

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

function normalizeEstimatorProfile(profile) {
  return {
    id: profile.id || profile.profile_id || "",
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
    dateRangeMode: normalizeDateRangeMode(profile.date_range_mode || profile.dateRangeMode || "incremental"),
    customFrom: profile.custom_from || profile.customFrom || "",
    customTo: profile.custom_to || profile.customTo || "",
    tallyHost: profile.tally_host || profile.tallyHost || "127.0.0.1",
    tallyPort: Number.parseInt(profile.tally_port || profile.tallyPort || "9000", 10)
  };
}

function getCurrentFinancialYearStart(baseDate = new Date()) {
  const year = baseDate.getMonth() + 1 >= 4 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
  return `${year}0401`;
}

function getLastFinancialYearRange(baseDate = new Date()) {
  const currentStartYear = baseDate.getMonth() + 1 >= 4 ? baseDate.getFullYear() : baseDate.getFullYear() - 1;
  return {
    from: `${currentStartYear - 1}0401`,
    to: `${currentStartYear}0331`
  };
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

function getToDate(profile) {
  return profile.customTo ? formatTallyDate(profile.customTo) : formatTallyDate(new Date());
}

async function resolveFromDateForType(profile, dataTypeDefinition, options = {}) {
  if (!isTransactionType(dataTypeDefinition)) {
    return {
      fromDate: FULL_BACKUP_START_DATE,
      toDate: getToDate(profile),
      effectiveMode: isMasterType(dataTypeDefinition) ? "full-master" : profile.dateRangeMode
    };
  }

  let fromDate = profile.customFrom ? formatTallyDate(profile.customFrom) : getCurrentFinancialYearStart();
  let toDate = profile.customTo ? formatTallyDate(profile.customTo) : getToDate(profile);
  let effectiveMode = profile.dateRangeMode;

  if (profile.dateRangeMode === "full") {
    return {
      fromDate: FULL_BACKUP_START_DATE,
      toDate,
      effectiveMode: "full"
    };
  }

  if (profile.dateRangeMode === "incremental") {
    let lastToDate = null;
    if (profile.id) {
      try {
        const db = options.db || getDatabase();
        lastToDate = await getLastBackupDate(
          db,
          profile.companyId || profile.companyName,
          dataTypeDefinition.id,
          profile.id
        );
      } catch (_error) {
        lastToDate = null;
      }
    }

    if (lastToDate) {
      return {
        fromDate: addDays(lastToDate, 1) || getCurrentFinancialYearStart(),
        toDate,
        effectiveMode: "incremental"
      };
    }

    return {
      fromDate: FULL_BACKUP_START_DATE,
      toDate,
      effectiveMode: "full-first-run"
    };
  }

  if (profile.dateRangeMode === "thisfinancialyear") {
    return {
      fromDate: getCurrentFinancialYearStart(),
      toDate,
      effectiveMode
    };
  }

  if (profile.dateRangeMode === "lastfinancialyear") {
    const range = getLastFinancialYearRange();
    return {
      fromDate: range.from,
      toDate: range.to,
      effectiveMode
    };
  }

  if (profile.dateRangeMode === "custom") {
    fromDate = profile.customFrom ? formatTallyDate(profile.customFrom) : getCurrentFinancialYearStart();
    toDate = profile.customTo ? formatTallyDate(profile.customTo) : getToDate(profile);
    return {
      fromDate,
      toDate,
      effectiveMode
    };
  }

  return {
    fromDate,
    toDate,
    effectiveMode
  };
}

function estimateSizeForType(dataType, recordCount) {
  const bytesPerRecord = SIZE_PER_RECORD[dataType] || 512;
  const estimatedBytes = Math.max(0, recordCount) * bytesPerRecord;
  return {
    dataType,
    recordCount,
    estimatedBytes,
    estimatedKb: Math.ceil(estimatedBytes / 1024),
    estimatedMb: Number((estimatedBytes / (1024 * 1024)).toFixed(2))
  };
}

function extractRecordCount(parsedResult, dataTypeDefinition) {
  if (isTransactionType(dataTypeDefinition)) {
    return Array.isArray(parsedResult.vouchers) ? parsedResult.vouchers.length : 0;
  }
  if (isMasterType(dataTypeDefinition)) {
    return Array.isArray(parsedResult.masters) ? parsedResult.masters.length : 0;
  }
  return 0;
}

async function estimate900BackupSize() {
  const tallyDataPath = String(getSetting("tally_data_path") || "").trim();
  if (!tallyDataPath) {
    return {
      recordCount: 0,
      estimatedBytes: 0,
      warning: "Set Tally data location in Settings for .900 estimate."
    };
  }

  const files = await collect900Files(tallyDataPath);
  let totalBytes = 0;
  for (const file of files) {
    try {
      const fs = require("fs").promises;
      const stats = await fs.stat(file);
      totalBytes += Number(stats.size || 0);
    } catch (_error) {
      // ignore per-file stat error
    }
  }

  return {
    recordCount: files.length,
    estimatedBytes: totalBytes,
    warning: files.length === 0 ? "No .900 files found for estimate." : ""
  };
}

async function estimateBackupSize(profile, options = {}) {
  const normalized = normalizeEstimatorProfile(profile || {});
  if (!normalized.companyName) {
    throw new Error("companyName is required for size estimation.");
  }

  const breakdown = [];
  let totalBytes = 0;

  for (const rawType of normalized.dataTypes) {
    const dataTypeDefinition = resolveDataType(rawType);
    if (!dataTypeDefinition) {
      breakdown.push({
        dataType: rawType,
        recordCount: 0,
        estimatedBytes: 0,
        estimatedKb: 0,
        estimatedMb: 0,
        error: "Unsupported data type"
      });
      continue;
    }

    try {
      if (isFullFileType(dataTypeDefinition)) {
        const estimate900 = await estimate900BackupSize();
        const estimatedBytes = Math.max(0, Number(estimate900.estimatedBytes || 0));
        totalBytes += estimatedBytes;
        breakdown.push({
          dataType: dataTypeDefinition.id,
          recordCount: Number(estimate900.recordCount || 0),
          estimatedBytes,
          estimatedKb: Math.ceil(estimatedBytes / 1024),
          estimatedMb: Number((estimatedBytes / (1024 * 1024)).toFixed(2)),
          fromDate: "",
          toDate: "",
          effectiveMode: "full-900-file",
          warning: estimate900.warning || ""
        });
        continue;
      }

      const { fromDate, toDate, effectiveMode } = await resolveFromDateForType(
        normalized,
        dataTypeDefinition,
        options
      );

      if (String(fromDate) > String(toDate)) {
        breakdown.push({
          dataType: dataTypeDefinition.id,
          recordCount: 0,
          estimatedBytes: 0,
          estimatedKb: 0,
          estimatedMb: 0,
          fromDate,
          toDate,
          effectiveMode,
          warning: "Date range is already up to date."
        });
        continue;
      }

      const parsed = await fetchTallyData({
        dataType: dataTypeDefinition.id,
        companyName: normalized.companyName,
        fromDate,
        toDate,
        host: options.tallyHost || normalized.tallyHost,
        port: options.tallyPort || normalized.tallyPort
      });

      const recordCount = extractRecordCount(parsed, dataTypeDefinition);
      const estimate = estimateSizeForType(dataTypeDefinition.id, recordCount);
      totalBytes += estimate.estimatedBytes;
      breakdown.push({
        ...estimate,
        fromDate,
        toDate,
        effectiveMode
      });
    } catch (error) {
      breakdown.push({
        dataType: dataTypeDefinition.id,
        recordCount: 0,
        estimatedBytes: 0,
        estimatedKb: 0,
        estimatedMb: 0,
        fromDate: "",
        toDate: getToDate(normalized),
        effectiveMode: normalized.dateRangeMode,
        error: error.message
      });
    }
  }

  const summaryFromDate = breakdown
    .map((item) => item.fromDate)
    .filter((value) => typeof value === "string" && value.trim())
    .sort()[0] || "";

  return {
    fromDate: summaryFromDate,
    toDate: getToDate(normalized),
    breakdown,
    totalBytes,
    totalKb: Math.ceil(totalBytes / 1024),
    totalMb: Number((totalBytes / (1024 * 1024)).toFixed(2))
  };
}

module.exports = {
  SIZE_PER_RECORD,
  estimateSizeForType,
  estimateBackupSize
};
