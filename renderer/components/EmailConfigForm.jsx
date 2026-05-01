import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/index';
import { useElectron } from '../hooks/useElectron';

export function EmailConfigForm() {
  const ipcRenderer = useElectron();
  const emailSettings = useAppStore((state) => state.emailSettings);
  const updateEmailSettings = useAppStore((state) => state.updateEmailSettings);

  const [provider, setProvider] = useState(emailSettings.provider);
  const [enabled, setEnabled] = useState(emailSettings.enabled);
  const [fromEmail, setFromEmail] = useState(emailSettings.fromEmail || '');
  const [recipientEmails, setRecipientEmails] = useState(emailSettings.recipientEmails || []);
  const [newRecipient, setNewRecipient] = useState('');
  const [notifyOnSuccess, setNotifyOnSuccess] = useState(emailSettings.notifyOnSuccess);
  const [notifyOnFailure, setNotifyOnFailure] = useState(emailSettings.notifyOnFailure);

  // SMTP fields
  const [smtpHost, setSmtpHost] = useState(emailSettings.smtpHost || '');
  const [smtpPort, setSmtpPort] = useState(emailSettings.smtpPort || 587);
  const [smtpUser, setSmtpUser] = useState(emailSettings.smtpUser || '');
  const [smtpPassword, setSmtpPassword] = useState('');

  // SendGrid fields
  const [sendgridApiKey, setSendgridApiKey] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('');

  // Load settings on mount
  useEffect(() => {
    if (!ipcRenderer) return;

    ipcRenderer.invoke('email:getSettings').then((settings) => {
      setProvider(settings.provider || 'smtp');
      setEnabled(settings.enabled || false);
      setFromEmail(settings.fromEmail || '');
      setRecipientEmails(settings.recipientEmails || []);
      setNotifyOnSuccess(settings.notifyOnSuccess !== false);
      setNotifyOnFailure(settings.notifyOnFailure !== false);
      setSmtpHost(settings.smtpHost || '');
      setSmtpPort(settings.smtpPort || 587);
      setSmtpUser(settings.smtpUser || '');
    });
  }, [ipcRenderer]);

  const addRecipient = () => {
    if (!newRecipient.trim()) return;
    if (recipientEmails.includes(newRecipient)) {
      setMessage('This email is already added');
      setMessageType('warning');
      return;
    }
    setRecipientEmails([...recipientEmails, newRecipient]);
    setNewRecipient('');
  };

  const removeRecipient = (email) => {
    setRecipientEmails(recipientEmails.filter((e) => e !== email));
  };

  const handleSave = async () => {
    if (!enabled) {
      // Just save disabled state
      await ipcRenderer.invoke('email:saveSettings', {
        enabled: false,
        provider,
        recipientEmails: [],
        notifyOnSuccess,
        notifyOnFailure,
      });
      updateEmailSettings({ enabled: false });
      setMessage('Email alerts disabled');
      setMessageType('info');
      return;
    }

    if (!fromEmail.trim()) {
      setMessage('From email is required');
      setMessageType('error');
      return;
    }

    if (recipientEmails.length === 0) {
      setMessage('At least one recipient email is required');
      setMessageType('error');
      return;
    }

    let config = {
      enabled,
      provider,
      recipientEmails,
      notifyOnSuccess,
      notifyOnFailure,
      fromEmail,
    };

    if (provider === 'smtp') {
      if (!smtpHost || !smtpUser || !smtpPassword) {
        setMessage('All SMTP fields are required');
        setMessageType('error');
        return;
      }
      config = {
        ...config,
        smtpHost,
        smtpPort,
        smtpUser,
        smtpPassword,
      };
    } else if (provider === 'sendgrid') {
      if (!sendgridApiKey) {
        setMessage('SendGrid API key is required');
        setMessageType('error');
        return;
      }
      config = {
        ...config,
        sendgridApiKey,
      };
    }

    setLoading(true);
    try {
      const result = await ipcRenderer.invoke('email:saveSettings', config);
      if (result.success) {
        updateEmailSettings(config);
        setMessage('Email settings saved successfully');
        setMessageType('success');
      } else {
        setMessage(result.error || 'Failed to save settings');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(error.message || 'Failed to save settings');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!recipientEmails.length) {
      setMessage('Add at least one recipient email');
      setMessageType('error');
      return;
    }

    setTestLoading(true);
    try {
      const result = await ipcRenderer.invoke('email:testSend', recipientEmails[0]);
      if (result.success) {
        setMessage(`Test email sent to ${recipientEmails[0]}`);
        setMessageType('success');
      } else {
        setMessage(result.message || 'Failed to send test email');
        setMessageType('error');
      }
    } catch (error) {
      setMessage(error.message || 'Failed to send test email');
      setMessageType('error');
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="email-config-form">
      {/* Enable/Disable Toggle */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            style={{
              width: '18px',
              height: '18px',
              cursor: 'pointer',
            }}
          />
          <span style={{ fontWeight: '500' }}>Enable Email Alerts</span>
        </label>
      </div>

      {enabled && (
        <>
          {/* Provider Selection */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Email Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                backgroundColor: 'white',
                cursor: 'pointer',
              }}
            >
              <option value="smtp">SMTP (Gmail, Outlook, etc.)</option>
              <option value="sendgrid">SendGrid</option>
            </select>
            <p style={{ fontSize: '12px', color: '#6b7280', margin: '6px 0 0 0' }}>
              {provider === 'smtp'
                ? 'Use SMTP for Gmail, Outlook, or other email services'
                : 'Use SendGrid API for reliable cloud email delivery'}
            </p>
          </div>

          {/* From Email */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              From Email Address *
            </label>
            <input
              type="email"
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              placeholder="notifications@example.com"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Recipient Emails */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Recipient Email Addresses *
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="email"
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="user@example.com"
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              />
              <button
                onClick={addRecipient}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  fontSize: '14px',
                }}
              >
                Add
              </button>
            </div>

            {recipientEmails.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {recipientEmails.map((email) => (
                  <div
                    key={email}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      color: '#1e40af',
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '13px',
                    }}
                  >
                    {email}
                    <button
                      onClick={() => removeRecipient(email)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1e40af',
                        cursor: 'pointer',
                        fontSize: '16px',
                        padding: '0',
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SMTP Configuration */}
          {provider === 'smtp' && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
                SMTP Configuration
              </h3>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  SMTP Host *
                </label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  placeholder="smtp.gmail.com"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                    Port *
                  </label>
                  <input
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(Number(e.target.value))}
                    placeholder="587"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px',
                      fontSize: '13px',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Username *
                </label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  placeholder="your-email@gmail.com"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  Password *
                </label>
                <input
                  type="password"
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder="Enter your password or app password"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <p style={{ fontSize: '12px', color: '#6b7280', margin: '12px 0 0 0' }}>
                For Gmail: Use an <a href="https://support.google.com/accounts/answer/185833" style={{ color: '#3b82f6' }}>App Password</a>, not your regular password
              </p>
            </div>
          )}

          {/* SendGrid Configuration */}
          {provider === 'sendgrid' && (
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: '14px', fontWeight: '600' }}>
                SendGrid Configuration
              </h3>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px' }}>
                  API Key *
                </label>
                <input
                  type="password"
                  value={sendgridApiKey}
                  onChange={(e) => setSendgridApiKey(e.target.value)}
                  placeholder="SG.xxxxxxxxxxxxxx"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <p style={{ fontSize: '12px', color: '#6b7280', margin: '12px 0 0 0' }}>
                Get your API key from{' '}
                <a href="https://app.sendgrid.com/settings/api_keys" style={{ color: '#3b82f6' }}>
                  SendGrid Dashboard
                </a>
              </p>
            </div>
          )}

          {/* Notification Types */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: '500' }}>
              Notify On
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
              <input
                type="checkbox"
                checked={notifyOnSuccess}
                onChange={(e) => setNotifyOnSuccess(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <span>✅ Backup Success</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <input
                type="checkbox"
                checked={notifyOnFailure}
                onChange={(e) => setNotifyOnFailure(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  cursor: 'pointer',
                }}
              />
              <span>❌ Backup Failure</span>
            </label>
          </div>

          {/* Status Message */}
          {message && (
            <div
              style={{
                marginBottom: '24px',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '13px',
                backgroundColor:
                  messageType === 'success'
                    ? '#ecfdf5'
                    : messageType === 'error'
                      ? '#fef2f2'
                      : messageType === 'warning'
                        ? '#fffbeb'
                        : '#eff6ff',
                color:
                  messageType === 'success'
                    ? '#15803d'
                    : messageType === 'error'
                      ? '#991b1b'
                      : messageType === 'warning'
                        ? '#92400e'
                        : '#1e40af',
                border: `1px solid ${
                  messageType === 'success'
                    ? '#86efac'
                    : messageType === 'error'
                      ? '#fecaca'
                      : messageType === 'warning'
                        ? '#fcd34d'
                        : '#bfdbfe'
                }`,
              }}
            >
              {message}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleSave}
              disabled={loading}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? 'Saving...' : '✓ Save Settings'}
            </button>
            <button
              onClick={handleTestEmail}
              disabled={testLoading || !recipientEmails.length}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: testLoading || !recipientEmails.length ? 'not-allowed' : 'pointer',
                fontWeight: '500',
                fontSize: '14px',
                opacity: testLoading || !recipientEmails.length ? 0.6 : 1,
              }}
            >
              {testLoading ? 'Sending...' : '🧪 Send Test Email'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
