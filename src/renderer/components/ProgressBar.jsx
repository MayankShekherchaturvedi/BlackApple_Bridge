import React, { useState, useEffect } from 'react';

export default function ProgressBar({ deviceId, action, source, dest, onComplete }) {
    const [progress, setProgress] = useState(0);
    const [isTransferring, setIsTransferring] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Subscribe to the IPC progress channel
        const unsubscribe = window.blackAppleApi.onTransferProgress((percentage) => {
            setProgress(percentage);
        });

        // Cleanup listener when component unmounts
        return () => unsubscribe();
    }, []);

    const startTransfer = async () => {
        setIsTransferring(true);
        setError(null);
        setProgress(0);

        const result = await window.blackAppleApi.transferFile({
            deviceId, action, source, dest
        });

        setIsTransferring(false);

        if (result.success) {
            if (onComplete) onComplete();
        } else {
            setError(result.error);
        }
    };

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg mt-4">
            <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-300">
                    {action === 'pull' ? 'Downloading from Android' : 'Sending to Android'}
                </span>
                <span className="text-sm font-medium text-blue-400">{progress}%</span>
            </div>

            {/* Progress Bar Track */}
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4 overflow-hidden">
                <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-200 ease-out"
                    style={{ width: `${progress}%` }}
                ></div>
            </div>

            <button
                onClick={startTransfer}
                disabled={isTransferring}
                className={`px-4 py-2 rounded font-medium ${isTransferring
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-500 text-white'
                    }`}
            >
                {isTransferring ? 'Transferring...' : 'Start Transfer'}
            </button>

            {error && <p className="text-red-400 text-sm mt-2 font-mono">{error}</p>}
        </div>
    );
}