const { spawn } = require('child_process');
const path = require('path');
const { app } = require('electron');

// Dynamically locate the ADB binary based on whether the app is packaged
const getAdbPath = () => {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'mac', 'adb');
    }
    // In development, resolve relative to the project root
    return path.join(app.getAppPath(), 'resources', 'mac', 'adb');
};

const adbPath = getAdbPath();

// Helper to run ADB commands and return a Promise
const runAdbCommand = (args) => {
    return new Promise((resolve, reject) => {
        const adbProcess = spawn(adbPath, args);
        let output = '';
        let errorOutput = '';

        adbProcess.stdout.on('data', (data) => {
            output += data.toString();
        });

        adbProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        adbProcess.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`ADB exited with code ${code}: ${errorOutput}`));
            } else {
                resolve(output.trim());
            }
        });
    });
};

// Specific ADB functions
const getConnectedDevices = async () => {
    try {
        const output = await runAdbCommand(['devices']);
        // Parse the output string into an array of device IDs
        const lines = output.split('\n').slice(1); // Skip the "List of devices attached" line
        return lines
            .filter(line => line.includes('device') && !line.includes('unauthorized'))
            .map(line => line.split('\t')[0]);
    } catch (error) {
        console.error('Failed to get devices:', error);
        return [];
    }
};

// Add this below your getConnectedDevices function

const listDirectory = async (deviceId, directoryPath = '/sdcard') => {
    try {
        // Run 'ls -lA' to get detailed list, including hidden files
        const output = await runAdbCommand(['-s', deviceId, 'shell', 'ls', '-lA', directoryPath]);
        const lines = output.split('\n');
        const files = [];

        for (const line of lines) {
            if (!line || line.startsWith('total')) continue;

            // Parse standard Linux 'ls -l' output
            // Example line: drwxrwx--- 2 root everybdy 4096 2023-10-24 10:20 Download
            const parts = line.split(/\s+/);
            if (parts.length >= 7) {
                const permissions = parts[0];
                const isDirectory = permissions.startsWith('d');
                const name = parts.slice(parts.length > 8 ? 7 : 6).join(' '); // Rejoin names with spaces

                files.push({
                    name,
                    isDirectory,
                    path: `${directoryPath === '/' ? '' : directoryPath}/${name}`,
                    permissions
                });
            }
        }

        // Sort directories first, then alphabetically
        return files.sort((a, b) => {
            if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
            return a.isDirectory ? -1 : 1;
        });

    } catch (error) {
        console.error(`Failed to list directory ${directoryPath}:`, error);
        throw error;
    }
};

const transferFile = (deviceId, action, sourcePath, destPath, onProgress) => {
    return new Promise((resolve, reject) => {
        // action must be 'push' or 'pull'
        const args = ['-s', deviceId, action, '-p', sourcePath, destPath];
        const adbProcess = spawn(adbPath, args);

        // Regex to catch ADB's progress format: "[ 45%]" or "[100%]"
        const progressRegex = /\[\s*(\d+)%\]/;

        adbProcess.stdout.on('data', (data) => {
            const output = data.toString();
            const match = output.match(progressRegex);

            if (match && match[1]) {
                const percentage = parseInt(match[1], 10);
                onProgress(percentage); // Relay the number back to the main process
            }
        });

        let errorOutput = '';
        adbProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        adbProcess.on('close', (code) => {
            if (code === 0) {
                onProgress(100); // Ensure it caps at 100% on success
                resolve();
            } else {
                reject(new Error(`Transfer failed (${code}): ${errorOutput}`));
            }
        });
    });
};



module.exports = {
    getConnectedDevices,
    listDirectory, // Export the new function
    runAdbCommand,
    transferFile
};