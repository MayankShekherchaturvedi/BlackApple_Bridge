const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blackAppleApi', {
  getDevices: () => ipcRenderer.invoke('adb:getDevices'),
  // We will add more handlers here later for push/pull/ls
});