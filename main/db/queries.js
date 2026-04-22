const { getDatabase } = require('./index');

function getAllBackupProfiles() {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM backup_profiles WHERE is_active = 1');
  return stmt.all();
}

function getBackupProfileById(id) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT * FROM backup_profiles WHERE id = ?');
  return stmt.get(id);
}

function createBackupProfile(profile) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO backup_profiles 
    (id, company_id, company_name, name, data_types, schedule_cron, date_range_mode, 
     custom_from, custom_to, retention_days, local_path, gdrive_enabled, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  return stmt.run(
    profile.id, profile.company_id, profile.company_name, profile.name,
    JSON.stringify(profile.data_types), profile.schedule_cron, profile.date_range_mode,
    profile.custom_from, profile.custom_to, profile.retention_days, profile.local_path,
    profile.gdrive_enabled, 1
  );
}

function updateBackupProfile(id, updates) {
  const db = getDatabase();
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const stmt = db.prepare(`UPDATE backup_profiles SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`);
  return stmt.run(...Object.values(updates), id);
}

function deleteBackupProfile(id) {
  const db = getDatabase();
  const stmt = db.prepare('DELETE FROM backup_profiles WHERE id = ?');
  return stmt.run(id);
}

function getBackupHistory(profileId, limit = 50) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM backup_runs WHERE profile_id = ? ORDER BY started_at DESC LIMIT ?
  `);
  return stmt.all(profileId, limit);
}

function getAllBackupRuns(limit = 100) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM backup_runs ORDER BY started_at DESC LIMIT ?
  `);
  return stmt.all(limit);
}

function getBackupState(companyId, dataType, profileId) {
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM backup_state WHERE company_id = ? AND data_type = ? AND profile_id = ?
  `);
  return stmt.get(companyId, dataType, profileId);
}

function updateBackupState(companyId, dataType, profileId, state) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO backup_state (company_id, data_type, profile_id, last_from_date, last_to_date, last_run_at, record_count, last_size_kb)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(company_id, data_type, profile_id) DO UPDATE SET
      last_from_date = excluded.last_from_date,
      last_to_date = excluded.last_to_date,
      last_run_at = excluded.last_run_at,
      record_count = excluded.record_count,
      last_size_kb = excluded.last_size_kb,
      updated_at = CURRENT_TIMESTAMP
  `);
  
  return stmt.run(
    companyId, dataType, profileId,
    state.last_from_date, state.last_to_date, state.last_run_at,
    state.record_count, state.last_size_kb
  );
}

function getSetting(key) {
  const db = getDatabase();
  const stmt = db.prepare('SELECT value FROM app_settings WHERE key = ?');
  const result = stmt.get(key);
  return result ? result.value : null;
}

function setSetting(key, value) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO app_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);
  return stmt.run(key, value);
}

module.exports = {
  getAllBackupProfiles,
  getBackupProfileById,
  createBackupProfile,
  updateBackupProfile,
  deleteBackupProfile,
  getBackupHistory,
  getAllBackupRuns,
  getBackupState,
  updateBackupState,
  getSetting,
  setSetting
};
