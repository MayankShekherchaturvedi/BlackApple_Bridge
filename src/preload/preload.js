const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("blackAppleApi", {
  getDevices: () => ipcRenderer.invoke("adb:getDevices"),
  getDeviceStatus: () => ipcRenderer.invoke("adb:getDeviceStatus"),
  restartAdb: () => ipcRenderer.invoke("adb:restartServer"),
  connectWireless: (ip, port) =>
    ipcRenderer.invoke("adb:connectWireless", ip, port),
  listDirectory: (deviceId, path) =>
    ipcRenderer.invoke("adb:listDirectory", deviceId, path),
  transferFile: (options) => ipcRenderer.invoke("adb:transfer", options),
  getDownloadsPath: () => ipcRenderer.invoke("get-downloads-path"),
  showItemInFolder: (filePath) =>
    ipcRenderer.invoke("shell:showItemInFolder", filePath),
  openPath: (dirPath) => ipcRenderer.invoke("shell:openPath", dirPath),
  selectFiles: () => ipcRenderer.invoke("dialog:selectFiles"),

  // Safe file path resolution for Electron 30+ / 44+
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === "function") {
        const resolved = webUtils.getPathForFile(file);
        if (resolved) return resolved;
      }
    } catch (e) {
      console.warn("getPathForFile fallback:", e);
    }
    return file.path || "";
  },

  // Listener for the transfer progress
  onTransferProgress: (callback) => {
    const subscription = (event, percentage) => callback(percentage);
    ipcRenderer.on("transfer:progress", subscription);

    return () => {
      ipcRenderer.removeListener("transfer:progress", subscription);
    };
  },
});
