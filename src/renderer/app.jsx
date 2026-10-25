import React, { useState, useEffect } from 'react';
import FileExplorer from './components/FileExplorer';
import DropZone from './components/DropZone';
import ProgressBar from './components/ProgressBar';

export default function App() {
    const [activeDevice, setActiveDevice] = useState(null);
    const [currentAndroidPath, setCurrentAndroidPath] = useState('/sdcard');
    const [activeTransfer, setActiveTransfer] = useState(null);

    // Auto-scan for devices on startup
    useEffect(() => {
        const initDevice = async () => {
            const devices = await window.blackAppleApi.getDevices();
            if (devices.length > 0) setActiveDevice(devices[0]);
        };
        initDevice();
    }, []);

    const handleFileDrop = (macFilePath, fileName) => {
        if (!activeDevice) return alert("No Android device connected!");

        // Set the transfer state to trigger the ProgressBar component
        setActiveTransfer({
            deviceId: activeDevice,
            action: 'push',
            source: macFilePath,
            // Append the file name to the current Android directory
            dest: `${currentAndroidPath}/${fileName}`
        });
    };

    return (
        <div className="p-6 text-white bg-gray-900 min-h-screen flex flex-col">
            <header className="mb-6 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">BlackApple_Bridge</h1>
                    <p className="text-gray-400 mt-1">
                        Connected: <span className="text-green-400 font-mono">{activeDevice || 'None'}</span>
                    </p>
                </div>
            </header>

            <div className="flex-1 flex flex-col space-y-4">
                {/* Pass state up from FileExplorer so App knows where to drop files */}
                <FileExplorer
                    activeDevice={activeDevice}
                    onPathChange={(newPath) => setCurrentAndroidPath(newPath)}
                />

                <DropZone onFileDropped={handleFileDrop} />

                {activeTransfer && (
                    <ProgressBar
                        deviceId={activeTransfer.deviceId}
                        action={activeTransfer.action}
                        source={activeTransfer.source}
                        dest={activeTransfer.dest}
                        onComplete={() => setActiveTransfer(null)}
                    />
                )}
            </div>
        </div>
    );
}