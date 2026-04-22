import React from 'react';
import { useTallyStatus } from '../hooks/useTallyStatus';
import { useAppStore } from '../store';
import StatusBadge from '../components/StatusBadge';
import BackupProgressBar from '../components/BackupProgressBar';

export default function Dashboard() {
  const { status: tallyStatus, loading: tallyLoading } = useTallyStatus();
  const {
    backupProfiles,
    backupHistory,
    currentBackup,
    gdriveStatus
  } = useAppStore();

  const activeProfiles = backupProfiles.filter(p => p.is_active);
  const recentBackups = backupHistory.slice(0, 5);

  return (
    <div className="container">
      <header className="card card-header">
        <h1>TallyBackup Pro</h1>
        <div className="flex gap-4">
          <StatusBadge
            status={tallyStatus.connected ? 'success' : 'danger'}
            text={tallyStatus.connected ? 'Tally Connected' : 'Tally Disconnected'}
          />
          <StatusBadge
            status={gdriveStatus.connected ? 'success' : 'warning'}
            text={gdriveStatus.connected ? 'Drive Connected' : 'Drive Not Connected'}
          />
        </div>
      </header>

      <div className="grid">
        <div className="card">
          <h3>Backup Profiles</h3>
          <p>{activeProfiles.length} active profiles</p>
          <div className="mt-4">
            {activeProfiles.map(profile => (
              <div key={profile.id} className="flex justify-between items-center py-2 border-b">
                <span>{profile.name}</span>
                <button className="btn-primary">Run Backup</button>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>Recent Backups</h3>
          <div className="mt-4">
            {recentBackups.length === 0 ? (
              <p className="text-gray-500">No recent backups</p>
            ) : (
              recentBackups.map(backup => (
                <div key={backup.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <div className="font-medium">{backup.profile_name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(backup.started_at).toLocaleString()}
                    </div>
                  </div>
                  <StatusBadge
                    status={backup.status === 'success' ? 'success' : 'danger'}
                    text={backup.status}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {currentBackup.running && (
          <div className="card">
            <h3>Backup in Progress</h3>
            <BackupProgressBar
              progress={currentBackup.progress}
              currentType={currentBackup.currentType}
            />
          </div>
        )}
      </div>
    </div>
  );
}