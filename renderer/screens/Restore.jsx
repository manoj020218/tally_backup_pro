import React, { useMemo, useState } from "react";
import { useAppStore } from "../store";
import StatusBadge from "../components/StatusBadge";

export default function Restore() {
  const { backupHistory } = useAppStore();
  const [selectedId, setSelectedId] = useState("");

  const selectedBackup = useMemo(
    () => backupHistory.find((item) => String(item.id) === String(selectedId)) || null,
    [backupHistory, selectedId]
  );

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Restore / Export</h1>
      </header>

      <div className="card mb-4">
        <h3>Available Backups</h3>
        {backupHistory.length === 0 ? (
          <p className="text-sm text-gray-600 mt-2">No backup records found.</p>
        ) : (
          <div className="mt-3">
            <select
              className="input"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
            >
              <option value="">Select a backup</option>
              {backupHistory.map((item) => (
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
              <strong>Started:</strong>{" "}
              {new Date(selectedBackup.started_at).toLocaleString()}
            </p>
            <p>
              <strong>Completed:</strong>{" "}
              {selectedBackup.completed_at
                ? new Date(selectedBackup.completed_at).toLocaleString()
                : "N/A"}
            </p>
            <p>
              <strong>File Path:</strong> {selectedBackup.file_path || "N/A"}
            </p>
            <div className="mt-2">
              <StatusBadge
                status={selectedBackup.status === "success" ? "success" : "danger"}
                text={selectedBackup.status}
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

