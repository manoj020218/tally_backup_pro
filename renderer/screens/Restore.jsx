import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store";
import { useIPC } from "../hooks/useElectron";
import StatusBadge from "../components/StatusBadge";

function normalizeRuns(payload) {
  if (!Array.isArray(payload)) return [];
  return payload.map((row) => ({
    ...row,
    id: row.id ?? `run_${Date.now()}_${Math.floor(Math.random() * 10000)}`
  }));
}

export default function Restore() {
  const { invoke } = useIPC();
  const { backupHistory } = useAppStore();
  const [selectedId, setSelectedId] = useState("");
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRuns() {
    setLoading(true);
    setError("");
    try {
      const rows = await invoke("getBackupRuns", 500);
      setRuns(normalizeRuns(rows));
    } catch (loadError) {
      setError(`Unable to load persisted backup runs: ${loadError.message}`);
      setRuns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allRuns = useMemo(() => {
    if (runs.length > 0) return runs;
    return backupHistory;
  }, [runs, backupHistory]);

  const selectedBackup = useMemo(
    () => allRuns.find((item) => String(item.id) === String(selectedId)) || null,
    [allRuns, selectedId]
  );

  async function handleOpenFolder() {
    if (!selectedBackup?.file_path) {
      setError("Selected backup has no file path.");
      return;
    }

    setMessage("");
    setError("");
    try {
      await invoke("openRestoreFolder", selectedBackup.file_path);
      setMessage("Opened backup location in File Explorer.");
    } catch (openError) {
      setError(`Unable to open folder: ${openError.message}`);
    }
  }

  async function handleExportCsv() {
    if (!selectedBackup) {
      setError("Select a backup first.");
      return;
    }

    setMessage("");
    setError("");
    try {
      const fileName = `backup_${String(selectedBackup.id)}.csv`;
      const exportResult = await invoke("exportRestoreCsv", [selectedBackup], { fileName });
      setMessage(`CSV exported to: ${exportResult.path}`);
    } catch (exportError) {
      setError(`Unable to export CSV: ${exportError.message}`);
    }
  }

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Restore / Export</h1>
        <button type="button" className="btn-secondary" onClick={loadRuns} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh Runs"}
        </button>
      </header>

      <div className="card mb-4">
        <h3>Available Backups</h3>
        {allRuns.length === 0 ? (
          <p className="text-sm text-gray-600 mt-2">No backup records found.</p>
        ) : (
          <div className="mt-3">
            <select className="input" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">Select a backup</option>
              {allRuns.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.profile_name} - {new Date(item.started_at).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {selectedBackup ? (
        <div className="card">
          <h3>Backup Details</h3>
          <div className="mt-3">
            <p>
              <strong>Profile:</strong> {selectedBackup.profile_name}
            </p>
            <p>
              <strong>Type:</strong> {selectedBackup.backup_type}
            </p>
            <p>
              <strong>Started:</strong> {new Date(selectedBackup.started_at).toLocaleString()}
            </p>
            <p>
              <strong>Completed:</strong>{" "}
              {selectedBackup.completed_at ? new Date(selectedBackup.completed_at).toLocaleString() : "N/A"}
            </p>
            <p>
              <strong>File Path:</strong> {selectedBackup.file_path || "N/A"}
            </p>
            <div className="mt-2">
              <StatusBadge
                status={selectedBackup.status === "success" ? "success" : selectedBackup.status === "queued" ? "warning" : "danger"}
                text={selectedBackup.status}
              />
            </div>

            <div className="flex gap-2 mt-4">
              <button type="button" className="btn-secondary" onClick={handleOpenFolder}>
                Open Backup Folder
              </button>
              <button type="button" className="btn-primary" onClick={handleExportCsv}>
                Export Details CSV
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {message ? <p className="mt-3 text-sm text-green-800">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
