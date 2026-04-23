import React, { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../store";
import { useIPC } from "../hooks/useElectron";
import StatusBadge from "../components/StatusBadge";

function formatDuration(start, end) {
  if (!start || !end) return "N/A";
  const duration = new Date(end) - new Date(start);
  const minutes = Math.floor(duration / 60000);
  const seconds = Math.floor((duration % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

function formatFileSize(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "N/A";
  const units = ["Bytes", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** index;
  return `${Math.round(value * 100) / 100} ${units[index]}`;
}

function normalizeRuns(payload) {
  if (!Array.isArray(payload)) return [];
  return payload;
}

export default function BackupHistory() {
  const { invoke } = useIPC();
  const { backupHistory, clearBackupHistory } = useAppStore();
  const [persistedRuns, setPersistedRuns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");

  async function loadPersistedRuns() {
    setLoading(true);
    setError("");
    try {
      const rows = await invoke("getBackupRuns", 500);
      setPersistedRuns(normalizeRuns(rows));
    } catch (loadError) {
      setError(`Failed to load persisted history: ${loadError.message}`);
      setPersistedRuns([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPersistedRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const historyRows = useMemo(() => {
    if (persistedRuns.length > 0) return persistedRuns;
    return backupHistory;
  }, [persistedRuns, backupHistory]);

  const filteredHistory = historyRows.filter((backup) => {
    const status = String(backup.status || "");
    const profileName = String(backup.profile_name || "");
    const matchesFilter = filter === "all" || status === filter;
    const matchesSearch = profileName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleClearHistory = () => {
    if (window.confirm("Are you sure you want to clear local in-memory history?")) {
      clearBackupHistory();
    }
  };

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Backup History</h1>
        <div className="flex gap-2">
          <button type="button" onClick={loadPersistedRuns} className="btn-secondary" disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
          <button type="button" onClick={handleClearHistory} className="btn-danger">
            Clear In-Memory History
          </button>
        </div>
      </header>

      <div className="card mb-6">
        <div className="flex gap-4 items-center">
          <div>
            <label className="block text-sm font-medium mb-1">Filter by Status</label>
            <select value={filter} onChange={(event) => setFilter(event.target.value)} className="input">
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="partial">Partial</option>
              <option value="queued">Queued</option>
              <option value="failed">Failed</option>
              <option value="running">Running</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Search Profiles</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="input"
              placeholder="Search by profile name..."
            />
          </div>
        </div>
      </div>

      <div className="card">
        {error ? <p className="text-sm text-red-800 mb-3">{error}</p> : null}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4">Profile</th>
                <th className="text-left py-3 px-4">Started</th>
                <th className="text-left py-3 px-4">Duration</th>
                <th className="text-left py-3 px-4">Size</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray-500">
                    No backup history found
                  </td>
                </tr>
              ) : (
                filteredHistory.map((backup) => (
                  <tr key={backup.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-medium">{backup.profile_name}</div>
                        <div className="text-sm text-gray-500">{backup.backup_type}</div>
                      </div>
                    </td>
                    <td className="py-3 px-4">{new Date(backup.started_at).toLocaleString()}</td>
                    <td className="py-3 px-4">{formatDuration(backup.started_at, backup.completed_at)}</td>
                    <td className="py-3 px-4">{formatFileSize(backup.file_size)}</td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={
                          backup.status === "success"
                            ? "success"
                            : backup.status === "partial" || backup.status === "queued"
                            ? "warning"
                            : backup.status === "failed"
                            ? "danger"
                            : "info"
                        }
                        text={backup.status}
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button type="button" className="text-blue-600 hover:text-blue-800 text-sm">
                          View Details
                        </button>
                        {backup.error_log ? (
                          <button type="button" className="text-gray-600 hover:text-gray-800 text-sm">
                            View Log
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
