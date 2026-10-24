const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blackAppleApi', {
  getDevices: () => ipcRenderer.invoke('adb:getDevices'),
  listDirectory: (deviceId, path) => ipcRenderer.invoke('adb:listDirectory', deviceId, path)
});