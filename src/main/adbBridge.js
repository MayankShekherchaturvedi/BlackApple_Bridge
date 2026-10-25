const { spawn, exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

// Dynamically locate the ADB binary based on whether the app is packaged
const getAdbPath = () => {
  const candidatePaths = [
    // 1. Packaged app resources
    app.isPackaged ? path.join(process.resourcesPath, "mac", "adb") : null,
    app.isPackaged
      ? path.join(
          process.resourcesPath,
          "app.asar.unpacked",
          "resources",
          "mac",
          "adb",
        )
      : null,
    // 2. Development resources directory
    path.join(app.getAppPath(), "resources", "mac", "adb"),
    // 3. Relative to __dirname (useful in out/main bundled builds)
    path.resolve(__dirname, "../../resources/mac/adb"),
    path.resolve(__dirname, "../resources/mac/adb"),
  ].filter(Boolean);

  for (const candidate of candidatePaths) {
    if (fs.existsSync(candidate)) {
      try {
        // Ensure executable permissions on macOS
        fs.chmodSync(candidate, 0o755);
      } catch (err) {
        console.warn("Could not chmod adb binary:", err.message);
      }
      return candidate;
    }
  }

  // Fallback to system adb in PATH
  return "adb";
};

const adbPath = getAdbPath();

// Helper to run ADB commands and return a Promise
const runAdbCommand = (args) => {
  return new Promise((resolve, reject) => {
    let adbProcess;
    try {
      adbProcess = spawn(adbPath, args);
    } catch (err) {
      return reject(
        new Error(`Failed to start ADB (${adbPath}): ${err.message}`),
      );
    }

    let output = "";
    let errorOutput = "";

    adbProcess.on("error", (err) => {
      reject(new Error(`ADB process error: ${err.message}`));
    });

    adbProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    adbProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    adbProcess.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ADB exited with code ${code}: ${errorOutput.trim() || output.trim()}`,
          ),
        );
      } else {
        resolve(output.trim());
      }
    });
  });
};

// Inspect physical USB devices connected on macOS via ioreg
const getAttachedUsbAndroidDevices = () => {
  return new Promise((resolve) => {
    if (process.platform !== "darwin") return resolve([]);
    exec(
      "ioreg -p IOUSB -w0 -l",
      { encoding: "utf8", timeout: 3000 },
      (err, stdout) => {
        if (err || !stdout) return resolve([]);
        try {
          const lines = stdout.split("\n");
          let currentDevice = null;
          const usbDevices = [];

          for (const line of lines) {
            if (line.includes("<class IOUSBHostDevice")) {
              const match = line.match(/\+-o ([^@]+)@/);
              currentDevice = { name: match ? match[1].trim() : "USB Device" };
              usbDevices.push(currentDevice);
            }
            if (currentDevice) {
              if (line.includes('"kUSBVendorString"')) {
                const m = line.match(/=\s*"([^"]+)"/);
                if (m) currentDevice.vendor = m[1];
              }
              if (line.includes('"kUSBProductString"')) {
                const m = line.match(/=\s*"([^"]+)"/);
                if (m) currentDevice.product = m[1];
              }
              if (line.includes('"kUSBSerialNumberString"')) {
                const m = line.match(/=\s*"([^"]+)"/);
                if (m) currentDevice.serial = m[1];
              }
              if (line.includes('"idVendor"')) {
                const m = line.match(/=\s*(\d+)/);
                if (m) currentDevice.vendorId = parseInt(m[1], 10);
              }
              if (line.includes('"idProduct"')) {
                const m = line.match(/=\s*(\d+)/);
                if (m) currentDevice.productId = parseInt(m[1], 10);
              }
            }
          }

          const androidVendors = [
            1256, // Samsung (0x04e8)
            6720, // Google / Pixel (0x18d1)
            10967, // Xiaomi (0x2717)
            8298, // OnePlus (0x2067)
            1142, // LG
            10260, // Motorola (0x22b8)
            1155, // Sony
            4817, // Huawei (0x12d1)
            11448, // Oppo / Realme (0x2cb7)
          ];

          const detected = usbDevices.filter(
            (d) =>
              androidVendors.includes(d.vendorId) ||
              /android|samsung|pixel|xiaomi|oneplus|motorola|oppo|vivo|realme|huawei/i.test(
                d.name || "",
              ) ||
              /android|samsung|pixel|xiaomi|oneplus|motorola|oppo|vivo|realme|huawei/i.test(
                d.product || "",
              ),
          );

          resolve(detected);
        } catch {
          resolve([]);
        }
      },
    );
  });
};

// Full device status including ADB and physical USB inspection
const getDeviceStatus = async () => {
  try {
    const output = await runAdbCommand(["devices"]);
    const lines = output.split(/\r?\n/);
    const authorized = [];
    const unauthorized = [];
    const offline = [];
    const rawDevices = [];
    let pastHeader = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!pastHeader) {
        if (trimmed.startsWith("List of devices attached")) {
          pastHeader = true;
        }
        continue;
      }

      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const id = parts[0];
        const status = parts[1];
        rawDevices.push({ id, status });
        if (status === "device") authorized.push(id);
        else if (status === "unauthorized") unauthorized.push(id);
        else if (status === "offline") offline.push(id);
      }
    }

    const usbAttached = await getAttachedUsbAndroidDevices();

    return {
      authorized,
      unauthorized,
      offline,
      rawDevices,
      usbAttached,
    };
  } catch (error) {
    console.error("Failed to get device status:", error);
    const usbAttached = await getAttachedUsbAndroidDevices();
    return {
      authorized: [],
      unauthorized: [],
      offline: [],
      rawDevices: [],
      usbAttached,
      error: error.message,
    };
  }
};

// Return connected and authorized device serial IDs
const getConnectedDevices = async () => {
  const status = await getDeviceStatus();
  return status.authorized || [];
};

// Restart ADB server daemon
const restartAdbServer = async () => {
  try {
    await runAdbCommand(["kill-server"]);
  } catch {
    // ignore
  }
  await runAdbCommand(["start-server"]);
  return true;
};

// Wireless ADB connect
const connectWireless = async (ip, port = 5555) => {
  const address = `${ip}:${port}`;
  return await runAdbCommand(["connect", address]);
};

// Robust directory listing using Android toybox/toolbox ls output parsing
const listDirectory = async (deviceId, directoryPath = "/sdcard") => {
  try {
    // Sanitize path (strip trailing slash unless root)
    const cleanPath =
      directoryPath.length > 1 && directoryPath.endsWith("/")
        ? directoryPath.slice(0, -1)
        : directoryPath;

    const output = await runAdbCommand([
      "-s",
      deviceId,
      "shell",
      "ls",
      "-lA",
      cleanPath,
    ]);
    const lines = output.split(/\r?\n/);
    const files = [];

    // Timestamp regex matches standard Linux / Android formats:
    // 2024-03-01 12:00 OR Oct 24 10:20 OR Oct 24 2023
    const timestampRegex =
      /(?:(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})|([A-Za-z]{3}\s+\d{1,2}\s+(?:\d{2}:\d{2}|\d{4})))\s+(.+)$/;

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        !trimmed ||
        trimmed.startsWith("total ") ||
        trimmed.startsWith("ls: ")
      )
        continue;

      const match = trimmed.match(timestampRegex);
      if (match) {
        const permissions = trimmed.split(/\s+/)[0];
        let name = match[3].trim();
        let isSymlink = permissions.startsWith("l");
        let isDirectory = permissions.startsWith("d");

        // Handle symlinks (e.g., 'sdcard -> /storage/self/primary')
        if (isSymlink && name.includes(" -> ")) {
          const symParts = name.split(" -> ");
          name = symParts[0].trim();
          // If the symlink points to a likely directory or sdcard
          if (
            symParts[1].includes("/") ||
            name.toLowerCase().includes("sdcard") ||
            name.toLowerCase().includes("storage")
          ) {
            isDirectory = true;
          }
        }

        // Ignore current and parent directory pointers
        if (name === "." || name === "..") continue;

        const parts = trimmed.split(/\s+/);
        // Approximate file size if present
        let size = null;
        if (!isDirectory && parts.length >= 5) {
          const sizePart = parseInt(parts[4], 10);
          if (!isNaN(sizePart)) size = sizePart;
        }

        files.push({
          name,
          isDirectory,
          path: cleanPath === "/" ? `/${name}` : `${cleanPath}/${name}`,
          permissions,
          size,
        });
      } else {
        // Fallback parser if timestamp format differs
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const permissions = parts[0];
          const isDirectory = permissions.startsWith("d");
          const name = parts
            .slice(parts.length > 7 ? 7 : parts.length - 1)
            .join(" ")
            .trim();
          if (name && name !== "." && name !== "..") {
            files.push({
              name,
              isDirectory,
              path: cleanPath === "/" ? `/${name}` : `${cleanPath}/${name}`,
              permissions,
              size: null,
            });
          }
        }
      }
    }

    // Sort: directories first, then alphabetically case-insensitive
    return files.sort((a, b) => {
      if (a.isDirectory === b.isDirectory) {
        return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
      }
      return a.isDirectory ? -1 : 1;
    });
  } catch (error) {
    console.error(`Failed to list directory ${directoryPath}:`, error);
    throw error;
  }
};

// Transfer file via adb push / pull with progress tracking
const transferFile = (deviceId, action, sourcePath, destPath, onProgress) => {
  return new Promise((resolve, reject) => {
    if (action !== "push" && action !== "pull") {
      return reject(
        new Error(
          `Invalid transfer action: "${action}". Must be "push" or "pull".`,
        ),
      );
    }

    const args = ["-s", deviceId, action, "-p", sourcePath, destPath];
    let adbProcess;

    try {
      adbProcess = spawn(adbPath, args);
    } catch (err) {
      return reject(
        new Error(`Failed to spawn ADB for transfer: ${err.message}`),
      );
    }

    // Match [ 45%] or [100%] or (45%)
    const progressRegex = /\[\s*(\d+)%\]|\(\s*(\d+)%\)/;

    const parseChunkForProgress = (data) => {
      const text = data.toString();
      const match = text.match(progressRegex);
      if (match) {
        const pct = parseInt(match[1] || match[2], 10);
        if (!isNaN(pct) && typeof onProgress === "function") {
          onProgress(pct);
        }
      }
    };

    adbProcess.on("error", (err) => {
      reject(new Error(`ADB transfer process failed: ${err.message}`));
    });

    adbProcess.stdout.on("data", parseChunkForProgress);

    let errorOutput = "";
    adbProcess.stderr.on("data", (data) => {
      parseChunkForProgress(data);
      errorOutput += data.toString();
    });

    adbProcess.on("close", (code) => {
      if (code === 0) {
        if (typeof onProgress === "function") onProgress(100);
        resolve();
      } else {
        // Strip out progress noise from error output
        const cleanedError = errorOutput
          .split(/\r?\n/)
          .filter((l) => !l.includes("%") && l.trim().length > 0)
          .join("\n");
        reject(
          new Error(
            `Transfer failed (exit code ${code}): ${cleanedError || "Unknown ADB error"}`,
          ),
        );
      }
    });
  });
};

module.exports = {
  getAdbPath,
  getConnectedDevices,
  getDeviceStatus,
  restartAdbServer,
  connectWireless,
  listDirectory,
  runAdbCommand,
  transferFile,
};
