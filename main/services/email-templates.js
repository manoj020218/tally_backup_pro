/**
 * Email Templates for Backup Pro
 * Provides HTML templates for success, failure, and test emails
 */

const emailTemplates = {
  /**
   * Backup success email template
   */
  success: (profile, backupInfo) => {
    const timestamp = new Date(backupInfo.completedAt || Date.now()).toLocaleString();
    const formatBytes = (bytes) => {
      if (!bytes) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { background: #f9fafb; padding: 30px; border-bottom: 1px solid #e5e7eb; }
        .section { margin: 20px 0; }
        .section-title { font-weight: 600; color: #1f2937; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
        .info-item { background: white; padding: 15px; border-radius: 6px; border-left: 3px solid #10b981; }
        .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .info-value { font-size: 18px; font-weight: 600; color: #1f2937; }
        .status { background: #ecfdf5; border: 1px solid #86efac; color: #15803d; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0; }
        .status-icon { font-size: 24px; margin-right: 10px; }
        .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        .footer p { margin: 5px 0; }
        .button { display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 15px; }
        .button:hover { background: #059669; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Backup Completed Successfully</h1>
            <p>Your data has been safely backed up</p>
        </div>

        <div class="content">
            <div class="status">
                <span class="status-icon">✓</span> Backup completed without errors
            </div>

            <div class="section">
                <div class="section-title">Backup Details</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Profile</div>
                        <div class="info-value">${escapeHtml(profile.name)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Type</div>
                        <div class="info-value">${escapeHtml(profile.backupType || 'Full')}</div>
                    </div>
                </div>

                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Size</div>
                        <div class="info-value">${formatBytes(backupInfo.size)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Duration</div>
                        <div class="info-value">${backupInfo.duration || 'N/A'}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Completion Time</div>
                <p style="margin: 0; color: #4b5563; font-size: 14px;">${timestamp}</p>
            </div>

            <div class="section">
                <p style="color: #6b7280; font-size: 13px; margin: 0;">
                    Your backup is automatically scheduled. You can review backup history and settings anytime in the Backup Pro application.
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>Backup Pro</strong> - Intelligent Tally Data Backup & Sync Platform</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
  },

  /**
   * Backup failure email template
   */
  failure: (profile, error) => {
    const timestamp = new Date().toLocaleString();
    const errorMessage = error?.message || 'Unknown error occurred';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { background: #f9fafb; padding: 30px; border-bottom: 1px solid #e5e7eb; }
        .section { margin: 20px 0; }
        .section-title { font-weight: 600; color: #1f2937; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 10px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 15px 0; }
        .info-item { background: white; padding: 15px; border-radius: 6px; border-left: 3px solid #ef4444; }
        .info-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .info-value { font-size: 18px; font-weight: 600; color: #1f2937; }
        .status { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0; }
        .status-icon { font-size: 24px; margin-right: 10px; }
        .error-box { background: #fff5f5; border: 1px solid #fed7d7; padding: 15px; border-radius: 6px; margin: 20px 0; font-family: 'Courier New', monospace; font-size: 12px; color: #742a2a; word-break: break-word; }
        .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        .footer p { margin: 5px 0; }
        .button { display: inline-block; background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin-top: 15px; }
        .button:hover { background: #dc2626; }
        .action-text { color: #6b7280; font-size: 13px; margin: 15px 0 0 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>❌ Backup Failed</h1>
            <p>There was an issue backing up your data</p>
        </div>

        <div class="content">
            <div class="status">
                <span class="status-icon">✕</span> Backup encountered an error and could not complete
            </div>

            <div class="section">
                <div class="section-title">Failed Backup Details</div>
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Profile</div>
                        <div class="info-value">${escapeHtml(profile.name)}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Time</div>
                        <div class="info-value">${timestamp}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Error Details</div>
                <div class="error-box">${escapeHtml(errorMessage)}</div>
            </div>

            <div class="section">
                <div class="action-text">
                    <strong>What to do:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px;">
                        <li>Check your backup profile settings and verify the connection</li>
                        <li>Ensure your Tally application is running and accessible</li>
                        <li>Verify internet connectivity for cloud sync</li>
                        <li>Review the application logs for more details</li>
                        <li>Retry the backup or contact support if the issue persists</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Backup Pro</strong> - Intelligent Tally Data Backup & Sync Platform</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
  },

  /**
   * Test email template
   */
  test: () => {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; }
        .content { background: #f9fafb; padding: 30px; border-bottom: 1px solid #e5e7eb; }
        .section { margin: 20px 0; }
        .status { background: #eff6ff; border: 1px solid #bfdbfe; color: #1e40af; padding: 15px; border-radius: 6px; text-align: center; margin: 20px 0; }
        .status-icon { font-size: 24px; margin-right: 10px; }
        .feature-box { background: white; padding: 15px; border-radius: 6px; border-left: 3px solid #3b82f6; margin: 15px 0; }
        .feature-title { font-weight: 600; color: #1f2937; margin-bottom: 8px; }
        .feature-desc { color: #6b7280; font-size: 13px; }
        .footer { background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #6b7280; }
        .footer p { margin: 5px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Test Email</h1>
            <p>Email notifications are working correctly</p>
        </div>

        <div class="content">
            <div class="status">
                <span class="status-icon">✓</span> Email configuration is validated and working
            </div>

            <div class="section">
                <h2 style="color: #1f2937; margin-top: 0;">Email Alerts Configured</h2>
                <p style="color: #6b7280; margin: 10px 0;">
                    Your Backup Pro is now set up to send you notifications about backup operations.
                </p>
            </div>

            <div class="section">
                <div class="feature-box">
                    <div class="feature-title">✅ Backup Success Alerts</div>
                    <div class="feature-desc">Get notified when your backups complete successfully with details about size and duration</div>
                </div>
                <div class="feature-box">
                    <div class="feature-title">⚠️ Backup Failure Alerts</div>
                    <div class="feature-desc">Receive immediate notification if something goes wrong, along with error details</div>
                </div>
                <div class="feature-box">
                    <div class="feature-title">📊 Detailed Information</div>
                    <div class="feature-desc">Each notification includes complete backup details for your records</div>
                </div>
            </div>

            <div class="section">
                <p style="color: #6b7280; font-size: 13px; margin: 0;">
                    You can manage email notification settings anytime in the Backup Pro application's Settings screen.
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>Backup Pro</strong> - Intelligent Tally Data Backup & Sync Platform</p>
            <p>This is an automated message. Please do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
    `;
  },
};

/**
 * Escape HTML special characters
 */
function escapeHtml(text) {
  if (!text) return '';
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

module.exports = { emailTemplates };
