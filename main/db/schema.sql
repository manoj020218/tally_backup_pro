PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS backup_profiles (
  id             TEXT PRIMARY KEY,
  company_id     TEXT NOT NULL DEFAULT '',
  company_name   TEXT NOT NULL,
  name           TEXT NOT NULL,
  data_types     TEXT NOT NULL DEFAULT '[]',
  schedule_cron  TEXT,
  date_range_mode TEXT NOT NULL DEFAULT 'incremental',
  custom_from    TEXT,
  custom_to      TEXT,
  retention_days INTEGER NOT NULL DEFAULT 30,
  local_path     TEXT NOT NULL,
  gdrive_enabled INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_runs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  profile_id     TEXT NOT NULL,
  profile_name   TEXT,
  backup_type    TEXT,
  started_at     DATETIME NOT NULL,
  completed_at   DATETIME,
  status         TEXT NOT NULL,
  file_path      TEXT,
  file_size      INTEGER NOT NULL DEFAULT 0,
  error_log      TEXT,
  drive_status   TEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS backup_state (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id     TEXT NOT NULL,
  data_type      TEXT NOT NULL,
  profile_id     TEXT NOT NULL,
  last_from_date TEXT,
  last_to_date   TEXT,
  last_run_at    DATETIME,
  last_file_path TEXT,
  record_count   INTEGER NOT NULL DEFAULT 0,
  last_size_kb   INTEGER NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (company_id, data_type, profile_id)
);

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gdrive_auth (
  id            INTEGER PRIMARY KEY CHECK (id = 1),
  access_token  TEXT,
  refresh_token TEXT,
  expiry        DATETIME,
  email         TEXT,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_backup_profiles_active
  ON backup_profiles (is_active);

CREATE INDEX IF NOT EXISTS idx_backup_profiles_company
  ON backup_profiles (company_id, company_name);

CREATE INDEX IF NOT EXISTS idx_backup_runs_profile_started
  ON backup_runs (profile_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_runs_status_started
  ON backup_runs (status, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_backup_state_lookup
  ON backup_state (company_id, data_type, profile_id);

CREATE TRIGGER IF NOT EXISTS trg_backup_profiles_updated_at
AFTER UPDATE ON backup_profiles
FOR EACH ROW
BEGIN
  UPDATE backup_profiles
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_backup_state_updated_at
AFTER UPDATE ON backup_state
FOR EACH ROW
BEGIN
  UPDATE backup_state
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_app_settings_updated_at
AFTER UPDATE ON app_settings
FOR EACH ROW
BEGIN
  UPDATE app_settings
  SET updated_at = CURRENT_TIMESTAMP
  WHERE key = OLD.key;
END;

CREATE TRIGGER IF NOT EXISTS trg_gdrive_auth_updated_at
AFTER UPDATE ON gdrive_auth
FOR EACH ROW
BEGIN
  UPDATE gdrive_auth
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

