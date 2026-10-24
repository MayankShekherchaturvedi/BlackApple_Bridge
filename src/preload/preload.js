const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('blackAppleApi', {
  getDevices: () => ipcRenderer.invoke('adb:getDevices'),
  listDirectory: (deviceId, path) => ipcRenderer.invoke('adb:listDirectory', deviceId, path),
  transferFile: (options) => ipcRenderer.invoke('adb:transfer', options),

  // Listener for the progress bar
  onTransferProgress: (callback) => {
    // Strip the event object and just pass the percentage integer to React
    const subscription = (event, percentage) => callback(percentage);
    ipcRenderer.on('transfer:progress', subscription);

    // Return a cleanup function so React can unmount the listener
    return () => {
      ipcRenderer.removeListener('transfer:progress', subscription);
    };
  }
});

