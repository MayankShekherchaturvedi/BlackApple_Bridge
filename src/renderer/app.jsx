import React, { useState } from 'react';

export default function App() {
    const [devices, setDevices] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            // Call the API exposed by our preload script
            const connectedDevices = await window.blackAppleApi.getDevices();
            setDevices(connectedDevices);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 text-white bg-gray-900 min-h-screen">
            <h1 className="text-2xl font-bold mb-4">BlackApple_Bridge</h1>
            <button
                onClick={fetchDevices}
                className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 transition"
            >
                {loading ? 'Scanning...' : 'Scan for Devices'}
            </button>

            <div className="mt-6">
                <h2 className="text-xl font-semibold mb-2">Connected Androids:</h2>
                {devices.length === 0 ? (
                    <p className="text-gray-400">No devices found. Ensure USB debugging is enabled.</p>
                ) : (
                    <ul className="bg-gray-800 rounded p-4">
                        {devices.map((device, index) => (
                            <li key={index} className="flex items-center space-x-2">
                                <span className="text-green-400">●</span>
                                <span className="font-mono">{device}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}