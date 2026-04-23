import React, { useState } from "react";
import { useTallyStatus } from "../hooks/useTallyStatus";
import { useAppStore } from "../store";
import { useBackup } from "../hooks/useBackup";
import StatusBadge from "../components/StatusBadge";
import BackupProgressBar from "../components/BackupProgressBar";

function mapBackupResultToHistory(profile, result = {}, fallbackStatus = "failed") {
  const failedErrors = Array.isArray(result.results)
    ? result.results.filter((item) => !item.success).map((item) => item.error).filter(Boolean)
    : [];

  return {
    id: `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    profile_id: profile.id,
    profile_name: profile.name,
    backup_type: profile.backupType || "incremental",
    status: result.status || (result.success ? "success" : fallbackStatus),
    started_at: result.startedAt || new Date().toISOString(),
    completed_at: result.completedAt || new Date().toISOString(),
    file_size: Number(result.totalSizeBytes || 0),
    file_path: Array.isArray(result.results)
      ? result.results.find((item) => item.filePath)?.filePath || ""
      : "",
    log_file: failedErrors.join(" | ")
  };
}

function historyBadgeStatus(status) {
  if (status === "success") return "success";
  if (status === "partial" || status === "queued") return "warning";
  return "danger";
}

export default function Dashboard() {
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

      addBackupHistory(mapBackupResultToHistory(profile, result, "failed"));
      setCurrentBackup({
        running: true,
        progress: 100,
        currentType: "Completed"
      });

      if (result.queued) {
        setRunMessage(`Tally disconnected for ${profile.name}. XML backup queued; fallback attempted.`);
      } else if (result.success) {
        setRunMessage(`Backup completed for ${profile.name}.`);
      } else {
        setRunMessage(`Backup finished with issues for ${profile.name}.`);
      }
    } catch (error) {
      addBackupHistory(
        mapBackupResultToHistory(
          profile,
          {
            success: false,
            status: "failed",
            startedAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
            results: [{ success: false, error: error.message }]
          },
          "failed"
        )
      );
      setRunMessage(`Backup failed for ${profile.name}: ${error.message}`);
    } finally {
      setActiveRunProfileId("");
      setTimeout(() => resetCurrentBackup(), 500);
    }
  }

  return (
    <div className="container">
      <header className="card card-header">
        <h1>TallyBackup Pro</h1>
        <div className="flex gap-4">
          <StatusBadge
            status={tallyStatus.connected ? "success" : "danger"}
            text={tallyStatus.connected ? "Tally Connected" : "Tally Disconnected"}
          />
          <StatusBadge
            status={gdriveStatus.connected ? "success" : "warning"}
            text={gdriveStatus.connected ? "Drive Connected" : "Drive Not Connected"}
          />
        </div>
      </header>

      {runMessage ? <p className="mb-2 text-sm">{runMessage}</p> : null}

      <div className="grid">
        <div className="card">
          <h3>Backup Profiles</h3>
          <p>{activeProfiles.length} active profiles</p>
          <div className="mt-4">
            {activeProfiles.length === 0 ? (
              <p className="text-gray-500">No active profiles available.</p>
            ) : (
              activeProfiles.map((profile) => (
                <div key={profile.id} className="flex justify-between items-center py-2 border-b">
                  <span>{profile.name}</span>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={backupLoading}
                    onClick={() => handleRunBackup(profile)}
                  >
                    {backupLoading && activeRunProfileId === profile.id ? "Running..." : "Run Backup"}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card">
          <h3>Recent Backups</h3>
          <div className="mt-4">
            {recentBackups.length === 0 ? (
              <p className="text-gray-500">No recent backups</p>
            ) : (
              recentBackups.map((backup) => (
                <div key={backup.id} className="flex justify-between items-center py-2 border-b">
                  <div>
                    <div className="font-medium">{backup.profile_name}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(backup.started_at).toLocaleString()}
                    </div>
                  </div>
                  <StatusBadge status={historyBadgeStatus(backup.status)} text={backup.status} />
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
