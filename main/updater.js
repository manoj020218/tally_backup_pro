const { autoUpdater } = require('electron-updater');
const { dialog } = require('electron');

function initUpdater(mainWindow) {
  try {
    autoUpdater.checkForUpdatesAndNotify();

    autoUpdater.on('update-available', () => {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Update Available',
        message: 'A new version of TallyBackup Pro is available',
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

    console.log('? Auto-updater initialized');
  } catch (error) {
    console.error('Failed to initialize updater:', error);
  }
}

module.exports = { initUpdater };
