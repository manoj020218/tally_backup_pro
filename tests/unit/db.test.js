const Database = require('better-sqlite3');
const { createTables, insertBackupProfile, getBackupProfiles } = require('../../main/db/queries');

describe('Database Queries', () => {
  let db;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new Database(':memory:');
    createTables(db);
  });

  afterEach(() => {
    db.close();
  });

  test('should create tables successfully', () => {
    // Verify tables exist
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const tableNames = tables.map(t => t.name);

    expect(tableNames).toContain('backup_profiles');
    expect(tableNames).toContain('backup_history');
    expect(tableNames).toContain('settings');
  });

  test('should insert and retrieve backup profile', () => {
    const profile = {
      name: 'Test Profile',
      tally_company: 'Test Company',
      backup_type: 'full',
      schedule: 'daily',
      is_active: 1,
      local_path: 'C:\\backups',
      compression: 1
    };

    const id = insertBackupProfile(db, profile);
    expect(id).toBeDefined();

    const profiles = getBackupProfiles(db);
    expect(profiles).toHaveLength(1);
    expect(profiles[0].name).toBe('Test Profile');
    expect(profiles[0].tally_company).toBe('Test Company');
  });

  test('should handle invalid profile data', () => {
    const invalidProfile = {
      // Missing required fields
    };

    expect(() => insertBackupProfile(db, invalidProfile)).toThrow();
  });
});