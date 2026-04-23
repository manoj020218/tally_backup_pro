import React, { useEffect, useState } from "react";
import { useAppStore } from "../store";
import { useIPC } from "../hooks/useElectron";
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
  const { invoke } = useIPC();
  const { gdriveStatus, settings, updateSettings, setGdriveStatus } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function refreshDriveStatus() {
    setLoading(true);
    setError("");
    try {
      const status = await invoke("getDriveStatus");
      setGdriveStatus(status || {});
    } catch (statusError) {
      setError(`Unable to load Drive status: ${statusError.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshDriveStatus();
  }, []);

  async function handleConnect() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const status = await invoke("connectDrive");
      setGdriveStatus(status || {});
      setMessage("Google Drive connected successfully.");
    } catch (connectError) {
      setError(`Drive connect failed: ${connectError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisconnect() {
    setLoading(true);
    setMessage("");
    setError("");
    try {
      const status = await invoke("disconnectDrive");
      setGdriveStatus(status || {});
      setMessage("Google Drive disconnected.");
    } catch (disconnectError) {
      setError(`Drive disconnect failed: ${disconnectError.message}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveFolderId() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      await invoke("updateSettings", {
        ...settings,
        gdriveFolderId: settings.gdriveFolderId || ""
      });
      setMessage("Drive folder ID saved.");
      await refreshDriveStatus();
    } catch (saveError) {
      setError(`Unable to save folder ID: ${saveError.message}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      <header className="card card-header">
        <h1>Google Drive</h1>
        <div className="flex gap-2 items-center">
          <StatusBadge
            status={gdriveStatus.connected ? "success" : "warning"}
            text={gdriveStatus.connected ? "Connected" : "Disconnected"}
          />
          <button type="button" className="btn-secondary" onClick={refreshDriveStatus} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
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
        {gdriveStatus.error ? <p className="text-sm text-red-800 mt-2">{gdriveStatus.error}</p> : null}
        <div className="flex gap-2 mt-4">
          {!gdriveStatus.connected ? (
            <button className="btn-primary" onClick={handleConnect} disabled={loading}>
              {loading ? "Connecting..." : "Connect"}
            </button>
          ) : (
            <button className="btn-danger" onClick={handleDisconnect} disabled={loading}>
              {loading ? "Disconnecting..." : "Disconnect"}
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
        <div className="mt-3 flex gap-2">
          <button type="button" className="btn-primary" onClick={handleSaveFolderId} disabled={saving}>
            {saving ? "Saving..." : "Save Folder ID"}
          </button>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-green-800">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-red-800">{error}</p> : null}
    </div>
  );
}
