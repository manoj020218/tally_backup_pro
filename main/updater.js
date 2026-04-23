const { app, dialog } = require('electron');
const { getSetting } = require('./db/queries');

function resolveUpdateChannel() {
  const raw = String(getSetting('update_channel') || 'stable').trim().toLowerCase();
  if (['stable', 'beta', 'hotfix'].includes(raw)) {
    return raw;
  }
  return 'stable';
}

function initUpdater(mainWindow) {
  if (!app || !app.isPackaged) {
    console.log('Auto-updater skipped (development/unpackaged mode)');
    return;
  }

  try {
    const { autoUpdater } = require('electron-updater');
    const channel = resolveUpdateChannel();
    autoUpdater.channel = channel;
    autoUpdater.allowPrerelease = channel !== 'stable';
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: `A new ${channel} update is available for TallyBackup Pro.`,
        buttons: ['Install', 'Later']
      }).then(result => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
        }
      });
    });

    autoUpdater.on('update-downloaded', () => {
      autoUpdater.quitAndInstall();
    });

    autoUpdater.on('error', (error) => {
      console.error('Auto-update error:', error);
    });

    console.log(`Auto-updater initialized on channel: ${channel}`);
  } catch (error) {
    console.error('Failed to initialize updater:', error);
  }
}

module.exports = { initUpdater };
