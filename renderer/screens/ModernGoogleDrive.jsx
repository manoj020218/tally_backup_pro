import React, { useState } from 'react';
import { useAppStore } from '../store';
import ModernInput from '../components/ModernInput';

export default function ModernGoogleDrive() {
  const { gdriveStatus } = useAppStore();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    // Call the IPC handler to start OAuth flow
    try {
      // await window.electron.invoke('initGoogleOAuth');
    } catch (error) {
      console.error('Failed to connect:', error);
    }
    setIsConnecting(false);
  };

  const handleDisconnect = async () => {
    try {
      // await window.electron.invoke('disconnectGoogleDrive');
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Google Drive Sync</h1>
          <p className="page-description">Connect and sync your backups to Google Drive</p>
        </div>
      </div>

      {/* Connection Status */}
      <div className="card slide-up" style={{ marginBottom: '2rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              fontSize: '2.5rem'
            }}>
              ☁️
            </div>
            <div>
              <h3 style={{ margin: 0, marginBottom: '0.25rem' }}>Connection Status</h3>
              <p style={{
                margin: 0,
                color: 'var(--neutral-600)',
                fontSize: '0.9rem'
              }}>
                {gdriveStatus.connected 
                  ? 'Your Google Drive is connected and syncing'
                  : 'Connect to Google Drive to enable cloud backup sync'}
              </p>
            </div>
          </div>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: gdriveStatus.connected ? 'var(--success)' : 'var(--neutral-400)',
            boxShadow: gdriveStatus.connected 
              ? '0 0 10px rgba(16, 185, 129, 0.5)'
              : 'none'
          }}
          />
        </div>

        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          {!gdriveStatus.connected ? (
            <>
              <button
                className="btn-primary"
                onClick={handleConnect}
                disabled={isConnecting}
                style={{ flex: 1, minWidth: '200px' }}
              >
                {isConnecting ? '🔄 Connecting...' : '🔗 Connect Google Drive'}
              </button>
              <p style={{
                margin: 0,
                color: 'var(--neutral-600)',
                fontSize: '0.9rem',
                width: '100%'
              }}>
                You'll be redirected to Google to authorize access
              </p>
            </>
          ) : (
            <>
              <div style={{
                padding: '1rem',
                borderRadius: 'var(--radius-lg)',
                background: 'var(--primary-50)',
                color: 'var(--primary-dark)',
                flex: 1
              }}>
                <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.25rem' }}>
                  {gdriveStatus.email || 'Connected to Google Drive'}
                </p>
                <p style={{ margin: 0, fontSize: '0.85rem' }}>
                  Last sync: {gdriveStatus.lastSync 
                    ? new Date(gdriveStatus.lastSync).toLocaleString()
                    : 'Never'}
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={handleDisconnect}
              >
                🔓 Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {/* Settings */}
      {gdriveStatus.connected && (
        <div className="card slide-up">
          <h3 style={{ marginBottom: '1.5rem' }}>Sync Settings</h3>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--neutral-50)',
            marginBottom: '1rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              defaultChecked
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Auto Sync</p>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
                Automatically sync backups to Google Drive
              </p>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--neutral-50)',
            marginBottom: '1.5rem',
            cursor: 'pointer'
          }}>
            <input
              type="checkbox"
              defaultChecked
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Sync on Backup Completion</p>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
                Upload backup immediately after completion
              </p>
            </div>
          </div>

          <button className="btn-primary" style={{ width: '100%' }}>
            💾 Sync Now
          </button>
        </div>
      )}

      {/* Info Section */}
      <div className="grid grid-2" style={{ marginTop: '2rem', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.75rem', margin: 0, marginBottom: '0.75rem' }}>🔒</p>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Secure</h4>
          <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
            End-to-end encrypted sync with Google Drive
          </p>
        </div>
        <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.75rem', margin: 0, marginBottom: '0.75rem' }}>⚡</p>
          <h4 style={{ margin: 0, marginBottom: '0.5rem' }}>Automatic</h4>
          <p style={{ margin: 0, color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
            Sync automatically or on-demand
          </p>
        </div>
      </div>
    </div>
  );
}
