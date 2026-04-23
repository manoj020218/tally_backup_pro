const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let db = null;

function ensureColumns(database, tableName, columns = {}) {
  const tableInfo = database.prepare(`PRAGMA table_info(${tableName})`).all();
  const existing = new Set(tableInfo.map((row) => row.name));

  Object.entries(columns).forEach(([column, definition]) => {
    if (existing.has(column)) return;
    database.exec(`ALTER TABLE ${tableName} ADD COLUMN ${column} ${definition}`);
  });
}

function ensureSchemaCompatibility(database) {
  ensureColumns(database, "backup_profiles", {
    company_id: "TEXT NOT NULL DEFAULT ''",
    date_range_mode: "TEXT NOT NULL DEFAULT 'incremental'",
    custom_from: "TEXT",
    custom_to: "TEXT",
    retention_days: "INTEGER NOT NULL DEFAULT 30",
    gdrive_enabled: "INTEGER NOT NULL DEFAULT 0"
  });

  ensureColumns(database, "backup_runs", {
    file_size: "INTEGER NOT NULL DEFAULT 0",
    error_log: "TEXT",
    drive_status: "TEXT"
  });

  ensureColumns(database, "backup_state", {
    profile_id: "TEXT NOT NULL DEFAULT ''",
    record_count: "INTEGER NOT NULL DEFAULT 0",
    last_size_kb: "INTEGER NOT NULL DEFAULT 0"
  });
}

async function initDatabase() {
  try {
    const userDataPath = app.getPath('userData');
    const dbPath = path.join(userDataPath, 'tallybackup.db');

    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }

    db = new Database(dbPath);
    db.pragma('foreign_keys = ON');
    
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    ensureSchemaCompatibility(db);

    console.log('Database initialized successfully at:', dbPath);
    return db;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.');
  }
  return db;
}

async function closeDatabase() {
  try {
    if (db) {
      db.close();
      db = null;
      console.log('Database closed successfully');
    }
  } catch (error) {
    console.error('Error closing database:', error);
    throw error;
  }
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase
};
