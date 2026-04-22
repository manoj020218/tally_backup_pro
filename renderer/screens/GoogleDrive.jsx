import React from "react";
import { useAppStore } from "../store";
import StatusBadge from "../components/StatusBadge";

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const size = value / 1024 ** index;
  return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

export default function GoogleDrive() {
  const { gdriveStatus, settings, updateSettings, setGdriveStatus } = useAppStore();

  function handleConnectMock() {
    setGdriveStatus({
      connected: true,
      email: "client@example.com",
      quota: {
        used: 1024 * 1024 * 128,
        total: 1024 * 1024 * 1024 * 15
      }
    });
  }

  function handleDisconnect() {
    setGdriveStatus({
      connected: false,
      email: "",
      quota: { used: 0, total: 0 }
    });
  }

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Google Drive</h1>
        <StatusBadge
          status={gdriveStatus.connected ? "success" : "warning"}
          text={gdriveStatus.connected ? "Connected" : "Disconnected"}
        />
      </header>

      <div className="card mb-4">
        <h3>Connection</h3>
        <p className="text-sm text-gray-600 mt-2">
          {gdriveStatus.connected
            ? `Signed in as ${gdriveStatus.email || "unknown account"}`
            : "Google Drive is not connected."}
        </p>
        <p className="text-sm text-gray-600 mt-2">
          Storage: {formatBytes(gdriveStatus.quota?.used)} /{" "}
          {formatBytes(gdriveStatus.quota?.total)}
        </p>
        <div className="flex gap-2 mt-4">
          {!gdriveStatus.connected ? (
            <button className="btn-primary" onClick={handleConnectMock}>
              Connect
            </button>
          ) : (
            <button className="btn-danger" onClick={handleDisconnect}>
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Drive Folder</h3>
        <input
          type="text"
          className="input mt-3"
          value={settings.gdriveFolderId || ""}
          placeholder="Google Drive Folder ID"
          onChange={(e) => updateSettings({ gdriveFolderId: e.target.value })}
        />
      </div>
    </div>
  );
}

