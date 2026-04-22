const { ipcMain } = require('electron');
const { pingTally, getCompanyList } = require('./tally/connector');
const { BackupEngine } = require('./backup/engine');
const { getAllBackupProfiles, getBackupProfileById } = require('./db/queries');

let backupEngine = null;

function registerIpcHandlers(mainWindow) {
  // Tally handlers
  ipcMain.handle('tally:ping', async (event, port) => {
    try {
      const result = await pingTally(port);
      return result;
    } catch (error) {
      return { connected: false, error: error.message };
    }
  });

  ipcMain.handle('tally:getCompanies', async (event, port) => {
    try {
      const companies = await getCompanyList(port);
      return companies;
    } catch (error) {
      return { error: error.message };
    }
  });

  // Backup handlers
  ipcMain.handle('backup:start', async (event, profileId) => {
    try {
      const profile = getBackupProfileById(profileId);
      if (!profile) throw new Error('Profile not found');
      
      if (!backupEngine) {
        const { getDatabase } = require('./db');
        const db = getDatabase();
        backupEngine = new BackupEngine(db);
      }

      const result = await backupEngine.runBackup(profile);
      mainWindow.webContents.send('backup:complete', result);
      return result;
    } catch (error) {
      mainWindow.webContents.send('backup:error', error.message);
      throw error;
    }
  });

  // Profile handlers
  ipcMain.handle('profiles:getAll', async () => {
    return getAllBackupProfiles();
  });

  ipcMain.handle('profiles:create', async (event, profile) => {
    const { createBackupProfile } = require('./db/queries');
    return createBackupProfile(profile);
  });

  ipcMain.handle('profiles:update', async (event, id, updates) => {
    const { updateBackupProfile } = require('./db/queries');
    return updateBackupProfile(id, updates);
  });

  ipcMain.handle('profiles:delete', async (event, id) => {
    const { deleteBackupProfile } = require('./db/queries');
    return deleteBackupProfile(id);
  });

  // Settings handlers
  ipcMain.handle('settings:get', async () => {
    const { getSetting } = require('./db/queries');
    return {
      tallyPort: getSetting('tally_port') || '9000',
      notifyOnSuccess: getSetting('notify_on_success') === '1',
      notifyOnFailure: getSetting('notify_on_failure') === '1'
    };
  });

  ipcMain.handle('settings:update', async (event, settings) => {
    const { setSetting } = require('./db/queries');
    Object.entries(settings).forEach(([key, value]) => {
      setSetting(key, String(value));
    });
    return settings;
  });
}

module.exports = { registerIpcHandlers };
