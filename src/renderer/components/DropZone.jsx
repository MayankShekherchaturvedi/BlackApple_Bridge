import React, { useState, useRef } from "react";

export default function DropZone({ onFileDropped, disabled }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const processFile = (file) => {
    if (!file) return;
    let filePath = "";
    if (window.blackAppleApi?.getPathForFile) {
      filePath = window.blackAppleApi.getPathForFile(file);
    }
    if (!filePath && file.path) {
      filePath = file.path;
    }

    if (filePath && onFileDropped) {
      onFileDropped(filePath, file.name);
    } else if (file.name) {
      // In case path is empty, pass what we have
      onFileDropped(filePath || file.name, file.name);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleBrowseNative = async () => {
    if (disabled) return;
    if (window.blackAppleApi?.selectFiles) {
      const selected = await window.blackAppleApi.selectFiles();
      if (selected && selected.length > 0) {
        const fullPath = selected[0];
        const fileName = fullPath.split("/").pop() || "file";
        onFileDropped(fullPath, fileName);
        return;
      }
    }
    // Fallback to browser file input
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
    e.target.value = "";
  };

  return (
    <div
      id="drop-zone-container"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseNative}
      className={`relative group cursor-pointer transition-all duration-300 rounded-2xl p-6 border-2 border-dashed text-center flex flex-col items-center justify-center
        ${
          disabled
            ? "opacity-50 cursor-not-allowed border-slate-800 bg-slate-900/30"
            : isDragging
              ? "border-indigo-400 bg-indigo-950/40 shadow-xl shadow-indigo-500/10 scale-[1.01]"
              : "border-slate-700/80 hover:border-indigo-500/60 bg-slate-900/40 hover:bg-slate-800/40"
        }
      `}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
      />

      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 transition-transform duration-300 ${
          isDragging
            ? "scale-110 bg-indigo-600/30 text-indigo-300"
            : "bg-slate-800 text-slate-300 group-hover:scale-105"
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="w-7 h-7"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
      </div>

      <p className="text-slate-200 font-medium text-base mb-1">
        {isDragging
          ? "Release to upload to Android"
          : "Drag & drop a file to send to Android"}
      </p>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <span>or</span>
        <span className="text-indigo-400 font-semibold underline decoration-indigo-400/40 group-hover:decoration-indigo-400">
          browse Mac files
        </span>
      </p>
    </div>
  );
}
