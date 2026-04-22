const notifier = require('node-notifier');
const path = require('path');

function showNotification(options = {}) {
  const {
    title = 'TallyBackup Pro',
    message = '',
    type = 'info',
    timeout = 5000
  } = options;

  try {
    notifier.notify({
      title,
      message,
      icon: path.join(__dirname, '../assets/icon.ico'),
      wait: false,
      timeout
    });
  } catch (error) {
    console.error('Notification error:', error);
  }
}

function notifyBackupComplete(profile, result) {
  showNotification({
    title: 'Backup Complete',
    message: \`\${profile.name}: \${result.successCount} succeeded, \${result.failedCount} failed\`,
    type: 'success'
  });
}

function notifyBackupError(profile, error) {
  showNotification({
    title: 'Backup Failed',
    message: \`\${profile.name}: \${error}\`,
    type: 'error'
  });
}

module.exports = {
  showNotification,
  notifyBackupComplete,
  notifyBackupError
};
