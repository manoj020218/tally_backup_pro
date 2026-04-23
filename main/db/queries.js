const { getDatabase } = require('./index');

function getAllBackupProfiles() {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM backup_profiles WHERE is_active = 1').all();
  return rows;
}

function getBackupProfileById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM backup_profiles WHERE id = ?').get(id);
}

function createBackupProfile(profile) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO backup_profiles (id, company_id, name, data_types, schedule_cron, date_range_mode, custom_from, custom_to, retention_days, local_path, gdrive_enabled, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const id = require('uuid').v4();
  stmt.run(id, profile.company_id, profile.name, JSON.stringify(profile.data_types), profile.schedule_cron, profile.date_range_mode, profile.custom_from, profile.custom_to, profile.retention_days, profile.local_path, profile.gdrive_enabled ? 1 : 0, profile.is_active ? 1 : 0);
  return getBackupProfileById(id);
}

function updateBackupProfile(id, updates) {
  const db = getDatabase();
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    fields.push(`${key} = ?`);
    values.push(key === 'data_types' ? JSON.stringify(value) : value);
  }
  values.push(id);
  const stmt = db.prepare(`UPDATE backup_profiles SET ${fields.join(', ')} WHERE id = ?`);
  stmt.run(...values);
  return getBackupProfileById(id);
}

function deleteBackupProfile(id) {
  const db = getDatabase();
  return db.prepare('DELETE FROM backup_profiles WHERE id = ?').run(id);
}

function getSetting(key) {
  const db = getDatabase();
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  const db = getDatabase();
  db.prepare('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)').run(key, value);
}

module.exports = {
  getAllBackupProfiles,
  getBackupProfileById,
  createBackupProfile,
  updateBackupProfile,
  deleteBackupProfile,
  getSetting,
  setSetting
};