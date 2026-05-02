import React, { useState } from 'react';
import { useAppStore } from '../store';
import ModernInput from '../components/ModernInput';
import { EmailConfigForm } from '../components/EmailConfigForm';
import UpdateSettings from '../components/UpdateSettings';

export default function ModernSettings() {
  const { settings, updateSettings } = useAppStore();
  const [settingsData, setSettingsData] = useState(settings || {
    appTheme: 'light',
    notificationsEnabled: true,
    autoBackupEnabled: false,
    autoBackupInterval: 'daily',
    encryptionEnabled: true,
    encryptionPassword: '',
    logLevel: 'info',
    retentionDays: 30
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      updateSettings(settingsData);
      setSaveMessage('✅ Settings saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage(`❌ Error saving settings: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm('Reset all settings to defaults?')) {
      setSettingsData({
        appTheme: 'light',
        notificationsEnabled: true,
        autoBackupEnabled: false,
        autoBackupInterval: 'daily',
        encryptionEnabled: true,
        encryptionPassword: '',
        logLevel: 'info',
        retentionDays: 30
      });
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div>
          <h1>Settings</h1>
          <p className="page-description">Customize your TallyBackup Pro experience</p>
        </div>
      </div>

      {/* Status Message */}
      {saveMessage && (
        <div style={{
          padding: '1rem',
          borderRadius: 'var(--radius-lg)',
          background: saveMessage.includes('✅')
            ? 'rgba(16, 185, 129, 0.1)'
            : 'rgba(239, 68, 68, 0.1)',
          color: saveMessage.includes('✅') ? '#059669' : '#991b1b',
          marginBottom: '1.5rem',
          fontWeight: 500,
          animation: 'slideDown var(--transition-base)'
        }}>
          {saveMessage}
        </div>
      )}

      {/* Settings Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* General Settings */}
        <div className="card slide-up">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>⚙️</span> General Settings
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--neutral-900)'
            }}>
              App Theme
            </label>
            <select
              value={settingsData.appTheme}
              onChange={(e) => setSettingsData({ ...settingsData, appTheme: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--neutral-200)',
                fontSize: '0.9375rem'
              }}
            >
              <option value="light">🌞 Light Mode</option>
              <option value="dark">🌙 Dark Mode</option>
              <option value="auto">🔄 Auto (System)</option>
            </select>
          </div>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--neutral-50)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}>
            <input
              type="checkbox"
              checked={settingsData.notificationsEnabled}
              onChange={(e) => setSettingsData({ ...settingsData, notificationsEnabled: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Notifications</p>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
                Receive notifications for backup events
              </p>
            </div>
          </div>
        </div>

        {/* Backup Settings */}
        <div className="card slide-up">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>💾</span> Backup Settings
          </h3>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--neutral-50)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}>
            <input
              type="checkbox"
              checked={settingsData.autoBackupEnabled}
              onChange={(e) => setSettingsData({ ...settingsData, autoBackupEnabled: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Automatic Backups</p>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
                Run backups automatically on schedule
              </p>
            </div>
          </div>

          {settingsData.autoBackupEnabled && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--neutral-900)'
              }}>
                Backup Interval
              </label>
              <select
                value={settingsData.autoBackupInterval}
                onChange={(e) => setSettingsData({ ...settingsData, autoBackupInterval: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--neutral-200)',
                  fontSize: '0.9375rem'
                }}
              >
                <option value="hourly">⏰ Hourly</option>
                <option value="daily">📅 Daily</option>
                <option value="weekly">📆 Weekly</option>
                <option value="monthly">📋 Monthly</option>
              </select>
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--neutral-900)'
            }}>
              Data Retention (Days)
            </label>
            <input
              type="number"
              value={settingsData.retentionDays}
              onChange={(e) => setSettingsData({ ...settingsData, retentionDays: parseInt(e.target.value) || 0 })}
              min="1"
              max="365"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--neutral-200)',
                fontSize: '0.9375rem'
              }}
            />
            <p style={{
              marginTop: '0.375rem',
              fontSize: '0.8125rem',
              color: 'var(--neutral-600)'
            }}>
              Backups older than this will be automatically deleted
            </p>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card slide-up">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>🔒</span> Security Settings
          </h3>

          <div style={{
            padding: '1rem',
            borderRadius: 'var(--radius-lg)',
            background: 'var(--neutral-50)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            marginBottom: '1.5rem'
          }}>
            <input
              type="checkbox"
              checked={settingsData.encryptionEnabled}
              onChange={(e) => setSettingsData({ ...settingsData, encryptionEnabled: e.target.checked })}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>Encryption</p>
              <p style={{ margin: '0.25rem 0 0 0', color: 'var(--neutral-600)', fontSize: '0.9rem' }}>
                Encrypt backups for enhanced security
              </p>
            </div>
          </div>

          {settingsData.encryptionEnabled && (
            <ModernInput
              label="Encryption Password"
              type="password"
              placeholder="Enter encryption password"
              value={settingsData.encryptionPassword}
              onChange={(e) => setSettingsData({ ...settingsData, encryptionPassword: e.target.value })}
              icon="🔐"
              helperText="Keep this password safe - you'll need it to decrypt backups"
            />
          )}
        </div>

        {/* Email Alerts Settings */}
        <div className="card slide-up">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>📧</span> Email Alerts
          </h3>
          <EmailConfigForm />
        </div>

        {/* Update Settings */}
        <UpdateSettings />

        {/* Developer Settings */}
        <div className="card slide-up">
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span>🔧</span> Developer Settings
          </h3>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontSize: '0.9rem',
              fontWeight: 600,
              color: 'var(--neutral-900)'
            }}>
              Log Level
            </label>
            <select
              value={settingsData.logLevel}
              onChange={(e) => setSettingsData({ ...settingsData, logLevel: e.target.value })}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1.5px solid var(--neutral-200)',
                fontSize: '0.9375rem'
              }}
            >
              <option value="debug">🐛 Debug</option>
              <option value="info">ℹ️ Info</option>
              <option value="warn">⚠️ Warning</option>
              <option value="error">❌ Error</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <button
            className="btn-primary"
            onClick={handleSave}
            disabled={isSaving}
            style={{ flex: 1, minWidth: '150px' }}
          >
            {isSaving ? '💾 Saving...' : '💾 Save Settings'}
          </button>
          <button
            className="btn-secondary"
            onClick={handleReset}
          >
            🔄 Reset to Defaults
          </button>
        </div>
      </div>

      {/* Info Footer */}
      <div style={{
        marginTop: '2rem',
        padding: '1.5rem',
        borderRadius: 'var(--radius-lg)',
        background: 'var(--primary-50)',
        color: 'var(--primary-dark)'
      }}>
        <p style={{ margin: 0, fontWeight: 600, marginBottom: '0.5rem' }}>📝 App Information</p>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>
          TallyBackup Pro v1.0.0 • Built for modern finance professionals
        </p>
      </div>
    </div>
  );
}
