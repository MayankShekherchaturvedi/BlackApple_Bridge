import React, {
  useState,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";

const formatFileSize = (bytes) => {
  if (bytes === null || bytes === undefined) return "";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const getFileIcon = (fileName, isDirectory) => {
  if (isDirectory) {
    return (
      <span className="text-amber-400">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      </span>
    );
  }

  const ext = fileName.split(".").pop()?.toLowerCase();

  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) {
    return <span className="text-emerald-400">🖼️</span>;
  }
  if (["mp4", "mkv", "avi", "mov", "webm"].includes(ext)) {
    return <span className="text-purple-400">🎬</span>;
  }
  if (["mp3", "wav", "flac", "m4a", "aac", "ogg"].includes(ext)) {
    return <span className="text-pink-400">🎵</span>;
  }
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) {
    return <span className="text-amber-300">📦</span>;
  }
  if (["apk"].includes(ext)) {
    return <span className="text-green-400">🤖</span>;
  }
  if (["pdf"].includes(ext)) {
    return <span className="text-rose-400">📕</span>;
  }
  return <span className="text-slate-400">📄</span>;
};

const QUICK_SHORTCUTS = [
  { name: "SDCard", path: "/sdcard" },
  { name: "Download", path: "/sdcard/Download" },
  { name: "DCIM", path: "/sdcard/DCIM" },
  { name: "Pictures", path: "/sdcard/Pictures" },
  { name: "Documents", path: "/sdcard/Documents" },
];

const FileExplorer = forwardRef(function FileExplorer(
  { activeDevice, onPathChange, onFileClick },
  ref,
) {
  const [currentPath, setCurrentPath] = useState("/sdcard");
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchDirectory = async (path) => {
    if (!activeDevice) return;
    setLoading(true);
    setError(null);
    try {
      const dirContents = await window.blackAppleApi.listDirectory(
        activeDevice,
        path,
      );
      setFiles(dirContents || []);
    } catch (err) {
      console.error("Fetch directory error:", err);
      setError(
        err.message || "Unable to access directory. Access may be restricted.",
      );
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    refresh: () => fetchDirectory(currentPath),
    getCurrentPath: () => currentPath,
    setPath: (p) => setCurrentPath(p),
  }));

  useEffect(() => {
    if (activeDevice) {
      fetchDirectory(currentPath);
    } else {
      setFiles([]);
      setError(null);
    }

    if (onPathChange) {
      onPathChange(currentPath);
    }
  }, [activeDevice, currentPath]);

  const handleNavigate = (file) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
      setSearchQuery("");
    } else {
      if (onFileClick) onFileClick(file);
    }
  };

  const goUp = () => {
    if (currentPath === "/" || currentPath === "") return;
    const parts = currentPath.split("/").filter(Boolean);
    parts.pop();
    const newPath = parts.length === 0 ? "/" : "/" + parts.join("/");
    setCurrentPath(newPath);
    setSearchQuery("");
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl flex flex-col h-[380px] shadow-2xl overflow-hidden backdrop-blur-md">
      {/* Top Header: Path navigation & controls */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/60 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <button
            id="btn-navigate-up"
            onClick={goUp}
            disabled={currentPath === "/" || loading || !activeDevice}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-slate-200 transition-colors flex items-center gap-1 shadow-sm"
            title="Go up one level"
          >
            <span>↑</span>
            <span>Up</span>
          </button>

          <button
            id="btn-refresh-folder"
            onClick={() => fetchDirectory(currentPath)}
            disabled={loading || !activeDevice}
            className="p-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded-lg text-slate-200 transition-colors shadow-sm"
            title="Refresh directory"
          >
            <svg
              className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <div className="flex-1 bg-slate-900 border border-slate-800/90 rounded-lg px-3 py-1 flex items-center overflow-hidden">
            <span className="text-slate-500 font-mono text-xs mr-1 select-none">
              📁
            </span>
            <span className="font-mono text-xs text-indigo-300 truncate select-all">
              {currentPath}
            </span>
          </div>
        </div>

        {/* Filter Input */}
        <div className="w-48 relative">
          <input
            id="search-files-input"
            type="text"
            placeholder="Filter files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!activeDevice || files.length === 0}
            className="w-full bg-slate-900 border border-slate-800 text-xs text-slate-200 rounded-lg px-2.5 py-1.5 pl-7 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
          />
          <svg
            className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2.5 pointer-events-none"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Quick Location Shortcuts */}
      <div className="px-3 py-1.5 bg-slate-950/40 border-b border-slate-800/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <span className="text-slate-500 text-[10px] uppercase font-semibold mr-1">
          Quick:
        </span>
        {QUICK_SHORTCUTS.map((sc) => (
          <button
            key={sc.path}
            onClick={() => setCurrentPath(sc.path)}
            disabled={!activeDevice}
            className={`px-2 py-0.5 rounded-md transition-colors whitespace-nowrap ${
              currentPath === sc.path
                ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/40"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {sc.name}
          </button>
        ))}
      </div>

      {/* Directory listing body */}
      <div className="flex-1 overflow-y-auto p-2">
        {!activeDevice ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
            <span className="text-3xl">📱</span>
            <p className="text-sm font-medium">
              Connect an Android device with USB debugging enabled
            </p>
          </div>
        ) : loading ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <svg
              className="w-6 h-6 animate-spin text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="text-xs font-mono">
              Reading device directory...
            </span>
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-rose-400 p-6 text-center space-y-3">
            <span className="text-2xl">⚠️</span>
            <p className="text-sm font-medium">{error}</p>
            <button
              onClick={() => setCurrentPath("/sdcard")}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 rounded-lg border border-slate-700 transition-colors"
            >
              Return to /sdcard
            </button>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-1">
            <span className="text-xl">📭</span>
            <p className="text-xs">
              {searchQuery ? "No matching files" : "Folder is empty"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-1">
            {filteredFiles.map((file, idx) => (
              <div
                key={file.path || idx}
                onClick={() => handleNavigate(file)}
                className={`group px-3 py-2 rounded-xl cursor-pointer flex items-center justify-between transition-all duration-150 border border-transparent ${
                  file.isDirectory
                    ? "hover:bg-indigo-950/40 hover:border-indigo-500/30 text-indigo-200"
                    : "hover:bg-slate-800/70 hover:border-slate-700/50 text-slate-300"
                }`}
              >
                <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-3">
                  <span className="shrink-0">
                    {getFileIcon(file.name, file.isDirectory)}
                  </span>
                  <span className="truncate text-xs font-medium group-hover:text-white transition-colors">
                    {file.name}
                  </span>
                </div>

                <div className="flex items-center space-x-3 shrink-0 text-[11px] text-slate-500">
                  {file.size !== null && (
                    <span>{formatFileSize(file.size)}</span>
                  )}

                  {!file.isDirectory && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onFileClick) onFileClick(file);
                      }}
                      className="opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[11px] font-medium transition-opacity flex items-center gap-1"
                      title="Download to Mac Downloads"
                    >
                      <span>↓</span>
                      <span>Download</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer stats */}
      <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/80 text-[11px] text-slate-500 flex justify-between items-center">
        <span>
          {filteredFiles.length} item{filteredFiles.length === 1 ? "" : "s"}
        </span>
        <span className="text-[10px] text-slate-600">
          Click file to download to Mac • Click folder to open
        </span>
      </div>
    </div>
  );
});

export default FileExplorer;
