import React, { useState } from 'react';

export default function DropZone({ onFileDropped }) {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e) => {
        e.preventDefault(); // Required to allow dropping
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Electron adds the absolute system '.path' to the File object
            const file = e.dataTransfer.files[0];
            onFileDropped(file.path, file.name);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragging ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 bg-gray-800 hover:border-gray-500'}`}
        >
            <span className="text-4xl mb-2 block">📥</span>
            <p className="text-gray-300 font-medium">
                {isDragging ? 'Drop file to transfer...' : 'Drag and drop a Mac file here to push to Android'}
            </p>
        </div>
    );
}