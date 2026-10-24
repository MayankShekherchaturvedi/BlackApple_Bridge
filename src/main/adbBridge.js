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

module.exports = {
    getConnectedDevices,
    runAdbCommand
};