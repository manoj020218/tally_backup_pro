/**
 * Auto-Updater Configuration
 * Manages OTA updates for TallyBackup Pro
 * 
 * Supports multiple channels:
 * - stable: Production releases (recommended for users)
 * - beta: Beta releases for testing
 * - dev: Development builds
 */

const { autoUpdater } = require('electron-updater');
const { app } = require('electron');
const logger = require('winston').default;
const ElectronStore = require('electron-store');

const store = new ElectronStore();

class AppUpdater {
  constructor() {
    this.updateCheckInterval = null;
    this.isChecking = false;
  }

  /**
   * Initialize auto-updater
   * Should be called on app ready
   */
  initialize() {
    logger.info('Initializing auto-updater...');

    // Configure updater
    autoUpdater.logger = logger;
    autoUpdater.allowDowngrade = false;

    // Set update channel
    const channel = this.getUpdateChannel();
    autoUpdater.channel = channel;
    logger.info(`Update channel set to: ${channel}`);

    // Configure GitHub release source
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'manoj020218',
      repo: 'tally_backup_pro',
      channel,
    });

    // Register event listeners
    this.registerEventListeners();

    // Start periodic update checks
    this.startPeriodicChecks();

    // Check for updates on startup
    this.checkForUpdates();
  }

  /**
   * Get configured update channel
   */
  getUpdateChannel() {
    const channel = store.get('updateChannel', 'stable');
    if (!['stable', 'beta', 'dev'].includes(channel)) {
      logger.warn(`Invalid channel ${channel}, defaulting to stable`);
      return 'stable';
    }
    return channel;
  }

  /**
   * Set update channel
   */
  setUpdateChannel(channel) {
    if (!['stable', 'beta', 'dev'].includes(channel)) {
      logger.error(`Invalid channel: ${channel}`);
      return false;
    }

    store.set('updateChannel', channel);
    autoUpdater.channel = channel;
    logger.info(`Update channel changed to: ${channel}`);

    // Re-configure feed with new channel
    autoUpdater.setFeedURL({
      provider: 'github',
      owner: 'manoj020218',
      repo: 'tally_backup_pro',
      channel,
    });

    return true;
  }

  /**
   * Check for updates manually
   */
  async checkForUpdates() {
    if (this.isChecking) {
      logger.info('Update check already in progress');
      return;
    }

    this.isChecking = true;
    try {
      logger.info('Checking for updates...');
      await autoUpdater.checkForUpdates();
    } catch (error) {
      logger.error('Failed to check for updates:', error);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Register event listeners for updates
   */
  registerEventListeners() {
    // Update available
    autoUpdater.on('update-available', (info) => {
      logger.info('Update available:', info.version);
      
      // Store update info for UI notification
      store.set('pendingUpdate', {
        version: info.version,
        releaseDate: info.releaseDate,
        files: info.files.map((f) => ({ name: f.name, size: f.size })),
      });

      this.notifyUpdateAvailable(info);
    });

    // Update not available
    autoUpdater.on('update-not-available', () => {
      logger.info('Application is up to date');
      store.set('lastUpdateCheck', new Date().toISOString());
    });

    // Download progress
    autoUpdater.on('download-progress', (progressObj) => {
      let logMessage = `Download speed: ${Math.round(progressObj.bytesPerSecond / 1024 / 1024* 100) / 100} MB/s`;
      logMessage = logMessage + ` (${progressObj.percent}%)`;
      logMessage = logMessage + ` ${Math.round(progressObj.transferred / 1024 / 1024)}/${Math.round(progressObj.total / 1024 / 1024)} MB`;
      logger.info(logMessage);

      // Emit progress to renderer
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update:download-progress', progressObj);
      }
    });

    // Update downloaded
    autoUpdater.on('update-downloaded', (info) => {
      logger.info('Update downloaded, ready to install:', info.version);

      // Notify user and prompt to restart
      this.notifyUpdateReady(info);
    });

    // Error
    autoUpdater.on('error', (error) => {
      logger.error('Updater error:', error);
      
      if (this.mainWindow) {
        this.mainWindow.webContents.send('update:error', {
          message: 'Update check failed. Please try again later.',
          error: error.message,
        });
      }
    });
  }

  /**
   * Send notification to main window about available update
   */
  notifyUpdateAvailable(info) {
    logger.info(`Update available: ${info.version} (from ${app.getVersion()})`);

    if (this.mainWindow) {
      this.mainWindow.webContents.send('update:available', {
        version: info.version,
        releaseDate: info.releaseDate,
      });
    }
  }

  /**
   * Send notification to main window that update is ready
   */
  notifyUpdateReady(info) {
    logger.info(`Update ready to install: ${info.version}`);

    if (this.mainWindow) {
      this.mainWindow.webContents.send('update:ready', {
        version: info.version,
      });
    }
  }

  /**
   * Install update and restart app
   */
  installUpdate() {
    logger.info('Installing update and restarting app...');
    
    // Quit app and install update
    autoUpdater.quitAndInstall();
  }

  /**
   * Start periodic update checks (every 6 hours)
   */
  startPeriodicChecks() {
    // Check every 6 hours
    const checkInterval = 6 * 60 * 60 * 1000;

    this.updateCheckInterval = setInterval(() => {
      this.checkForUpdates();
    }, checkInterval);

    logger.info(`Periodic update checks enabled (every 6 hours)`);
  }

  /**
   * Stop periodic checks
   */
  stopPeriodicChecks() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      logger.info('Periodic update checks stopped');
    }
  }

  /**
   * Set main window reference for notifications
   */
  setMainWindow(mainWindow) {
    this.mainWindow = mainWindow;
  }

  /**
   * Get update status
   */
  getStatus() {
    return {
      channel: this.getUpdateChannel(),
      version: app.getVersion(),
      lastCheck: store.get('lastUpdateCheck'),
      pendingUpdate: store.get('pendingUpdate'),
    };
  }
}

module.exports = new AppUpdater();
