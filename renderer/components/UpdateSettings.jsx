import React, { useState, useEffect } from 'react';
import { useElectron } from '../hooks/useElectron';

/**
 * Update Settings Component
 * Allows users to:
 * - Check for updates manually
 * - View current version
 * - Switch update channels
 * - See last update check time
 */
export default function UpdateSettings() {
  const ipcRenderer = useElectron();
  const [updateStatus, setUpdateStatus] = useState({
    channel: 'stable',
    version: '0.0.0',
    lastCheck: null,
    pendingUpdate: null,
    isChecking: false,
    error: null,
  });

  useEffect(() => {
    if (!ipcRenderer) return;

    // Load update status on mount
    loadUpdateStatus();

    // Listen for update events
    ipcRenderer.on('update:available', (data) => {
      setUpdateStatus((prev) => ({
        ...prev,
        pendingUpdate: data,
      }));
    });

    return () => {
      ipcRenderer.removeAllListeners('update:available');
    };
  }, [ipcRenderer]);

  const loadUpdateStatus = async () => {
    try {
      const status = await ipcRenderer.invoke('update:getStatus');
      setUpdateStatus((prev) => ({
        ...prev,
        ...status,
        error: null,
      }));
    } catch (error) {
      setUpdateStatus((prev) => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  const handleCheckNow = async () => {
    setUpdateStatus((prev) => ({ ...prev, isChecking: true, error: null }));

    try {
      await ipcRenderer.invoke('update:checkNow');
      
      // Re-load status after check
      setTimeout(loadUpdateStatus, 1000);
    } catch (error) {
      setUpdateStatus((prev) => ({
        ...prev,
        error: error.message,
        isChecking: false,
      }));
    }
  };

  const handleChannelChange = async (newChannel) => {
    try {
      const result = await ipcRenderer.invoke('update:setChannel', newChannel);
      if (result.success) {
        setUpdateStatus((prev) => ({
          ...prev,
          channel: result.channel,
        }));
      }
    } catch (error) {
      setUpdateStatus((prev) => ({
        ...prev,
        error: error.message,
      }));
    }
  };

  const formatLastCheck = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    const diffDays = Math.round(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  };

  return (
    <div className="card slide-up">
      <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span>🚀</span> Updates
      </h3>

      {/* Error Message */}
      {updateStatus.error && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#991b1b',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
        }}>
          <span style={{ fontSize: '1.1rem', lineHeight: 1 }}>⚠️</span>
          <span>{updateStatus.error}</span>
        </div>
      )}

      {/* Current Version */}
      <div style={{
        padding: '1rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--neutral-50)',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-600)' }}>
            Current Version
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '1.2rem', fontWeight: 600 }}>
            v{updateStatus.version}
          </p>
        </div>
        {updateStatus.pendingUpdate && (
          <div style={{
            padding: '0.5rem 1rem',
            borderRadius: 'var(--radius-lg)',
            background: '#fef3c7',
            color: '#92400e',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            ⬆️ Update Available: v{updateStatus.pendingUpdate.version}
          </div>
        )}
      </div>

      {/* Update Channel Selector */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          color: 'var(--neutral-900)',
        }}>
          📡 Update Channel
        </label>
        <select
          value={updateStatus.channel}
          onChange={(e) => handleChannelChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-lg)',
            border: '1.5px solid var(--neutral-200)',
            fontSize: '0.9375rem',
            cursor: 'pointer',
          }}
        >
          <option value="stable">✅ Stable (Recommended)</option>
          <option value="beta">🧪 Beta (Testing)</option>
          <option value="dev">🚧 Development</option>
        </select>
        <p style={{
          margin: '0.5rem 0 0 0',
          fontSize: '0.85rem',
          color: 'var(--neutral-600)',
        }}>
          {updateStatus.channel === 'stable'
            ? 'Production releases with proven stability'
            : updateStatus.channel === 'beta'
            ? 'Beta features and improvements for early testers'
            : 'Latest development builds (unstable)'}
        </p>
      </div>

      {/* Last Check Time */}
      <div style={{
        padding: '1rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--neutral-50)',
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--neutral-600)' }}>
            Last Update Check
          </p>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.95rem', fontWeight: 500 }}>
            {formatLastCheck(updateStatus.lastCheck)}
          </p>
        </div>
        <p style={{
          margin: 0,
          fontSize: '0.85rem',
          color: 'var(--neutral-600)',
        }}>
          Checks every 6 hours
        </p>
      </div>

      {/* Check Now Button */}
      <button
        onClick={handleCheckNow}
        disabled={updateStatus.isChecking}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          backgroundColor: updateStatus.isChecking ? 'var(--neutral-300)' : 'var(--primary)',
          color: updateStatus.isChecking ? 'var(--neutral-600)' : 'white',
          border: 'none',
          borderRadius: 'var(--radius-lg)',
          fontSize: '0.9375rem',
          fontWeight: 600,
          cursor: updateStatus.isChecking ? 'not-allowed' : 'pointer',
          transition: 'var(--transition-base)',
        }}
      >
        {updateStatus.isChecking ? '🔄 Checking for Updates...' : '🔍 Check for Updates Now'}
      </button>

      {/* Info Box */}
      <div style={{
        marginTop: '1.5rem',
        padding: '1rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--primary-50)',
        borderLeft: '4px solid var(--primary)',
        fontSize: '0.9rem',
        lineHeight: 1.6,
        color: 'var(--primary-dark)',
      }}>
        <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.5rem' }}>
          ℹ️ About Updates
        </p>
        <ul style={{
          margin: '0.5rem 0 0 1.5rem',
          paddingLeft: 0,
        }}>
          <li style={{ marginBottom: '0.25rem' }}>
            Updates are checked automatically every 6 hours
          </li>
          <li style={{ marginBottom: '0.25rem' }}>
            You can switch to beta channel for early access to new features
          </li>
          <li>
            The app will notify you when updates are available with an option to install later
          </li>
        </ul>
      </div>
    </div>
  );
}
