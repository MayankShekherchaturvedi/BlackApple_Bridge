import React, { useState, useEffect } from "react";

export default function ProgressBar({
  deviceId,
  action,
  source,
  dest,
  fileName,
  onComplete,
  onCancel,
}) {
  const [progress, setProgress] = useState(0);
  const [isTransferring, setIsTransferring] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);

  const displayFileName = fileName || source.split("/").pop() || "file";

  // Subscribe to the IPC progress channel
  useEffect(() => {
    let unsubscribe = () => {};
    if (window.blackAppleApi?.onTransferProgress) {
      unsubscribe = window.blackAppleApi.onTransferProgress((percentage) => {
        setProgress(percentage);
      });
    }

    // Auto-start transfer on mount
    startTransfer();

    return () => {
      unsubscribe();
    };
  }, []);

  const startTransfer = async () => {
    setIsTransferring(true);
    setIsSuccess(false);
    setError(null);
    setProgress(0);

    try {
      const result = await window.blackAppleApi.transferFile({
        deviceId,
        action,
        source,
        dest,
      });

      setIsTransferring(false);

      if (result && result.success) {
        setProgress(100);
        setIsSuccess(true);
        if (onComplete) onComplete();
      } else {
        setError(result?.error || "Transfer failed");
      }
    } catch (err) {
      setIsTransferring(false);
      setError(err.message || "Transfer failed unexpectedly");
    }
  };

  const handleShowInFinder = async () => {
    if (action === "pull" && window.blackAppleApi?.showItemInFolder) {
      await window.blackAppleApi.showItemInFolder(dest);
    }
  };

  return (
    <div
      id="transfer-progress-modal"
      className="bg-slate-900 border border-slate-700/80 p-5 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in fade-in"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
              isSuccess
                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-500/30"
                : error
                  ? "bg-rose-950/60 text-rose-400 border border-rose-500/30"
                  : "bg-indigo-950/60 text-indigo-400 border border-indigo-500/30"
            }`}
          >
            {isSuccess ? "✓" : error ? "✕" : action === "pull" ? "📥" : "📤"}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <span>
                {action === "pull"
                  ? "Downloading from Android"
                  : "Sending to Android"}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-indigo-300 font-mono">
                {displayFileName}
              </span>
            </h4>
            <p className="text-[11px] text-slate-400 font-mono truncate max-w-md mt-0.5">
              Dest: {dest}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="font-mono text-sm font-bold text-indigo-400">
            {progress}%
          </span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-500 hover:text-slate-300 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              title="Close"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full bg-slate-800 rounded-full h-2.5 mb-3 overflow-hidden border border-slate-700/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ease-out ${
            isSuccess
              ? "bg-emerald-500"
              : error
                ? "bg-rose-500"
                : "bg-gradient-to-r from-indigo-500 to-cyan-400"
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      {/* Actions and feedback */}
      <div className="flex items-center justify-between text-xs">
        <div>
          {isTransferring && (
            <span className="text-slate-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
              Transferring file data...
            </span>
          )}
          {isSuccess && (
            <span className="text-emerald-400 font-medium flex items-center gap-1">
              <span>✓</span> Transfer completed successfully!
            </span>
          )}
          {error && (
            <span className="text-rose-400 font-medium font-mono">{error}</span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {isSuccess && action === "pull" && (
            <button
              id="btn-show-in-finder"
              onClick={handleShowInFinder}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-300 font-medium transition-colors border border-slate-700 flex items-center gap-1"
            >
              <span>📂</span>
              <span>Show in Finder</span>
            </button>
          )}

          {error && (
            <button
              id="btn-retry-transfer"
              onClick={startTransfer}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              Retry
            </button>
          )}

          {(isSuccess || error) && onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors border border-slate-700"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
