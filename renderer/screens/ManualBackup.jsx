import React, { useMemo, useState } from "react";
import { useAppStore } from "../store";
import { useBackup } from "../hooks/useBackup";

export default function ManualBackup() {
  const { backupProfiles, addBackupHistory, setCurrentBackup, resetCurrentBackup } = useAppStore();
  const { manualBackup, loading } = useBackup();

  const [profileId, setProfileId] = useState("");
  const [message, setMessage] = useState("");

  const activeProfiles = useMemo(
    () => backupProfiles.filter((profile) => profile.is_active),
    [backupProfiles]
  );

  async function handleRunManualBackup() {
    if (!profileId) {
      setMessage("Select a profile first.");
      return;
    }

    setCurrentBackup({ running: true, progress: 10, currentType: "Preparing" });
    setMessage("");

    try {
      const result = await manualBackup({ profileId });
      setCurrentBackup({ running: true, progress: 100, currentType: "Completed" });

      addBackupHistory({
        id: `run_${Date.now()}`,
        profile_id: profileId,
        profile_name:
          activeProfiles.find((profile) => String(profile.id) === String(profileId))?.name ||
          "Manual Backup",
        backup_type: "manual",
        status: result?.success ? "success" : "failed",
        started_at: result?.startedAt || new Date().toISOString(),
        completed_at: result?.completedAt || new Date().toISOString(),
        file_size: Number(result?.totalSizeBytes || 0),
        file_path: result?.results?.find((item) => item.filePath)?.filePath || "",
        log_file: ""
      });

      setMessage(result?.success ? "Backup completed successfully." : "Backup finished with issues.");
    } catch (error) {
      setMessage(`Backup failed: ${error.message}`);
    } finally {
      setTimeout(() => resetCurrentBackup(), 300);
    }
  }

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Manual Backup</h1>
      </header>

      <div className="card">
        <label className="block text-sm font-medium mb-2">Select Backup Profile</label>
        <select
          className="input"
          value={profileId}
          onChange={(e) => setProfileId(e.target.value)}
        >
          <option value="">Choose a profile</option>
          {activeProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>

        <button className="btn-primary mt-4" onClick={handleRunManualBackup} disabled={loading}>
          {loading ? "Running..." : "Run Backup"}
        </button>

        {message ? <p className="mt-4 text-sm">{message}</p> : null}
      </div>
    </div>
  );
}

