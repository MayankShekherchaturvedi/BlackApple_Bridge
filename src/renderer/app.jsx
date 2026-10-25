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

  const [deviceStatus, setDeviceStatus] = useState({
    authorized: [],
    unauthorized: [],
    offline: [],
    rawDevices: [],
    usbAttached: [],
  });

  const [showWirelessModal, setShowWirelessModal] = useState(false);
  const [wirelessIp, setWirelessIp] = useState("");
  const [wirelessPort, setWirelessPort] = useState("5555");
  const [isConnectingWireless, setIsConnectingWireless] = useState(false);

  const fileExplorerRef = useRef(null);

  const showNotification = (msg, type = "info") => {
    setNotification({ msg, type });
    setTimeout(() => {
      setNotification((prev) => (prev?.msg === msg ? null : prev));
    }, 5000);
  };

  // Scan for connected Android devices via ADB and USB
  const refreshDevices = async () => {
    setIsScanning(true);
    try {
      if (window.blackAppleApi?.getDeviceStatus) {
        const status = await window.blackAppleApi.getDeviceStatus();
        setDeviceStatus(status);
        const authorized = status.authorized || [];
        setDevices(authorized);
        if (authorized.length > 0) {
          if (!activeDevice || !authorized.includes(activeDevice)) {
            setActiveDevice(authorized[0]);
          }
        } else {
          setActiveDevice(null);
        }
      } else if (window.blackAppleApi?.getDevices) {
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

  // Restart the ADB server daemon
  const handleRestartAdb = async () => {
    setIsScanning(true);
    showNotification("Restarting ADB server daemon...", "info");
    try {
      if (window.blackAppleApi?.restartAdb) {
        await window.blackAppleApi.restartAdb();
      }
      await refreshDevices();
      showNotification("ADB daemon restarted successfully.", "info");
    } catch (err) {
      console.error("Restart ADB error:", err);
      showNotification(`Failed to restart ADB: ${err.message}`, "error");
    } finally {
      setIsScanning(false);
    }
  };

  // Connect via Wireless ADB
  const handleConnectWireless = async (e) => {
    e.preventDefault();
    if (!wirelessIp) return;
    setIsConnectingWireless(true);
    try {
      if (window.blackAppleApi?.connectWireless) {
        const result = await window.blackAppleApi.connectWireless(
          wirelessIp.trim(),
          wirelessPort.trim() || "5555",
        );
        showNotification(
          result || "Connected to wireless device",
          result?.toLowerCase().includes("connected") ? "info" : "error",
        );
      }
      setShowWirelessModal(false);
      await refreshDevices();
    } catch (err) {
      showNotification(`Wireless connect failed: ${err.message}`, "error");
    } finally {
      setIsConnectingWireless(false);
    }
  };

  useEffect(() => {
    refreshDevices();
    // Periodic light polling every 3 seconds for hotplugged or newly authorized devices
    const interval = setInterval(refreshDevices, 3000);
    return () => clearInterval(interval);
  }, [activeDevice]);

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

          <button
            id="btn-wireless-connect"
            onClick={() => setShowWirelessModal(true)}
            className="px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/40 rounded-xl border border-indigo-500/30 transition-all shadow-sm flex items-center gap-1.5"
            title="Connect device over Wi-Fi"
          >
            <span>📡</span>
            <span>Wireless ADB</span>
          </button>

          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl p-1 px-2.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeDevice
                  ? "bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse"
                  : deviceStatus.unauthorized.length > 0 ||
                      deviceStatus.usbAttached.length > 0
                    ? "bg-amber-400 shadow-sm shadow-amber-400/50 animate-pulse"
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
                {activeDevice
                  ? activeDevice
                  : deviceStatus.unauthorized.length > 0
                    ? "Device unauthorized"
                    : deviceStatus.usbAttached.length > 0
                      ? `${deviceStatus.usbAttached[0].vendor || "USB Device"} (Need Debugging)`
                      : "No device"}
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

        {/* Diagnostic Card 1: ADB Device detected but Unauthorized */}
        {!activeDevice && deviceStatus.unauthorized.length > 0 && (
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-2xl p-4 text-amber-200 text-xs shadow-lg animate-in fade-in">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <span className="text-2xl mt-0.5">⚠️</span>
                <div>
                  <p className="font-bold text-sm text-amber-200">
                    Android Device Detected ({deviceStatus.unauthorized[0]}),
                    Permission Required!
                  </p>
                  <p className="text-amber-300/80 mt-1">
                    Please unlock your phone screen right now. You should see a
                    prompt: <strong>"Allow USB debugging?"</strong>
                  </p>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/30 text-[11px] font-mono">
                      ✓ Check "Always allow from this computer" → Tap "Allow"
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={refreshDevices}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500/30 hover:bg-amber-500/40 border border-amber-500/40 text-amber-200 font-medium transition-colors shrink-0"
              >
                I tapped Allow
              </button>
            </div>
          </div>
        )}

        {/* Diagnostic Card 2: USB Device detected by macOS, but USB Debugging is OFF on phone */}
        {!activeDevice &&
          deviceStatus.unauthorized.length === 0 &&
          deviceStatus.usbAttached.length > 0 && (
            <div className="bg-indigo-950/40 border border-indigo-500/30 rounded-2xl p-4 text-slate-200 text-xs shadow-lg animate-in fade-in">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3">
                  <span className="text-2xl mt-0.5">🔌</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-indigo-200">
                        {deviceStatus.usbAttached[0].vendor || "Android"} Phone
                        Detected via USB
                      </p>
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] font-mono text-indigo-300">
                        {deviceStatus.usbAttached[0].serial ||
                          deviceStatus.usbAttached[0].name}
                      </span>
                    </div>
                    <p className="text-slate-300 mt-1">
                      Your phone is connected via cable, but{" "}
                      <strong className="text-amber-300">
                        USB Debugging is currently OFF
                      </strong>{" "}
                      on the phone. Enable it so ADB can connect:
                    </p>

                    <div className="mt-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
                      <p className="font-semibold text-indigo-300">
                        How to enable USB Debugging on your phone:
                      </p>
                      <ol className="list-decimal list-inside space-y-1 text-slate-300">
                        <li>
                          Open <strong>Settings</strong> on your phone → tap{" "}
                          <strong>About phone</strong> (or Software info).
                        </li>
                        <li>
                          Tap <strong>Build number</strong> 7 times rapidly
                          until you see <em>"Developer mode turned on"</em>.
                        </li>
                        <li>
                          Go back to <strong>Settings</strong> → open{" "}
                          <strong>Developer options</strong>.
                        </li>
                        <li>
                          Turn <strong>USB debugging</strong> to{" "}
                          <span className="text-emerald-400 font-semibold">
                            ON
                          </span>
                          .
                        </li>
                        <li>
                          Unlock screen and tap{" "}
                          <span className="text-emerald-400 font-semibold">
                            Allow
                          </span>{" "}
                          when prompted.
                        </li>
                      </ol>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 shrink-0">
                  <button
                    onClick={refreshDevices}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-md flex items-center justify-center gap-1.5"
                  >
                    <span>🔄</span>
                    <span>Check Again</span>
                  </button>
                  <button
                    onClick={handleRestartAdb}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors border border-slate-700"
                    title="Restart background ADB daemon"
                  >
                    Restart ADB
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Diagnostic Card 3: No device at all */}
        {!activeDevice &&
          deviceStatus.unauthorized.length === 0 &&
          deviceStatus.usbAttached.length === 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-center justify-between text-slate-300 text-xs">
              <div className="flex items-center space-x-3">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="font-semibold text-slate-200">
                    No Android device detected
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    Connect your Android phone using a USB data cable and enable{" "}
                    <strong>USB Debugging</strong>, or connect via Wi-Fi.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowWirelessModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors"
                >
                  Connect Wi-Fi
                </button>
                <button
                  onClick={refreshDevices}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors"
                >
                  Scan Again
                </button>
              </div>
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

      {/* Wireless ADB Connection Modal */}
      {showWirelessModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>📡</span> Connect via Wireless ADB
              </h3>
              <button
                onClick={() => setShowWirelessModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Ensure your phone and Mac are on the same Wi-Fi network. In{" "}
              <strong>Developer options</strong>, turn on{" "}
              <strong>Wireless debugging</strong> and enter the IP address &
              port shown on your phone.
            </p>

            <form onSubmit={handleConnectWireless} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Device IP Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.50"
                  value={wirelessIp}
                  onChange={(e) => setWirelessIp(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-100 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Port
                </label>
                <input
                  type="text"
                  placeholder="5555"
                  value={wirelessPort}
                  onChange={(e) => setWirelessPort(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-xs text-slate-100 rounded-xl px-3 py-2 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowWirelessModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnectingWireless || !wirelessIp}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                >
                  {isConnectingWireless ? "Connecting..." : "Connect"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
