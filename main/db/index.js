const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let db = null;

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
