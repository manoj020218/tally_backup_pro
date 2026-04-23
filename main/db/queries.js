const { v4: uuidv4 } = require("uuid");
const { getDatabase } = require("./index");

const ALLOWED_PROFILE_COLUMNS = new Set([
  "company_id",
  "company_name",
  "name",
  "data_types",
  "schedule_cron",
  "date_range_mode",
  "custom_from",
  "custom_to",
  "retention_days",
  "local_path",
  "gdrive_enabled",
  "is_active"
]);

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

function normalizeDataTypes(value, defaultValue = ["Sales"]) {
  if (Array.isArray(value)) {
    const filtered = value
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    return filtered.length > 0 ? filtered : defaultValue;
  }

  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => String(item || "").trim())
          .filter(Boolean);
      }
    } catch (_error) {
      // Keep default when JSON parse fails.
    }
  }

  return defaultValue;
}

function normalizeDateRangeMode(value, defaultValue = "incremental") {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "full" ||
    normalized === "incremental" ||
    normalized === "thisfinancialyear" ||
    normalized === "lastfinancialyear" ||
    normalized === "custom"
  ) {
    return normalized;
  }
  return defaultValue;
}

function normalizeBackupProfileInput(input = {}, options = {}) {
  const { isUpdate = false } = options;
  const payload = {};

  const companyId = String(
    input.company_id ??
      input.companyId ??
      input.tally_company ??
      input.tallyCompany ??
      ""
  ).trim();

  const companyName = String(
    input.company_name ??
      input.companyName ??
      input.tallyCompany ??
      input.tally_company ??
      ""
  ).trim();

  const name = String(input.name ?? "").trim();
  const dataTypes = normalizeDataTypes(input.data_types ?? input.dataTypes, ["Sales"]);
  const scheduleCron = String(input.schedule_cron ?? input.scheduleCron ?? "").trim();
  const dateRangeMode = normalizeDateRangeMode(
    input.date_range_mode ?? input.dateRangeMode ?? input.backupType,
    "incremental"
  );
  const customFrom = String(input.custom_from ?? input.customFrom ?? "").trim();
  const customTo = String(input.custom_to ?? input.customTo ?? "").trim();
  const retentionDays = Math.max(
    1,
    parseInteger(input.retention_days ?? input.retentionDays, 30)
  );
  const localPath = String(input.local_path ?? input.localPath ?? "").trim();
  const gdriveEnabled = parseBoolean(
    input.gdrive_enabled ?? input.gdriveEnabled,
    false
  );
  const isActive = parseBoolean(input.is_active ?? input.isActive, true);

  if (!isUpdate || input.company_id !== undefined || input.companyId !== undefined || input.tally_company !== undefined) {
    payload.company_id = companyId;
  }
  if (
    !isUpdate ||
    input.company_name !== undefined ||
    input.companyName !== undefined ||
    input.tallyCompany !== undefined ||
    input.tally_company !== undefined
  ) {
    payload.company_name = companyName;
  }
  if (!isUpdate || input.name !== undefined) {
    payload.name = name;
  }
  if (!isUpdate || input.data_types !== undefined || input.dataTypes !== undefined) {
    payload.data_types = JSON.stringify(dataTypes);
  }
  if (!isUpdate || input.schedule_cron !== undefined || input.scheduleCron !== undefined) {
    payload.schedule_cron = scheduleCron || null;
  }
  if (
    !isUpdate ||
    input.date_range_mode !== undefined ||
    input.dateRangeMode !== undefined ||
    input.backupType !== undefined
  ) {
    payload.date_range_mode = dateRangeMode;
  }
  if (!isUpdate || input.custom_from !== undefined || input.customFrom !== undefined) {
    payload.custom_from = customFrom || null;
  }
  if (!isUpdate || input.custom_to !== undefined || input.customTo !== undefined) {
    payload.custom_to = customTo || null;
  }
  if (!isUpdate || input.retention_days !== undefined || input.retentionDays !== undefined) {
    payload.retention_days = retentionDays;
  }
  if (!isUpdate || input.local_path !== undefined || input.localPath !== undefined) {
    payload.local_path = localPath;
  }
  if (
    !isUpdate ||
    input.gdrive_enabled !== undefined ||
    input.gdriveEnabled !== undefined
  ) {
    payload.gdrive_enabled = gdriveEnabled ? 1 : 0;
  }
  if (!isUpdate || input.is_active !== undefined || input.isActive !== undefined) {
    payload.is_active = isActive ? 1 : 0;
  }

  return payload;
}

function validateCreatePayload(payload) {
  if (!payload.name) throw new Error("Profile name is required.");
  if (!payload.company_name) throw new Error("Tally company is required.");
  if (!payload.local_path) throw new Error("Local backup path is required.");
}

function filterAllowedProfileColumns(payload) {
  return Object.fromEntries(
    Object.entries(payload).filter(([key]) => ALLOWED_PROFILE_COLUMNS.has(key))
  );
}

function getAllBackupProfiles() {
  const db = getDatabase();
  return db
    .prepare("SELECT * FROM backup_profiles ORDER BY created_at DESC")
    .all();
}

function getBackupProfileById(id) {
  const db = getDatabase();
  return db.prepare("SELECT * FROM backup_profiles WHERE id = ?").get(id);
}

function createBackupProfile(profile) {
  const db = getDatabase();
  const id = uuidv4();
  const payload = filterAllowedProfileColumns(
    normalizeBackupProfileInput(profile, { isUpdate: false })
  );
  validateCreatePayload(payload);

  const stmt = db.prepare(`
    INSERT INTO backup_profiles (
      id,
      company_id,
      company_name,
      name,
      data_types,
      schedule_cron,
      date_range_mode,
      custom_from,
      custom_to,
      retention_days,
      local_path,
      gdrive_enabled,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    payload.company_id || "",
    payload.company_name,
    payload.name,
    payload.data_types || "[]",
    payload.schedule_cron || null,
    payload.date_range_mode || "incremental",
    payload.custom_from || null,
    payload.custom_to || null,
    payload.retention_days || 30,
    payload.local_path,
    payload.gdrive_enabled ?? 0,
    payload.is_active ?? 1
  );

  return getBackupProfileById(id);
}

function updateBackupProfile(id, updates = {}) {
  const db = getDatabase();
  const payload = filterAllowedProfileColumns(
    normalizeBackupProfileInput(updates, { isUpdate: true })
  );

  const entries = Object.entries(payload);
  if (entries.length === 0) {
    return getBackupProfileById(id);
  }

  const assignments = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value);
  values.push(id);

  const stmt = db.prepare(`UPDATE backup_profiles SET ${assignments} WHERE id = ?`);
  stmt.run(...values);

  return getBackupProfileById(id);
}

function deleteBackupProfile(id) {
  const db = getDatabase();
  return db.prepare("DELETE FROM backup_profiles WHERE id = ?").run(id);
}

function getBackupRuns(limit = 200) {
  const db = getDatabase();
  const safeLimit = Math.max(1, Math.min(parseInteger(limit, 200), 2000));
  return db
    .prepare("SELECT * FROM backup_runs ORDER BY started_at DESC LIMIT ?")
    .all(safeLimit);
}

function getBackupState(companyId, dataType, profileId) {
  const db = getDatabase();
  return db
    .prepare(
      `SELECT * FROM backup_state
       WHERE company_id = ? AND data_type = ? AND profile_id = ?`
    )
    .get(companyId, dataType, profileId);
}

function updateBackupState(companyId, dataType, profileId, updates = {}) {
  const db = getDatabase();
  const existing = getBackupState(companyId, dataType, profileId);

  const payload = {
    last_from_date: updates.last_from_date || null,
    last_to_date: updates.last_to_date || null,
    last_run_at: updates.last_run_at || new Date().toISOString(),
    last_file_path: updates.last_file_path || null,
    record_count: Number.parseInt(String(updates.record_count ?? "0"), 10) || 0,
    last_size_kb: Number.parseInt(String(updates.last_size_kb ?? "0"), 10) || 0
  };

  if (existing) {
    db.prepare(
      `UPDATE backup_state
       SET last_from_date = ?,
           last_to_date = ?,
           last_run_at = ?,
           last_file_path = ?,
           record_count = ?,
           last_size_kb = ?
       WHERE company_id = ? AND data_type = ? AND profile_id = ?`
    ).run(
      payload.last_from_date,
      payload.last_to_date,
      payload.last_run_at,
      payload.last_file_path,
      payload.record_count,
      payload.last_size_kb,
      companyId,
      dataType,
      profileId
    );
  } else {
    db.prepare(
      `INSERT INTO backup_state (
        company_id,
        data_type,
        profile_id,
        last_from_date,
        last_to_date,
        last_run_at,
        last_file_path,
        record_count,
        last_size_kb
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      companyId,
      dataType,
      profileId,
      payload.last_from_date,
      payload.last_to_date,
      payload.last_run_at,
      payload.last_file_path,
      payload.record_count,
      payload.last_size_kb
    );
  }

  return getBackupState(companyId, dataType, profileId);
}

function getSetting(key) {
  const db = getDatabase();
  const row = db.prepare("SELECT value FROM app_settings WHERE key = ?").get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  const db = getDatabase();
  db.prepare("INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)").run(key, value);
}

module.exports = {
  getAllBackupProfiles,
  getBackupProfileById,
  createBackupProfile,
  updateBackupProfile,
  deleteBackupProfile,
  getBackupRuns,
  getBackupState,
  updateBackupState,
  getSetting,
  setSetting
};
