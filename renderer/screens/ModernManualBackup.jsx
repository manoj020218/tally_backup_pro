import React, { useState } from 'react';
import { useAppStore } from '../store';
import { useBackup } from '../hooks/useBackup';
import ModernProgressBar from '../components/ModernProgressBar';
import ModernInput from '../components/ModernInput';

export default function ModernManualBackup() {
  const {
    backupProfiles,
    currentBackup,
    setCurrentBackup,
    resetCurrentBackup,
    addBackupHistory
  } = useAppStore();
  const { startBackup, loading: backupLoading } = useBackup();

  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [backupMessage, setBackupMessage] = useState('');
  const [backupError, setBackupError] = useState('');

  const activeProfiles = backupProfiles.filter(p => p.is_active);

  const handleStartBackup = async () => {
    if (!selectedProfileId) {
      setBackupError('Please select a profile');
      return;
    }

    setBackupError('');
    setBackupMessage('');

    const profile = backupProfiles.find(p => p.id === selectedProfileId);
    if (!profile) return;

    setCurrentBackup({
      running: true,
      progress: 0,
      currentType: `Preparing ${profile.name}...`
    });

    try {
      setBackupMessage(`🚀 Starting backup for ${profile.name}...`);
      
      const result = await startBackup(selectedProfileId);

      const historyItem = {
        id: `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        profile_id: profile.id,
        profile_name: profile.name,
        backup_type: profile.backupType,
        status: result.success ? 'success' : 'failed',
        started_at: result.startedAt || new Date().toISOString(),
        completed_at: result.completedAt || new Date().toISOString(),
        file_size: Number(result.totalSizeBytes || 0),
        file_path: result.filePath || '',
        log_file: result.errors ? result.errors.join(' | ') : ''
      };

      addBackupHistory(historyItem);

      setCurrentBackup({
        running: true,
        progress: 100,
        currentType: 'Backup Complete!'
      });

      if (result.success) {
        setBackupMessage(`✅ Backup completed successfully! File size: ${(result.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`);
      } else {
        setBackupMessage(`⚠️ Backup completed with some warnings. Check the logs for details.`);
      }

      setTimeout(() => {
        resetCurrentBackup();
        setSelectedProfileId('');
      }, 2000);
    } catch (error) {
      setBackupError(`❌ Backup failed: ${error.message}`);
      resetCurrentBackup();
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Manual Backup</h1>
          <p className="page-description">Run a backup on-demand whenever you need it</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="card slide-up" style={{ maxWidth: '600px' }}>
        {/* Status Messages */}
        {backupError && (
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(239, 68, 68, 0.1)',
            color: '#991b1b',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <span>⚠️</span>
            <div>{backupError}</div>
          </div>
        )}

        {backupMessage && (
          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'rgba(16, 185, 129, 0.1)',
            color: '#059669',
            marginBottom: '1.5rem',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <span>✅</span>
            <div>{backupMessage}</div>
          </div>
        )}

        {/* Profile Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: 'var(--neutral-900)'
          }}>
            Select Profile
          </label>
          {activeProfiles.length === 0 ? (
            <div style={{
              padding: '1rem',
              borderRadius: 'var(--radius-lg)',
              background: 'var(--neutral-50)',
              textAlign: 'center',
              color: 'var(--neutral-600)'
            }}>
              No active profiles available. Please create one first.
            </div>
          ) : (
            <select
              value={selectedProfileId}
              onChange={(e) => {
                setSelectedProfileId(e.target.value);
                setBackupError('');
              }}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--neutral-200)',
                fontSize: '0.9375rem',
                fontWeight: 500
              }}
            >
              <option value="">-- Choose a profile --</option>
              {activeProfiles.map(profile => (
                <option key={profile.id} value={profile.id}>
                  {profile.name} ({profile.backupType})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Progress Bar */}
        {currentBackup.running && (
          <ModernProgressBar
            progress={currentBackup.progress}
            label={currentBackup.currentType}
            status="progress"
            size="lg"
          />
        )}

        {/* Start Button */}
        <button
          className="btn-primary"
          onClick={handleStartBackup}
          disabled={backupLoading || !selectedProfileId}
          style={{
            width: '100%',
            fontSize: '1rem',
            padding: '1rem 1.5rem'
          }}
        >
          {backupLoading ? (
            <>🔄 Running Backup...</>
          ) : (
            <>▶️ Start Backup Now</>
          )}
        </button>

        {/* Info */}
        <div style={{
          marginTop: '1.5rem',
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--primary-50)',
          color: 'var(--primary-dark)'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>
            💡 <strong>Tip:</strong> Manual backups run with priority. Your selection will be backed up immediately.
          </p>
        </div>
      </div>

      {/* Features List */}
      <div className="grid grid-3" style={{ marginTop: '2rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>⚡</p>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Instant Backup</h4>
          <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
            Run backups whenever needed
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>🔒</p>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Secure</h4>
          <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
            Encrypted backup with full protection
          </p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>✅</p>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Reliable</h4>
          <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
            Real-time monitoring and logging
          </p>
        </div>
      </div>
    </div>
  );
}
