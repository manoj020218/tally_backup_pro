const { getBackupState, updateBackupState: updateBackupStateDB } = require('../db/queries');

async function getLastBackupDate(db, companyId, dataType, profileId) {
  try {
    const state = getBackupState(companyId, dataType, profileId);
    return state ? state.last_to_date : null;
  } catch (error) {
    console.error('Failed to get last backup date:', error);
    return null;
  }
}

async function updateBackupState(db, backupData) {
  try {
    updateBackupStateDB(
      backupData.companyId,
      backupData.dataType,
      backupData.profileId,
      {
        last_from_date: backupData.lastFromDate,
        last_to_date: backupData.lastToDate,
        last_run_at: new Date().toISOString(),
        record_count: backupData.recordCount,
        last_size_kb: backupData.sizeKb
      }
    );
  } catch (error) {
    console.error('Failed to update backup state:', error);
  }
}

module.exports = {
  getLastBackupDate,
  updateBackupState
};
