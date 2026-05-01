import React, { useState } from "react";
import { useTallyStatus } from "../hooks/useTallyStatus";
import { useAppStore } from "../store";
import { useBackup } from "../hooks/useBackup";
import StatCard from "../components/StatCard";
import ActionCard from "../components/ActionCard";
import ModernProgressBar from "../components/ModernProgressBar";

export default function ModernDashboard() {
  const { status: tallyStatus } = useTallyStatus();
  const {
    backupProfiles,
    backupHistory,
    currentBackup,
    gdriveStatus,
    setCurrentBackup,
    resetCurrentBackup,
    addBackupHistory
  } = useAppStore();
  const { startBackup, loading: backupLoading } = useBackup();

  const [runMessage, setRunMessage] = useState("");
  const [activeRunProfileId, setActiveRunProfileId] = useState("");

  const activeProfiles = backupProfiles.filter((profile) => profile.is_active);
  const recentBackups = backupHistory.slice(0, 5);
  
  const successfulBackups = backupHistory.filter(b => b.status === "success").length;
  const totalBackupSize = backupHistory.reduce((sum, b) => sum + (b.file_size || 0), 0);
  const avgBackupTime = backupHistory.length > 0 
    ? Math.round(backupHistory.reduce((sum, b) => {
        const start = new Date(b.started_at);
        const end = new Date(b.completed_at);
        return sum + (end - start) / 1000;
      }, 0) / backupHistory.length)
    : 0;

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  async function handleRunBackup(profile) {
    setRunMessage("");
    setActiveRunProfileId(profile.id);
    setCurrentBackup({
      running: true,
      progress: 20,
      currentType: `Running ${profile.name}`
    });

    try {
      const result = await startBackup(profile.id);
      
      // Map result to history format
      const historyItem = {
        id: `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        profile_id: profile.id,
        profile_name: profile.name,
        backup_type: profile.backupType || "incremental",
        status: result.status || (result.success ? "success" : "failed"),
        started_at: result.startedAt || new Date().toISOString(),
        completed_at: result.completedAt || new Date().toISOString(),
        file_size: Number(result.totalSizeBytes || 0),
        file_path: Array.isArray(result.results)
          ? result.results.find((item) => item.filePath)?.filePath || ""
          : "",
        log_file: Array.isArray(result.results)
          ? result.results.filter((item) => !item.success).map((item) => item.error).filter(Boolean).join(" | ")
          : ""
      };

      addBackupHistory(historyItem);
      
      setCurrentBackup({
        running: true,
        progress: 100,
        currentType: "Completed"
      });

      if (result.queued) {
        setRunMessage(`✅ Tally disconnected for ${profile.name}. XML backup queued; fallback attempted.`);
      } else if (result.success) {
        setRunMessage(`✅ Backup completed successfully for ${profile.name}!`);
      } else {
        setRunMessage(`⚠️ Backup finished with issues for ${profile.name}.`);
      }
    } catch (error) {
      setRunMessage(`❌ Backup failed for ${profile.name}: ${error.message}`);
    } finally {
      setActiveRunProfileId("");
      setTimeout(() => resetCurrentBackup(), 2000);
    }
  }

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header">
        <div className="page-title">
          <div>
            <h1>Dashboard</h1>
            <p className="page-description">Welcome back! Here's your backup overview</p>
          </div>
          <div style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              background: tallyStatus.connected 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(239, 68, 68, 0.1)',
              color: tallyStatus.connected ? '#059669' : '#991b1b'
            }}>
              <span>{tallyStatus.connected ? '🟢' : '🔴'}</span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {tallyStatus.connected ? 'Tally Connected' : 'Tally Disconnected'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: 'var(--radius-lg)',
              background: gdriveStatus.connected 
                ? 'rgba(16, 185, 129, 0.1)' 
                : 'rgba(245, 158, 11, 0.1)',
              color: gdriveStatus.connected ? '#059669' : '#92400e'
            }}>
              <span>{gdriveStatus.connected ? '☁️' : '⚠️'}</span>
              <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                {gdriveStatus.connected ? 'Drive Connected' : 'Drive Not Connected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Status Message */}
      {runMessage && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          background: runMessage.includes('✅') 
            ? 'rgba(16, 185, 129, 0.1)'
            : runMessage.includes('❌')
            ? 'rgba(239, 68, 68, 0.1)'
            : 'rgba(245, 158, 11, 0.1)',
          color: runMessage.includes('✅')
            ? '#059669'
            : runMessage.includes('❌')
            ? '#991b1b'
            : '#92400e',
          marginBottom: '1.5rem',
          fontWeight: 500,
          animation: 'slideDown var(--transition-base)'
        }}>
          {runMessage}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-4" style={{ marginBottom: '2rem' }}>
        <StatCard
          icon="💾"
          label="Active Profiles"
          value={activeProfiles.length}
          color="primary"
        />
        <StatCard
          icon="✅"
          label="Successful Backups"
          value={successfulBackups}
          trend={10}
          color="success"
        />
        <StatCard
          icon="💾"
          label="Total Backup Size"
          value={formatBytes(totalBackupSize)}
          color="accent"
        />
        <StatCard
          icon="⏱️"
          label="Avg Backup Time"
          value={formatTime(avgBackupTime)}
          color="warning"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-2" style={{ marginBottom: '2rem' }}>
        {/* Quick Backup */}
        <div className="card slide-up">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '1.75rem' }}>⚡</div>
            <div>
              <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>Quick Backup</h3>
              <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
                Run your active profiles
              </p>
            </div>
          </div>

          {currentBackup.running && (
            <ModernProgressBar 
              progress={currentBackup.progress}
              label={currentBackup.currentType}
              status="progress"
            />
          )}

          <div style={{
            display: 'grid',
            gridTemplateColumns: activeProfiles.length > 1 ? '1fr 1fr' : '1fr',
            gap: '0.75rem'
          }}>
            {activeProfiles.length === 0 ? (
              <p style={{ color: 'var(--neutral-600)', textAlign: 'center', gridColumn: '1/-1' }}>
                No active profiles available. <br/>
                <span style={{ fontSize: '0.9rem' }}>Create a profile in Backup Profiles to get started</span>
              </p>
            ) : (
              activeProfiles.map((profile) => (
                <button
                  key={profile.id}
                  className="btn-primary"
                  disabled={backupLoading}
                  onClick={() => handleRunBackup(profile)}
                  style={{ width: '100%' }}
                >
                  {backupLoading && activeRunProfileId === profile.id ? (
                    <>🔄 Running...</>
                  ) : (
                    <>▶️ {profile.name}</>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Active Profiles */}
        <div className="card slide-up">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{ fontSize: '1.75rem' }}>💾</div>
            <div>
              <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>
                Active Profiles
              </h3>
              <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
                {activeProfiles.length} profiles ready
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflow: 'auto' }}>
            {activeProfiles.length === 0 ? (
              <p style={{ color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
                Create a profile to get started
              </p>
            ) : (
              activeProfiles.map((profile) => (
                <div
                  key={profile.id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--neutral-50)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    border: '1px solid var(--neutral-200)',
                    transition: 'all var(--transition-base)'
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: 'var(--neutral-900)' }}>
                      {profile.name}
                    </p>
                    <p style={{ 
                      margin: '0.25rem 0 0 0',
                      fontSize: '0.8rem',
                      color: 'var(--neutral-600)'
                    }}>
                      {profile.backupType || 'incremental'} • 
                      {profile.is_active ? ' Active' : ' Inactive'}
                    </p>
                  </div>
                  <span style={{ fontSize: '1rem' }}>→</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Recent Backups */}
      <div className="card slide-up">
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ fontSize: '1.75rem' }}>📜</div>
          <div>
            <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>Recent Backups</h3>
            <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
              Last {recentBackups.length} backup operations
            </p>
          </div>
        </div>

        {recentBackups.length === 0 ? (
          <p style={{ color: 'var(--neutral-600)', textAlign: 'center', padding: '2rem 0' }}>
            No backups yet. Run a backup to get started! 🚀
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {recentBackups.map((backup) => (
              <div
                key={backup.id}
                style={{
                  padding: '1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--neutral-200)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all var(--transition-base)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ 
                    margin: 0, 
                    fontWeight: 600,
                    color: 'var(--neutral-900)',
                    marginBottom: '0.5rem'
                  }}>
                    {backup.profile_name}
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: '0.8rem',
                    color: 'var(--neutral-600)'
                  }}>
                    {new Date(backup.started_at).toLocaleString()}
                  </p>
                </div>
                <div style={{
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'center'
                }}>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ 
                      margin: 0,
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: 'var(--neutral-900)'
                    }}>
                      {formatBytes(backup.file_size)}
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: '0.8rem',
                      color: 'var(--neutral-600)'
                    }}>
                      {backup.backup_type}
                    </p>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.375rem 0.875rem',
                    borderRadius: 'var(--radius-full)',
                    background: backup.status === 'success'
                      ? 'rgba(16, 185, 129, 0.1)'
                      : 'rgba(239, 68, 68, 0.1)',
                    color: backup.status === 'success' ? '#059669' : '#991b1b',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    whiteSpace: 'nowrap'
                  }}>
                    {backup.status === 'success' ? '✅' : '❌'} 
                    {backup.status.charAt(0).toUpperCase() + backup.status.slice(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
