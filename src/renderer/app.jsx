import React, { useState, useEffect, useRef } from "react";
import FileExplorer from "./components/FileExplorer";
import DropZone from "./components/DropZone";
import ProgressBar from "./components/ProgressBar";

export default function App() {
  const [devices, setDevices] = useState([]);
  const [activeDevice, setActiveDevice] = useState(null);
  const [currentAndroidPath, setCurrentAndroidPath] = useState("/sdcard");
  const [activeTransfer, setActiveTransfer] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [notification, setNotification] = useState(null);

  const fileExplorerRef = useRef(null);

  const showNotification = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.msg === msg ? null : prev));
    }, 4000);
  };

  // Scan for connected Android devices via ADB
  const refreshDevices = async () => {
    setIsScanning(true);
    try {
      if (window.blackAppleApi?.getDevices) {
        const foundDevices = await window.blackAppleApi.getDevices();
        setDevices(foundDevices || []);
        if (foundDevices && foundDevices.length > 0) {
          if (!activeDevice || !foundDevices.includes(activeDevice)) {
            setActiveDevice(foundDevices[0]);
          }
        } else {
          setActiveDevice(null);
        }
      }
    } catch (err) {
      console.error("Device scan error:", err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    refreshDevices();
    // Periodic light polling for hotplugged devices
    const interval = setInterval(refreshDevices, 5000);
    return () => clearInterval(interval);
  }, []);

  // Push: Mac to Android
  const handleFileDrop = (macFilePath, fileName) => {
    if (!activeDevice) {
      showNotification(
        "No Android device connected. Please connect your device.",
        "error",
      );
      return;
    }

    if (!macFilePath) {
      showNotification("Could not resolve file path.", "error");
      return;
    }

    const cleanDestPath = currentAndroidPath.endsWith("/")
      ? `${currentAndroidPath}${fileName}`
      : `${currentAndroidPath}/${fileName}`;

    setActiveTransfer({
      deviceId: activeDevice,
      action: "push",
      source: macFilePath,
      dest: cleanDestPath,
      fileName,
    });
  };

  // Pull: Android to Mac (Downloads folder)
  const handleFileDownload = async (file) => {
    if (!activeDevice) return;

    try {
      let macDownloadsPath = "/Users/mightylore/Downloads";
      if (window.blackAppleApi?.getDownloadsPath) {
        const p = await window.blackAppleApi.getDownloadsPath();
        if (p) macDownloadsPath = p;
      }

      setActiveTransfer({
        deviceId: activeDevice,
        action: "pull",
        source: file.path,
        dest: `${macDownloadsPath}/${file.name}`,
        fileName: file.name,
      });
    } catch (err) {
      console.error("Failed to get downloads path:", err);
      showNotification("Failed to locate Downloads directory.", "error");
    }
  };

  const handleOpenDownloadsFolder = async () => {
    try {
      if (
        window.blackAppleApi?.getDownloadsPath &&
        window.blackAppleApi?.openPath
      ) {
        const p = await window.blackAppleApi.getDownloadsPath();
        if (p) await window.blackAppleApi.openPath(p);
      }
    } catch (err) {
      console.error("Failed to open downloads folder:", err);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 select-none overflow-hidden font-sans">
      {/* Top Application Header with macOS Window Drag support */}
      <header
        style={{ WebkitAppRegion: "drag" }}
        className="pl-20 pr-6 pt-5 pb-4 bg-slate-900/60 border-b border-slate-800/80 backdrop-blur-md flex items-center justify-between shrink-0"
      >
        <div className="flex items-center space-x-3 select-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 p-[1px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-slate-950 rounded-xl flex items-center justify-center text-xl">
              🍎
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-200 bg-clip-text text-transparent">
                BlackApple Bridge
              </h1>
              <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-full bg-indigo-950/80 text-indigo-400 border border-indigo-500/30">
                macOS ↔ Android
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              High-speed ADB file bridge and explorer
            </p>
          </div>
        </div>

        {/* Device selector & status controls (no-drag) */}
        <div
          style={{ WebkitAppRegion: "no-drag" }}
          className="flex items-center space-x-3"
        >
          <button
            id="btn-open-downloads"
            onClick={handleOpenDownloadsFolder}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 rounded-xl border border-slate-700/60 transition-all shadow-sm flex items-center gap-1.5"
            title="Open Mac Downloads folder"
          >
            <span>📥</span>
            <span>Mac Downloads</span>
          </button>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1 px-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeDevice
                  ? "bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse"
                  : "bg-slate-600"
              }`}
            ></span>

            {devices.length > 1 ? (
              <select
                id="select-active-device"
                value={activeDevice || ""}
                onChange={(e) => setActiveDevice(e.target.value)}
                className="bg-transparent text-xs text-slate-200 font-mono focus:outline-none cursor-pointer pr-1"
              >
                {devices.map((dev) => (
                  <option
                    key={dev}
                    value={dev}
                    className="bg-slate-900 text-slate-200"
                  >
                    {dev}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-xs font-mono font-medium text-slate-300">
                {activeDevice ? activeDevice : "No device"}
              </span>
            )}

            <button
              id="btn-scan-devices"
              onClick={refreshDevices}
              disabled={isScanning}
              className="p-1 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition-colors"
              title="Rescan devices"
            >
              <svg
                className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-indigo-400" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 p-5 overflow-y-auto flex flex-col space-y-4">
        {/* Notification Toast */}
        {notification && (
          <div
            className={`px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between border shadow-lg transition-all animate-in fade-in ${
              notification.type === "error"
                ? "bg-rose-950/80 text-rose-300 border-rose-500/30"
                : "bg-indigo-950/80 text-indigo-300 border-indigo-500/30"
            }`}
          >
            <span>{notification.msg}</span>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white ml-2"
            >
              ✕
            </button>
          </div>
        )}

        {/* Device disconnected warning banner */}
        {!activeDevice && (
          <div className="bg-amber-950/30 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between text-amber-200/90 text-xs">
            <div className="flex items-center space-x-3">
              <span className="text-xl">⚡</span>
              <div>
                <p className="font-semibold text-amber-200">
                  No Android device detected
                </p>
                <p className="text-amber-300/70 text-[11px] mt-0.5">
                  Plug your Android phone via USB and enable{" "}
                  <strong>USB Debugging</strong> in Developer Options.
                </p>
              </div>
            </div>
            <button
              onClick={refreshDevices}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30 font-medium transition-colors shrink-0"
            >
              Scan Again
            </button>
          </div>
        )}

        {/* File Explorer Component */}
        <div className="flex-1 min-h-[360px]">
          <FileExplorer
            ref={fileExplorerRef}
            activeDevice={activeDevice}
            onPathChange={(newPath) => setCurrentAndroidPath(newPath)}
            onFileClick={handleFileDownload}
          />
        </div>

        {/* Drop Zone for Push Transfers */}
        <DropZone onFileDropped={handleFileDrop} disabled={!activeDevice} />

        {/* Active Transfer Progress Card */}
        {activeTransfer && (
          <ProgressBar
            deviceId={activeTransfer.deviceId}
            action={activeTransfer.action}
            source={activeTransfer.source}
            dest={activeTransfer.dest}
            fileName={activeTransfer.fileName}
            onComplete={() => {
              showNotification(
                activeTransfer.action === "push"
                  ? `Uploaded ${activeTransfer.fileName} to Android`
                  : `Downloaded ${activeTransfer.fileName} to Mac Downloads`,
                "success",
              );
              // Refresh Android directory listing after push transfer
              if (activeTransfer.action === "push") {
                fileExplorerRef.current?.refresh();
              }
            }}
            onCancel={() => setActiveTransfer(null)}
          />
        )}
      </main>
    </div>
  );
}
