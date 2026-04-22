const {
  fetchTallyData
} = require("../tally/connector");
const {
  resolveDataType,
  isTransactionType,
  isMasterType
} = require("../tally/data-types");
const { formatTallyDate } = require("../tally/xml-builder");

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

function normalizeEstimatorProfile(profile) {
  return {
    companyName: profile.company_name || profile.companyName || profile.tallyCompany || profile.tally_company || "",
    dataTypes: Array.isArray(profile.data_types)
      ? profile.data_types
      : Array.isArray(profile.dataTypes)
      ? profile.dataTypes
      : ["Sales"],
    customFrom: profile.custom_from || profile.customFrom || "",
    customTo: profile.custom_to || profile.customTo || "",
    tallyHost: profile.tally_host || profile.tallyHost || "127.0.0.1",
    tallyPort: Number.parseInt(profile.tally_port || profile.tallyPort || "9000", 10)
  };
}

function getDateRange(profile) {
  const toDate = profile.customTo ? formatTallyDate(profile.customTo) : formatTallyDate(new Date());
  const fromDate = profile.customFrom ? formatTallyDate(profile.customFrom) : toDate;
  return { fromDate, toDate };
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

async function estimateBackupSize(profile, options = {}) {
  const normalized = normalizeEstimatorProfile(profile || {});
  if (!normalized.companyName) {
    throw new Error("companyName is required for size estimation.");
  }

  const { fromDate, toDate } = getDateRange(normalized);
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
      breakdown.push(estimate);
    } catch (error) {
      breakdown.push({
        dataType: dataTypeDefinition.id,
        recordCount: 0,
        estimatedBytes: 0,
        estimatedKb: 0,
        estimatedMb: 0,
        error: error.message
      });
    }
  }

  return {
    fromDate,
    toDate,
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

