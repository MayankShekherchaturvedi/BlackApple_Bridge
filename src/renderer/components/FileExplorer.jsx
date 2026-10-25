import React, { useState, useEffect } from 'react';

// 1. Added onPathChange to the component props
export default function FileExplorer({ activeDevice, onPathChange }) {
    const [currentPath, setCurrentPath] = useState('/sdcard');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (activeDevice) {
            fetchDirectory(currentPath);
        }

        // 2. Notify App.jsx whenever the path updates
        if (onPathChange) {
            onPathChange(currentPath);
        }
    }, [activeDevice, currentPath]); // Triggered when currentPath changes

    const fetchDirectory = async (path) => {
        setLoading(true);
        try {
            const dirContents = await window.blackAppleApi.listDirectory(activeDevice, path);
            setFiles(dirContents);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (file) => {
        if (file.isDirectory) {
            setCurrentPath(file.path);
        }
    };

    const goUp = () => {
        const newPath = currentPath.split('/').slice(0, -1).join('/') || '/';
        setCurrentPath(newPath);
    };

    return (
        <div className="bg-gray-800 rounded-lg p-4 h-96 flex flex-col">
            <div className="flex items-center space-x-3 mb-4 bg-gray-900 p-2 rounded">
                <button onClick={goUp} className="px-3 py-1 bg-gray-700 rounded hover:bg-gray-600">
                    ↑ Up
                </button>
                <span className="font-mono text-sm truncate flex-1">{currentPath}</span>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading ? (
                    <div className="text-center text-gray-400 mt-10">Loading...</div>
                ) : (
                    <ul className="space-y-1">
                        {files.map((file, idx) => (
                            <li
                                key={idx}
                                onClick={() => handleNavigate(file)}
                                className={`p-2 rounded cursor-pointer flex items-center space-x-3 
                  ${file.isDirectory ? 'hover:bg-blue-900/50 text-blue-300' : 'hover:bg-gray-700 text-gray-300'}`}
                            >
                                <span>{file.isDirectory ? '📁' : '📄'}</span>
                                <span className="truncate">{file.name}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}