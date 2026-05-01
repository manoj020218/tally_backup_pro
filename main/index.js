const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { initDatabase } = require('./db');
const { createTray } = require('./tray');
const { registerIpcHandlers } = require('./ipc-handlers');
const { initScheduler } = require('./scheduler');
const { initUpdater } = require('./updater');
const { validateLicenseOnStartup } = require('./license');
const { getSetting } = require('./db/queries');

let mainWindow = null;
let tray = null;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return defaultValue;
}

// Enable live reload in development
if (process.env.NODE_ENV === 'development') {
  try {
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', 'node_modules', '.bin', 'electron'),
      hardResetMethod: 'exit'
    });
  } catch (_error) {
    console.warn('electron-reload not installed; continuing without live reload');
  }
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    frame: true,
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false
    }
  });

  const isDev = process.env.NODE_ENV === 'development';
  const indexPath = isDev
    ? 'http://localhost:5173'
    : `file://${path.join(__dirname, '../renderer/dist/index.html')}`;

  await mainWindow.loadURL(indexPath);

  if (isDev) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }

  mainWindow.on('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Remove default menu
  Menu.setApplicationMenu(null);
}

app.whenReady().then(async () => {
  // Initialize database
  await initDatabase();
  
  // Initialize email service
  try {
    const emailService = require('./services/email-service');
    const storedSettings = await getSetting('emailSettings');
    if (storedSettings) {
      const { decrypt } = require('../shared/utils/cryptoUtils');
      const settings = JSON.parse(storedSettings);
      
      // Decrypt sensitive data for initialization
      if (settings.provider === 'smtp' && settings.smtpPassword) {
        settings.smtpPassword = decrypt(settings.smtpPassword);
      } else if (settings.provider === 'sendgrid' && settings.sendgridApiKey) {
        settings.sendgridApiKey = decrypt(settings.sendgridApiKey);
      }
      
      await emailService.initialize(settings);
    }
  } catch (error) {
    console.warn('Failed to initialize email service:', error);
  }
  
  // Validate license
  const licenseResult = await validateLicenseOnStartup();
  if (!licenseResult || licenseResult.valid === false) {
    console.log('License validation failed');
  }
  
  // Create main window
  await createWindow();
  
  // Create system tray
  tray = createTray(mainWindow);
  
  // Register IPC handlers
  registerIpcHandlers(mainWindow);
  
  // Initialize scheduler
  await initScheduler(mainWindow);
  
  // Initialize auto-updater
  initUpdater(mainWindow);
  
  // Set auto-start on boot
  const startOnBoot = parseBoolean(getSetting('start_on_boot'), true);
  app.setLoginItemSettings({
    openAtLogin: startOnBoot,
    path: app.getPath('exe')
  });
});

app.on('window-all-closed', (event) => {
  // Don't quit on window close - keep in tray
  event.preventDefault();
  if (mainWindow) {
    mainWindow.hide();
  }
});

app.on('before-quit', () => {
  // Cleanup
  if (tray) tray.destroy();
});
