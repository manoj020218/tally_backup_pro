const TRANSACTION_DATA_TYPES = [
  { id: "Sales", tallyVoucherType: "Sales", category: "transaction", incremental: true },
  { id: "Purchase", tallyVoucherType: "Purchase", category: "transaction", incremental: true },
  { id: "Receipt", tallyVoucherType: "Receipt", category: "transaction", incremental: true },
  { id: "Payment", tallyVoucherType: "Payment", category: "transaction", incremental: true },
  { id: "Journal", tallyVoucherType: "Journal", category: "transaction", incremental: true },
  { id: "Credit Note", tallyVoucherType: "Credit Note", category: "transaction", incremental: true },
  { id: "Debit Note", tallyVoucherType: "Debit Note", category: "transaction", incremental: true },
  { id: "Stock Journal", tallyVoucherType: "Stock Journal", category: "transaction", incremental: true },
  { id: "Delivery Note", tallyVoucherType: "Delivery Note", category: "transaction", incremental: true }
];

const MASTER_DATA_TYPES = [
  { id: "STOCKITEM", tallyCollectionId: "Stock Item", category: "master", incremental: false },
  { id: "LEDGER", tallyCollectionId: "Ledger", category: "master", incremental: false },
  { id: "UNIT", tallyCollectionId: "Units", category: "master", incremental: false },
  { id: "STOCKGROUP", tallyCollectionId: "Stock Group", category: "master", incremental: false }
];

const FULL_BACKUP_TYPES = [
  { id: "FULL_900_BACKUP", category: "full", incremental: false }
];

function normalizeTypeId(value) {
  return String(value || "").trim().toLowerCase();
}

function getAllDataTypes() {
  return [...TRANSACTION_DATA_TYPES, ...MASTER_DATA_TYPES, ...FULL_BACKUP_TYPES];
}

function resolveDataType(dataType) {
  const target = normalizeTypeId(dataType);
  return getAllDataTypes().find((item) => normalizeTypeId(item.id) === target) || null;
}

function isTransactionType(dataType) {
  const resolved = typeof dataType === "object" && dataType ? dataType : resolveDataType(dataType);
  return Boolean(resolved && resolved.category === "transaction");
}

function isMasterType(dataType) {
  const resolved = typeof dataType === "object" && dataType ? dataType : resolveDataType(dataType);
  return Boolean(resolved && resolved.category === "master");
}

function isIncrementalType(dataType) {
  const resolved = typeof dataType === "object" && dataType ? dataType : resolveDataType(dataType);
  return Boolean(resolved && resolved.incremental);
}

module.exports = {
  TRANSACTION_DATA_TYPES,
  MASTER_DATA_TYPES,
  FULL_BACKUP_TYPES,
  getAllDataTypes,
  resolveDataType,
  isTransactionType,
  isMasterType,
  isIncrementalType
};

