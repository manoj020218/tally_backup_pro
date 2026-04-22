const { runBackup, validateBackupProfile } = require('../../main/backup/engine');
const { mockBackupProfiles } = require('../mocks/data');

describe('Backup Engine Integration', () => {
  let mockDb;
  let mockTallyConnector;
  let mockCompressor;

  beforeEach(() => {
    // Mock database
    mockDb = {
      prepare: jest.fn().mockReturnValue({
        run: jest.fn(),
        get: jest.fn(),
        all: jest.fn()
      })
    };

    // Mock Tally connector
    mockTallyConnector = {
      connect: jest.fn().mockResolvedValue(true),
      getCompanyData: jest.fn().mockResolvedValue({
        name: 'Test Company',
        data: '<ENVELOPE><HEADER><TALLYREQUEST>Export Data</TALLYREQUEST></HEADER></ENVELOPE>'
      }),
      disconnect: jest.fn()
    };

    // Mock compressor
    mockCompressor = {
      compress: jest.fn().mockResolvedValue({
        filePath: 'C:\\backups\\test_backup.zip',
        size: 1048576
      })
    };
  });

  test('should validate backup profile successfully', () => {
    const profile = mockBackupProfiles[0];

    const result = validateBackupProfile(profile);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject invalid backup profile', () => {
    const invalidProfile = {
      name: '',
      tally_company: '',
      backup_type: 'invalid'
    };

    const result = validateBackupProfile(invalidProfile);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('should run full backup successfully', async () => {
    const profile = mockBackupProfiles[0];

    const result = await runBackup(profile, {
      db: mockDb,
      tallyConnector: mockTallyConnector,
      compressor: mockCompressor
    });

    expect(result.success).toBe(true);
    expect(result.filePath).toBeDefined();
    expect(result.size).toBeGreaterThan(0);
    expect(mockTallyConnector.connect).toHaveBeenCalled();
    expect(mockTallyConnector.getCompanyData).toHaveBeenCalled();
    expect(mockCompressor.compress).toHaveBeenCalled();
  });

  test('should handle backup failure gracefully', async () => {
    mockTallyConnector.connect.mockRejectedValue(new Error('Connection failed'));

    const profile = mockBackupProfiles[0];

    const result = await runBackup(profile, {
      db: mockDb,
      tallyConnector: mockTallyConnector,
      compressor: mockCompressor
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(mockTallyConnector.connect).toHaveBeenCalled();
    expect(mockCompressor.compress).not.toHaveBeenCalled();
  });

  test('should run incremental backup', async () => {
    const profile = mockBackupProfiles[1]; // incremental profile

    const result = await runBackup(profile, {
      db: mockDb,
      tallyConnector: mockTallyConnector,
      compressor: mockCompressor
    });

    expect(result.success).toBe(true);
    expect(result.backupType).toBe('incremental');
  });

  test('should update backup history on completion', async () => {
    const profile = mockBackupProfiles[0];

    await runBackup(profile, {
      db: mockDb,
      tallyConnector: mockTallyConnector,
      compressor: mockCompressor
    });

    expect(mockDb.prepare).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO backup_history')
    );
  });
});