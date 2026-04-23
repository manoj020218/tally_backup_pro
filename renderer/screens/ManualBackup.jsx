import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store";
import { useBackup } from "../hooks/useBackup";

const DATE_RANGE_OPTIONS = [
  { value: "profile", label: "Use Profile Date Mode" },
  { value: "incremental", label: "Incremental" },
  { value: "full", label: "Full Backup" },
  { value: "thisfinancialyear", label: "This Financial Year" },
  { value: "lastfinancialyear", label: "Last Financial Year" },
  { value: "custom", label: "Custom Range" }
];

const DATA_TYPE_LABELS = {
  FULL_900_BACKUP: ".900 File Backup"
};

export default function ManualBackup() {
  const { backupProfiles, addBackupHistory, setCurrentBackup, resetCurrentBackup } = useAppStore();
  const { manualBackup, loading } = useBackup();

  const [profileId, setProfileId] = useState("");
  const [message, setMessage] = useState("");
  const [overrideMode, setOverrideMode] = useState("profile");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [selectedTypes, setSelectedTypes] = useState([]);

  const activeProfiles = useMemo(
    () => backupProfiles.filter((profile) => profile.is_active),
    [backupProfiles]
  );

  const selectedProfile = useMemo(
    () => activeProfiles.find((profile) => String(profile.id) === String(profileId)) || null,
    [activeProfiles, profileId]
  );

  useEffect(() => {
    if (!selectedProfile) {
      setSelectedTypes([]);
      return;
    }
    const profileTypes = Array.isArray(selectedProfile.dataTypes) ? selectedProfile.dataTypes : [];
    setSelectedTypes(profileTypes);
  }, [selectedProfile]);

  function toggleType(type, checked) {
    setSelectedTypes((prev) => {
      const current = Array.isArray(prev) ? prev : [];
      if (checked) {
        if (current.includes(type)) return current;
        return [...current, type];
      }
      const next = current.filter((item) => item !== type);
      return next.length > 0 ? next : current;
    });
  }

  async function handleRunManualBackup() {
    if (!profileId) {
      setMessage("Select a profile first.");
      return;
    }

    if (overrideMode === "custom") {
      if (!customFrom || !customTo) {
        setMessage("Select both custom From and To dates.");
        return;
      }
      if (new Date(customFrom).getTime() > new Date(customTo).getTime()) {
        setMessage("Custom From date cannot be after To date.");
        return;
      }
    }

    setCurrentBackup({ running: true, progress: 10, currentType: "Preparing" });
    setMessage("");

    try {
      const overrides = {};
      if (selectedTypes.length > 0) {
        overrides.data_types = selectedTypes;
      }

      if (overrideMode !== "profile") {
        overrides.date_range_mode = overrideMode;
        if (overrideMode === "custom") {
          overrides.custom_from = customFrom;
          overrides.custom_to = customTo;
        } else {
          overrides.custom_from = null;
          overrides.custom_to = null;
        }
      }

      const result = await manualBackup({
        profileId,
        overrides
      });
      setCurrentBackup({ running: true, progress: 100, currentType: "Completed" });

      addBackupHistory({
        id: `run_${Date.now()}`,
        profile_id: profileId,
        profile_name: selectedProfile?.name || "Manual Backup",
        backup_type: "manual",
        status: result?.status || (result?.success ? "success" : "failed"),
        started_at: result?.startedAt || new Date().toISOString(),
        completed_at: result?.completedAt || new Date().toISOString(),
        file_size: Number(result?.totalSizeBytes || 0),
        file_path: result?.results?.find((item) => item.filePath)?.filePath || "",
        log_file: result?.error || ""
      });

      if (result?.queued) {
        setMessage("Tally is disconnected. XML backup queued; fallback backup attempted.");
      } else if (result?.success) {
        setMessage("Manual backup completed successfully.");
      } else {
        setMessage("Manual backup completed with issues.");
      }
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
        <select className="input" value={profileId} onChange={(event) => setProfileId(event.target.value)}>
          <option value="">Choose a profile</option>
          {activeProfiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>

        {selectedProfile ? (
          <>
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Date Range Mode Override</label>
              <select
                className="input"
                value={overrideMode}
                onChange={(event) => setOverrideMode(event.target.value)}
              >
                {DATE_RANGE_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {overrideMode === "custom" ? (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Custom From Date</label>
                  <input
                    type="date"
                    className="input"
                    value={customFrom}
                    onChange={(event) => setCustomFrom(event.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Custom To Date</label>
                  <input
                    type="date"
                    className="input"
                    value={customTo}
                    onChange={(event) => setCustomTo(event.target.value)}
                  />
                </div>
              </div>
            ) : null}

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Data Types Override</label>
              <div className="grid grid-cols-3 gap-2">
                {(selectedProfile.dataTypes || []).map((type) => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      className="mr-2"
                      checked={selectedTypes.includes(type)}
                      onChange={(event) => toggleType(type, event.target.checked)}
                    />
                    {DATA_TYPE_LABELS[type] || type}
                  </label>
                ))}
              </div>
            </div>
          </>
        ) : null}

        <button className="btn-primary mt-4" onClick={handleRunManualBackup} disabled={loading}>
          {loading ? "Running..." : "Run Backup"}
        </button>

        {message ? <p className="mt-4 text-sm">{message}</p> : null}
      </div>
    </div>
  );
}
