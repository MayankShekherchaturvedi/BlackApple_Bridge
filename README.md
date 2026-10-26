# 🍎 BlackApple Bridge

<p align="center">
  <strong>A high-speed, modern macOS desktop bridge for seamless file management and transfers between macOS and Android devices via ADB.</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-macOS%20(Apple%20Silicon%20%26%20Intel)-black?style=flat-square&logo=apple" alt="macOS" />
  <img src="https://img.shields.io/badge/Android-USB%20%26%20Wireless%20ADB-green?style=flat-square&logo=android" alt="Android" />
  <img src="https://img.shields.io/badge/Electron-44-47848F?style=flat-square&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Bundler-electron--vite-blueviolet?style=flat-square" alt="electron-vite" />
</p>

---

## 📖 Overview

**BlackApple Bridge** provides a seamless, macOS-native experience for interacting with your Android devices. Unlike standard MTP file transfer utilities which are often sluggish or prone to disconnects, BlackApple Bridge utilizes the **Android Debug Bridge (ADB)** to transfer files at full hardware bus speeds, with real-time progress tracking, live directory browsing, and intelligent device diagnostics.

---

## ✨ Features

- ⚡ **High-Speed File Transfer**: Native ADB `push` and `pull` streaming with real-time percentage progress and cancel support.
- 📁 **Interactive Android Explorer**:
  - Browse phone storage (`/sdcard`, `Download`, `DCIM`, `Pictures`, `Documents`).
  - Search and filter files by name instantly.
  - Recognizes file types (Images, Videos, Audio, APKs, Documents, Archives) with distinct icons and formatted file sizes.
- 📥 **Intuitive Drag & Drop**:
  - Drag files from Mac Finder directly into the drop zone to push them to the active Android directory.
  - Native macOS file picker fallback (`dialog.showOpenDialog`) to select files with a click.
- 🔍 **Hardware-Level Diagnostics**:
  - Inspects macOS USB hardware registries (`ioreg`) to recognize connected phones even when **USB Debugging** is turned off.
  - Clear real-time status banners:
    - **Connected & Ready**: Ready for transfer.
    - **Unauthorized**: Detects phone waiting for the user to tap "Allow" on screen.
    - **USB Connected (Debugging Off)**: Detects physical USB connection and provides a step-by-step guide to enable USB debugging.
- 📡 **Wireless ADB Connect**: Connect and transfer over Wi-Fi without cables (`IP:Port`).
- 📂 **macOS Shell Integration**:
  - One-click **"Show in Finder"** after pulling files.
  - One-click **"Mac Downloads"** button to jump straight to your downloads directory.
- 🎨 **Modern macOS Design**: Built with dark mode, frosted glassmorphism, responsive navigation, and native macOS window dragging and traffic light controls.

---

## 🛠️ Architecture & Tech Stack

| Layer                  | Technology                                                                  |
| ---------------------- | --------------------------------------------------------------------------- |
| **Runtime**            | [Electron 44](https://www.electronjs.org/)                                  |
| **Frontend Framework** | [React 19](https://react.dev/)                                              |
| **Styling**            | [Tailwind CSS v4](https://tailwindcss.com/) + PostCSS                       |
| **Build & Dev Tool**   | [electron-vite](https://electron-vite.org/) + [Vite 8](https://vitejs.dev/) |
| **Packaging**          | [electron-builder](https://www.electron.build/) (Apple Silicon `arm64` DMG) |
| **Core Bridge**        | Bundled Standalone Android Debug Bridge (ADB)                               |

---

## 🚀 Getting Started

### Prerequisites

- macOS (macOS Monterey, Ventura, Sonoma, Sequoia, or later).
- [Node.js](https://nodejs.org/) (v18 or later recommended).
- [npm](https://www.npmjs.com/).

### Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/MayankShekherchaturvedi/BlackApple_Bridge.git
   cd BlackApple_Bridge
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Start the application in Development Mode**:
   ```bash
   npm run dev
   ```

---

## 📦 Building the macOS DMG Installer

To bundle the application into a standalone macOS `.dmg` installer:

```bash
npm run build:mac
```

The output DMG will be generated in:

```
dist/BlackApple Bridge-1.0.0-arm64.dmg
```

To mount and install:

```bash
open "dist/BlackApple Bridge-1.0.0-arm64.dmg"
```

Drag **BlackApple Bridge** into your **Applications** folder.

> **Why is the DMG ~136 MB?**  
> Electron applications bundle a self-contained Chromium browser engine and Node.js runtime, plus the standalone macOS ADB binary (`resources/mac/adb`). The uncompressed application bundle is ~307 MB, which is compressed into a ~136 MB DMG.

---

## 📱 Android Device Setup

For BlackApple Bridge to communicate with your Android phone, **USB Debugging** must be enabled:

### Step-by-Step Instructions:

1. Open **Settings** on your Android device.
2. Scroll to the bottom and select **About phone** (or **Software information** on Samsung).
3. Tap **Build number** **7 times rapidly** until you see the notification: _"You are now a developer!"_.
4. Return to the main **Settings** menu and open **Developer options** (usually located at the very bottom or under _System_).
5. Find **USB debugging** and toggle it **ON**.
6. When prompted on your phone's screen with **"Allow USB debugging?"**:
   - Check **"Always allow from this computer"**.
   - Tap **Allow**.

### Wireless Debugging (No Cable):

1. Ensure your Mac and Android phone are on the **same Wi-Fi network**.
2. On your phone, go to **Settings > Developer options > Wireless debugging** and toggle it **ON**.
3. Tap **Wireless debugging** to view your device's **IP address and Port** (e.g., `192.168.1.50:5555`).
4. In BlackApple Bridge, click **📡 Wireless ADB**, enter the IP address and Port, and click **Connect**.

---

## 📂 Project Structure

```
BlackApple_Bridge/
├── build/                        # Packaging assets and macOS entitlements
│   ├── entitlements.mac.plist
│   └── entitlements.mac.inherit.plist
├── dist/                         # Packaged output (DMG and .app)
├── out/                          # Transpiled build output (main, preload, renderer)
├── resources/                    # Bundled external binaries
│   └── mac/
│       └── adb                   # macOS standalone ADB binary
├── src/
│   ├── main/                     # Electron Main Process
│   │   ├── adbBridge.js          # ADB child process runner, USB detector & parsers
│   │   └── main.js               # Window lifecycle & IPC handler registrations
│   ├── preload/                  # Electron Preload Scripts
│   │   └── preload.js            # contextBridge API exposing safe IPC methods
│   └── renderer/                 # React Frontend Application
│       ├── components/
│       │   ├── DropZone.jsx      # Drag-and-drop & native file chooser
│       │   ├── FileExplorer.jsx  # Interactive Android file directory browser
│       │   └── ProgressBar.jsx   # Transfer modal with real-time progress
│       ├── styles/
│       │   └── globals.css       # Tailwind CSS v4 styling & glassmorphism
│       ├── app.jsx               # Main UI, device switcher, status banners
│       ├── index.html            # HTML entry point with CSP configuration
│       └── main.jsx              # React root mount
├── electron-builder.yml          # macOS DMG & packaging configuration
├── electron.vite.config.mjs      # electron-vite configuration with React & Tailwind
├── eslint.config.mjs             # ESLint 9 Flat Config
├── package.json                  # Scripts and dependencies
└── postcss.config.js             # PostCSS Tailwind v4 configuration
```

---

## 🔌 IPC Bridge API Reference

The frontend interacts with the Electron main process via `window.blackAppleApi`:

| Method                          | Parameters                           | Returns                       | Description                                                                                      |
| ------------------------------- | ------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `getDevices()`                  | `void`                               | `Promise<string[]>`           | Returns array of authorized ADB device IDs.                                                      |
| `getDeviceStatus()`             | `void`                               | `Promise<Object>`             | Returns comprehensive status: authorized, unauthorized, offline, and macOS USB attached devices. |
| `restartAdb()`                  | `void`                               | `Promise<boolean>`            | Restarts the ADB daemon (`kill-server` followed by `start-server`).                              |
| `connectWireless(ip, port)`     | `ip: string, port: string`           | `Promise<string>`             | Connects to an Android device over Wi-Fi.                                                        |
| `listDirectory(deviceId, path)` | `deviceId: string, path: string`     | `Promise<FileItem[]>`         | Lists Android files and directories at the given path.                                           |
| `transferFile(options)`         | `{ deviceId, action, source, dest }` | `Promise<{ success, error }>` | Executes an ADB `push` or `pull` transfer with progress tracking.                                |
| `getDownloadsPath()`            | `void`                               | `Promise<string>`             | Returns macOS user's Downloads folder path.                                                      |
| `showItemInFolder(path)`        | `path: string`                       | `Promise<boolean>`            | Highlights a file in macOS Finder.                                                               |
| `openPath(path)`                | `path: string`                       | `Promise<boolean>`            | Opens a directory in macOS Finder.                                                               |
| `selectFiles()`                 | `void`                               | `Promise<string[]>`           | Opens native macOS dialog to pick files from disk.                                               |
| `getPathForFile(file)`          | `file: File`                         | `string`                      | Safe Electron 30+ / 44+ file path resolution from DragEvent.                                     |
| `onTransferProgress(callback)`  | `(percentage: number) => void`       | `() => void`                  | Subscribes to real-time progress percentage stream; returns cleanup function.                    |

---

## 🛠️ Available Scripts

- `npm run dev`: Starts the application in development mode with HMR and Fast Refresh.
- `npm run build`: Bundles the main, preload, and renderer processes using `electron-vite`.
- `npm run build:mac`: Packages the application into an Apple Silicon macOS `.dmg` installer.
- `npm run build:win`: Builds the Windows installer.
- `npm run build:linux`: Builds Linux packages (AppImage, snap, deb).
- `npm run lint`: Runs ESLint 9 checks across the codebase.
- `npm run format`: Formats all source files with Prettier.

---

## ❓ Troubleshooting

#### 1. Device is plugged in via USB, but BlackApple Bridge says "USB Connected (Debugging Off)"

- Your Mac detects the phone hardware, but Android has disabled ADB communication.
- Follow the prompt shown in the app: Go to **Settings > Developer options** on your phone and enable **USB debugging**.

#### 2. Device says "Device unauthorized"

- Unlock your phone screen.
- A popup will prompt: _"Allow USB debugging?"_. Check _"Always allow from this computer"_ and tap **Allow**.

#### 3. ADB binary execution permission on macOS

- The bundled binary at `resources/mac/adb` is automatically granted `0755` permissions by the app. If needed, you can manually verify:
  ```bash
  chmod +x resources/mac/adb
  ```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
