const BACKUP_DATA_TYPES = {
  TRANSACTIONS: {
    'Sales': 'Sales Invoice',
    'Purchase': 'Purchase Invoice',
    'Receipt': 'Receipt Voucher',
    'Payment': 'Payment Voucher',
    'Journal': 'Journal Voucher',
    'Debit Note': 'Debit Note',
    'Credit Note': 'Credit Note',
    'Stock Journal': 'Stock Journal'
  },
  MASTERS: {
    'ACCOUNTS': 'Chart of Accounts',
    'GODOWNS': 'Godowns/Warehouses',
    'STOCKITEM': 'Stock Items',
    'COSTCENTRE': 'Cost Centre',
    'USERS': 'Users'
  }
};

const BACKUP_MODES = {
  INCREMENTAL: 'incremental',
  CUSTOM_DATE: 'custom',
  FULL: 'full'
};

const BACKUP_SCHEDULE_PRESETS = {
  'daily': '0 2 * * *',
  'weekly': '0 2 ? * MON',
  'monthly': '0 2 1 * *',
  'bi-weekly': '0 2 ? * MON/2'
};

const RETENTION_PERIODS = {
  7: '1 Week',
  14: '2 Weeks',
  30: '1 Month',
  60: '2 Months',
  90: '3 Months',
  365: '1 Year'
};

const BACKUP_STATUS = {
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
  PENDING: 'pending',
  RUNNING: 'running'
};

const LICENSE_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  ENTERPRISE: 'enterprise'
};

module.exports = {
  BACKUP_DATA_TYPES,
  BACKUP_MODES,
  BACKUP_SCHEDULE_PRESETS,
  RETENTION_PERIODS,
  BACKUP_STATUS,
  LICENSE_TIERS
};
