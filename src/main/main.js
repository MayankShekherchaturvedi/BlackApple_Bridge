const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const {
  getConnectedDevices,
  listDirectory,
  transferFile,
} = require("./adbBridge");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 740,
    minWidth: 800,
    minHeight: 560,
    title: "BlackApple Bridge",
    backgroundColor: "#0f172a",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  });

  // electron-vite sets ELECTRON_RENDERER_URL in dev mode
  if (process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else if (!app.isPackaged) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  // IPC Handlers
  ipcMain.handle("adb:getDevices", async () => {
    try {
      return await getConnectedDevices();
    } catch (err) {
      console.error("IPC adb:getDevices error:", err);
      return [];
    }
  });

  ipcMain.handle("adb:listDirectory", async (event, deviceId, dirPath) => {
    try {
      return await listDirectory(deviceId, dirPath);
    } catch (err) {
      console.error("IPC adb:listDirectory error:", err);
      throw err;
    }
  });

  ipcMain.handle(
    "adb:transfer",
    async (event, { deviceId, action, source, dest }) => {
      try {
        await transferFile(deviceId, action, source, dest, (percentage) => {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send("transfer:progress", percentage);
          }
        });
        return { success: true };
      } catch (error) {
        console.error("IPC adb:transfer error:", error);
        return { success: false, error: error.message };
      }
    },
  );

  // Downloads directory paths (supported under both channel names)
  const getDownloadsHandler = () => app.getPath("downloads");
  ipcMain.handle("get-downloads-path", getDownloadsHandler);
  ipcMain.handle("adb:getDownloadsPath", getDownloadsHandler);

  // Shell integrations
  ipcMain.handle("shell:showItemInFolder", async (event, fullPath) => {
    if (fullPath) shell.showItemInFolder(fullPath);
    return true;
  });

  ipcMain.handle("shell:openPath", async (event, fullPath) => {
    if (fullPath) await shell.openPath(fullPath);
    return true;
  });

  // Native macOS file picker dialog
  ipcMain.handle("dialog:selectFiles", async () => {
    if (!mainWindow) return [];
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ["openFile", "multiSelections"],
      title: "Select Files to Send to Android",
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths;
    }
    return [];
  });

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});
