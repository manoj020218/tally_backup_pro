const { app, BrowserWindow } = require('electron');
const path = require('path');

describe('Main Process', () => {
  let mainWindow;

  beforeEach(() => {
    // Mock electron app
    jest.mock('electron', () => ({
      app: {
        on: jest.fn(),
        whenReady: jest.fn().mockResolvedValue(),
        getPath: jest.fn().mockReturnValue('/tmp'),
        quit: jest.fn()
      },
      BrowserWindow: jest.fn().mockImplementation(() => ({
        loadFile: jest.fn(),
        on: jest.fn(),
        show: jest.fn(),
        webContents: {
          openDevTools: jest.fn()
        }
      }))
    }));
  });

  test('should create main window', () => {
    const createWindow = require('../main/index.js').createWindow;

    createWindow();

    expect(BrowserWindow).toHaveBeenCalledWith({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: expect.any(String)
      }
    });
  });

  test('should handle app ready event', () => {
    const { createWindow } = require('../main/index.js');

    // Simulate app ready
    app.whenReady.mockResolvedValue();

    expect(app.whenReady).toHaveBeenCalled();
  });
});