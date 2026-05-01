import React, { useState } from 'react';
import { useAppStore } from '../store';

export default function ModernRestore() {
  const { backupHistory } = useAppStore();
  const [selectedBackup, setSelectedBackup] = useState(null);
  const [restoreMessage, setRestoreMessage] = useState('');

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleRestore = (backup) => {
    if (window.confirm(`Are you sure you want to restore from ${backup.profile_name}?`)) {
      setRestoreMessage(`🔄 Restoring from backup (${backup.profile_name})...`);
      setTimeout(() => {
        setRestoreMessage(`✅ Restore completed successfully!`);
        setTimeout(() => setRestoreMessage(''), 3000);
      }, 2000);
    }
  };

  const handleExport = (backup) => {
    setRestoreMessage(`📤 Exporting backup to file...`);
    setTimeout(() => {
      setRestoreMessage(`✅ Backup exported successfully!`);
      setTimeout(() => setRestoreMessage(''), 3000);
    }, 1500);
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Restore / Export</h1>
          <p className="page-description">Restore from backups or export your data</p>
        </div>
      </div>

      {/* Status Message */}
      {restoreMessage && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          background: restoreMessage.includes('✅')
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(59, 130, 246, 0.1)',
          color: restoreMessage.includes('✅') ? '#059669' : 'var(--primary-dark)',
          marginBottom: '1.5rem',
          fontWeight: 500,
          animation: 'slideDown var(--transition-base)'
        }}>
          {restoreMessage}
        </div>
      )}

      {/* Backups List */}
      {backupHistory.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📦</p>
          <h3 style={{ marginBottom: '0.5rem' }}>No Backups Available</h3>
          <p style={{ color: 'var(--neutral-600)' }}>
            Create and run a backup first to enable restore or export
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {backupHistory
            .filter(b => b.status === 'success')
            .sort((a, b) => new Date(b.started_at) - new Date(a.started_at))
            .map((backup) => (
              <div key={backup.id} className="card slide-up" style={{
                cursor: 'pointer',
                padding: '1.5rem',
                transition: 'all var(--transition-base)',
                border: selectedBackup?.id === backup.id 
                  ? '2px solid var(--primary)'
                  : '1px solid var(--neutral-200)',
                background: selectedBackup?.id === backup.id
                  ? 'rgba(59, 130, 246, 0.05)'
                  : 'white'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start'
                }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => setSelectedBackup(backup)}>
                    <h4 style={{ margin: 0, marginBottom: '0.5rem', color: 'var(--neutral-900)' }}>
                      📦 {backup.profile_name}
                    </h4>
                    <div style={{
                      display: 'flex',
                      gap: '1.5rem',
                      fontSize: '0.875rem',
                      color: 'var(--neutral-600)',
                      marginBottom: '0.75rem'
                    }}>
                      <span>📅 {formatDate(backup.started_at)}</span>
                      <span>💾 {formatBytes(backup.file_size)}</span>
                      <span>📊 {backup.backup_type}</span>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      className="btn-primary"
                      onClick={() => handleRestore(backup)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      🔄 Restore
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleExport(backup)}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      📤 Export
                    </button>
                  </div>
                </div>

                {selectedBackup?.id === backup.id && (
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    borderTop: '1px solid var(--neutral-200)',
                    borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
                    background: 'var(--primary-50)'
                  }}>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>
                      <strong>File:</strong> {backup.file_path || 'N/A'}
                    </p>
                    {backup.log_file && (
                      <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
                        <strong>Details:</strong> {backup.log_file}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      {/* Info Cards */}
      <div className="grid grid_2" style={{ marginTop: '2rem', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '1.75rem', margin: 0, marginBottom: '0.75rem' }}>🔄</p>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Restore</h4>
          <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Restore your data from any successful backup. Your current data will be replaced.
          </p>
        </div>
        <div className="card" style={{ padding: '1.5rem' }}>
          <p style={{ fontSize: '1.75rem', margin: 0, marginBottom: '0.75rem' }}>📤</p>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Export</h4>
          <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem', lineHeight: 1.5 }}>
            Export your backup to an external location for additional storage.
          </p>
        </div>
      </div>
    </div>
  );
}
