// Mock data for testing
export const mockBackupProfiles = [
  {
    id: 1,
    name: 'Daily Full Backup',
    tally_company: 'ABC Company',
    backup_type: 'full',
    schedule: 'daily',
    is_active: 1,
    local_path: 'C:\\TallyBackups\\ABC',
    compression: 1,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 2,
    name: 'Weekly Incremental',
    tally_company: 'XYZ Ltd',
    backup_type: 'incremental',
    schedule: 'weekly',
    is_active: 1,
    local_path: 'C:\\TallyBackups\\XYZ',
    compression: 0,
    created_at: '2024-01-02T00:00:00Z'
  }
];

export const mockBackupHistory = [
  {
    id: 1,
    profile_id: 1,
    profile_name: 'Daily Full Backup',
    backup_type: 'full',
    status: 'success',
    started_at: '2024-01-15T10:00:00Z',
    completed_at: '2024-01-15T10:05:00Z',
    file_size: 104857600, // 100MB
    file_path: 'C:\\TallyBackups\\ABC\\backup_20240115.zip',
    log_file: 'C:\\TallyBackups\\ABC\\logs\\backup_20240115.log'
  },
  {
    id: 2,
    profile_id: 2,
    profile_name: 'Weekly Incremental',
    backup_type: 'incremental',
    status: 'failed',
    started_at: '2024-01-14T15:00:00Z',
    completed_at: '2024-01-14T15:02:00Z',
    file_size: null,
    file_path: null,
    log_file: 'C:\\TallyBackups\\XYZ\\logs\\backup_20240114.log'
  }
];

export const mockSettings = {
  tallyPort: 9000,
  companyName: 'Test Company',
  backupInterval: 60,
  gdriveFolderId: '1A2B3C4D5E6F7G8H9I0J',
  autoSync: true,
  notifications: true
};

export const mockTallyStatus = {
  connected: true,
  company: 'ABC Company',
  lastSync: '2024-01-15T10:00:00Z',
  version: 'Tally.ERP 9 Release 6.6.3'
};

export const mockGDriveStatus = {
  connected: true,
  email: 'user@example.com',
  quota: {
    used: 2147483648, // 2GB
    total: 16106127360 // 15GB
  }
};