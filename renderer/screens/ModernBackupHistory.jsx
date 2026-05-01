import React, { useState } from 'react';
import { useAppStore } from '../store';

export default function ModernBackupHistory() {
  const { backupHistory } = useAppStore();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

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

  const getStatusColor = (status) => {
    const colors = {
      success: { bg: 'rgba(16, 185, 129, 0.1)', text: '#059669', icon: '✅' },
      failed: { bg: 'rgba(239, 68, 68, 0.1)', text: '#991b1b', icon: '❌' },
      warning: { bg: 'rgba(245, 158, 11, 0.1)', text: '#92400e', icon: '⚠️' }
    };
    return colors[status] || colors.warning;
  };

  const filteredBackups = backupHistory
    .filter(b => filterStatus === 'all' || b.status === filterStatus)
    .filter(b => b.profile_name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.started_at) - new Date(a.started_at));

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Backup History</h1>
          <p className="page-description">View all your backup operations and their details</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-end',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1, minWidth: '250px' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--neutral-900)'
          }}>
            Search Profile
          </label>
          <input
            type="text"
            placeholder="Search by profile name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--neutral-200)',
              fontSize: '0.9375rem'
            }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--neutral-900)'
          }}>
            Filter by Status
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              border: '1.5px solid var(--neutral-200)',
              fontSize: '0.9375rem',
              minWidth: '150px'
            }}
          >
            <option value="all">All Status</option>
            <option value="success">✅ Success</option>
            <option value="failed">❌ Failed</option>
            <option value="warning">⚠️ Warning</option>
          </select>
        </div>
      </div>

      {/* Backup List */}
      {filteredBackups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
          <p style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>📜</p>
          <h3 style={{ marginBottom: '0.5rem' }}>No Backups Found</h3>
          <p style={{ color: 'var(--neutral-600)' }}>
            {backupHistory.length === 0 
              ? 'You haven\'t run any backups yet. Get started by running a manual backup!'
              : 'No backups match your search criteria.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredBackups.map((backup) => {
            const statusColor = getStatusColor(backup.status);
            const duration = new Date(backup.completed_at) - new Date(backup.started_at);
            const durationSeconds = Math.round(duration / 1000);

            return (
              <div key={backup.id} className="card slide-up" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1.5rem'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{
                      fontSize: '1.75rem'
                    }}>
                      {statusColor.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, marginBottom: '0.25rem', color: 'var(--neutral-900)' }}>
                        {backup.profile_name}
                      </h4>
                      <p style={{
                        margin: 0,
                        fontSize: '0.875rem',
                        color: 'var(--neutral-600)',
                        marginBottom: '0.5rem'
                      }}>
                        {formatDate(backup.started_at)}
                      </p>
                      <div style={{
                        display: 'flex',
                        gap: '1.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--neutral-700)'
                      }}>
                        <span>📊 {backup.backup_type}</span>
                        <span>💾 {formatBytes(backup.file_size)}</span>
                        <span>⏱️ {durationSeconds}s</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center'
                }}>
                  <div style={{
                    padding: '0.5rem 1rem',
                    borderRadius: 'var(--radius-lg)',
                    background: statusColor.bg,
                    color: statusColor.text,
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    whiteSpace: 'nowrap'
                  }}>
                    {backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                  </div>

                  {backup.log_file && (
                    <button
                      className="btn-ghost"
                      title={backup.log_file}
                      style={{
                        padding: '0.5rem',
                        fontSize: '1rem'
                      }}
                    >
                      📋
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats Footer */}
      {backupHistory.length > 0 && (
        <div className="grid grid-3" style={{ marginTop: '2rem', gap: '1rem' }}>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--primary)' }}>
              {backupHistory.length}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
              Total Backups
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--success)' }}>
              {backupHistory.filter(b => b.status === 'success').length}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
              Successful
            </p>
          </div>
          <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--danger)' }}>
              {backupHistory.filter(b => b.status === 'failed').length}
            </p>
            <p style={{ margin: '0.5rem 0 0 0', color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
              Failed
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
