import React, { useState, useEffect } from 'react';
import { useElectron } from '../hooks/useElectron';

/**
 * Update Notification Component
 * Displays update availability and allows users to install/snooze
 */
export function UpdateNotification() {
  const ipcRenderer = useElectron();
  const [updateStatus, setUpdateStatus] = useState({
    available: false,
    version: null,
    downloading: false,
    progress: 0,
    error: null,
  });
  const [snoozed, setSnoozed] = useState(false);

  useEffect(() => {
    if (!ipcRenderer) return;

    // Get current update status
    ipcRenderer.invoke('update:getStatus').then((status) => {
      if (status.pendingUpdate) {
        setUpdateStatus((prev) => ({
          ...prev,
          available: true,
          version: status.pendingUpdate.version,
        }));
      }
    });

    // Listen for update events
    ipcRenderer.on('update:available', (data) => {
      setUpdateStatus((prev) => ({
        ...prev,
        available: true,
        version: data.version,
      }));
      setSnoozed(false);
    });

    ipcRenderer.on('update:download-progress', (data) => {
      setUpdateStatus((prev) => ({
        ...prev,
        downloading: true,
        progress: Math.round(data.percent),
      }));
    });

    ipcRenderer.on('update:ready', (data) => {
      setUpdateStatus((prev) => ({
        ...prev,
        available: true,
        version: data.version,
        downloading: false,
      }));
    });

    ipcRenderer.on('update:error', (data) => {
      setUpdateStatus((prev) => ({
        ...prev,
        error: data.message,
      }));
    });

    return () => {
      ipcRenderer.removeAllListeners('update:available');
      ipcRenderer.removeAllListeners('update:download-progress');
      ipcRenderer.removeAllListeners('update:ready');
      ipcRenderer.removeAllListeners('update:error');
    };
  }, [ipcRenderer]);

  if (!updateStatus.available || snoozed) {
    return null;
  }

  const handleInstall = () => {
    ipcRenderer.invoke('update:install');
  };

  const handleSnooze = () => {
    setSnoozed(true);
    // Re-enable after 1 hour
    setTimeout(() => setSnoozed(false), 60 * 60 * 1000);
  };

  const handleDismiss = () => {
    setUpdateStatus((prev) => ({
      ...prev,
      available: false,
    }));
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        maxWidth: '400px',
        backgroundColor: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
        zIndex: 1000,
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      {/* Error State */}
      {updateStatus.error && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '20px' }}>⚠️</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1f2937' }}>
                Update Check Failed
              </p>
              <p style={{ margin: '0', fontSize: '13px', color: '#6b7280' }}>
                {updateStatus.error}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '18px',
                cursor: 'pointer',
                color: '#6b7280',
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button
              onClick={() => {
                ipcRenderer.invoke('update:checkNow');
                setUpdateStatus((prev) => ({ ...prev, error: null }));
              }}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Retry
            </button>
            <button
              onClick={handleDismiss}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Dismiss
            </button>
          </div>
        </>
      )}

      {/* Downloading State */}
      {updateStatus.downloading && !updateStatus.error && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '20px' }}>📥</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 8px 0', fontWeight: '600', color: '#1f2937' }}>
                Downloading Update {updateStatus.version}
              </p>
              <div style={{
                height: '6px',
                backgroundColor: '#e5e7eb',
                borderRadius: '3px',
                overflow: 'hidden',
              }}>
                <div
                  style={{
                    height: '100%',
                    backgroundColor: '#3b82f6',
                    width: `${updateStatus.progress}%`,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
              <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                {updateStatus.progress}% downloaded
              </p>
            </div>
          </div>
        </>
      )}

      {/* Ready to Install State */}
      {updateStatus.available && !updateStatus.downloading && !updateStatus.error && (
        <>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ fontSize: '20px' }}>✨</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: '600', color: '#1f2937' }}>
                Update Available: {updateStatus.version}
              </p>
              <p style={{ margin: '0 0 12px 0', fontSize: '13px', color: '#6b7280' }}>
                A new version of TallyBackup Pro is ready to install. Restart the application to update.
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleInstall}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              ✓ Restart & Install
            </button>
            <button
              onClick={handleSnooze}
              style={{
                flex: 1,
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: '#3b82f6',
                border: '1px solid #3b82f6',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
              }}
            >
              Snooze (1h)
            </button>
            <button
              onClick={handleDismiss}
              style={{
                padding: '8px 12px',
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              ×
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default UpdateNotification;
