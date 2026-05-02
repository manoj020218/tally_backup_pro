const { app } = require('electron');
const logger = require('winston').default;

/**
 * Initialize the auto-updater using the new AppUpdater class
 * This replaces the older updater logic with the new modular approach
 */
function initUpdater(mainWindow) {
  // Skip in development/unpackaged mode
  if (!app.isPackaged) {
    logger.info('Auto-updater skipped (development/unpackaged mode)');
    return;
  }

  try {
    const appUpdater = require('./updater-config');
    
    // Set main window reference for notifications
    appUpdater.setMainWindow(mainWindow);
    
    // Initialize the updater
    appUpdater.initialize();
    
    logger.info('Auto-updater initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize auto-updater:', error);
  }
}

module.exports = { initUpdater };

