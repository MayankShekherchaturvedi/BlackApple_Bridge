const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { getConnectedDevices } = require('./adbBridge');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      nodeIntegration: false, // Security best practice
      contextIsolation: true
    }
  });

  // In development, load the React dev server (adjust port as needed)
  // In production, load the built index.html
  if (!app.isPackaged) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Register IPC Handlers
  ipcMain.handle('adb:getDevices', async () => {
    return await getConnectedDevices();
  });

  ipcMain.handle('adb:listDirectory', async (event, deviceId, path) => {
    const { listDirectory } = require('./adbBridge');
    return await listDirectory(deviceId, path);
  });

  ipcMain.handle('adb:transfer', async (event, { deviceId, action, source, dest }) => {
    const { transferFile } = require('./adbBridge');

    try {
      await transferFile(deviceId, action, source, dest, (percentage) => {
        // Stream the progress back to the frontend over a dedicated channel
        event.sender.send('transfer:progress', percentage);
      });
      return { success: true };
    } catch (error) {
      console.error('Transfer Error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('get-downloads-path', () => {
    return app.getPath('downloads');
  });

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});