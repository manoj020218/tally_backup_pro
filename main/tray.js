const { Menu, Tray } = require('electron');
const path = require('path');

function createTray(mainWindow) {
  const tray = new Tray(path.join(__dirname, '../assets/icon.ico'));
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show',
      click: () => {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    {
      label: 'Backup Now',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('menu:backup-now');
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow.show();
        mainWindow.webContents.send('menu:open-settings');
      }
    },
    { type: 'separator' },
    {
      label: 'Exit',
      click: () => {
        mainWindow.destroy();
      }
    }
  ]);

  tray.setContextMenu(contextMenu);
  
  tray.on('click', () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

module.exports = { createTray };
