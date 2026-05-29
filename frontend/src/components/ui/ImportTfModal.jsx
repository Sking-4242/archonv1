/**
 * ImportTfModal.jsx
 *
 * Accepts one or more .tf file uploads, hits /import-tf, and returns a
 * parsed graph to the parent via onApply({ graph, warnings }).
 * Replaces the hidden <input> + alert() approach in App.jsx.
 */
import { useState, useRef } from "react";

export default function ImportTfModal({ onClose, onApply, apiUrl }) {
  const [files, setFiles] = useState([]);       // File objects
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  // ── File management ────────────────────────────────────────────────────────

  function addFiles(incoming) {
    const tf = Array.from(incoming).filter((f) =>
      f.name.endsWith(".tf") || f.name.endsWith(".tfvars")
    );
    if (!tf.length) {
      setError("Only .tf and .tfvars files are accepted.");
      return;
    }
    setError(null);
    // Deduplicate by name
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...tf.filter((f) => !existing.has(f.name))];
    });
  }

  function removeFile(name) {
    setFiles((prev) => prev.filter((f) => f.name !== name));
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  // ── Apply ──────────────────────────────────────────────────────────────────

  async function handleApply() {
    if (!files.length) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const res = await fetch(`${apiUrl}/import-tf`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      onApply(data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const totalSize = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-w-[96vw] flex flex-col max-h-[85vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="text-base font-semibold text-gray-800">Import Terraform Files</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload one or more{" "}
              <code className="bg-gray-100 px-1 rounded font-mono text-gray-700">.tf</code>{" "}
              files to visualise on the canvas
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Drop zone */}
          <div
            className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer text-center py-6 ${
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-300 bg-gray-50 hover:border-gray-400"
            }`}
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".tf,.tfvars"
              multiple
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
            <div className="flex flex-col items-center gap-1">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <line x1="9" y1="15" x2="15" y2="15"/>
                </svg>
              </div>
              <p className="text-sm text-gray-500">
                Drop <code className="font-mono text-gray-700">.tf</code> files here, or{" "}
                <span className="text-indigo-600 font-medium">browse</span>
              </p>
              <p className="text-xs text-gray-400">Multiple files supported — main.tf, variables.tf, etc.</p>
            </div>
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
              <div className="px-3 py-2 flex items-center justify-between bg-gray-50">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {files.length} file{files.length !== 1 ? "s" : ""} selected
                </p>
                <p className="text-xs text-gray-400">
                  {(totalSize / 1024).toFixed(1)} KB total
                </p>
              </div>
              {files.map((f) => (
                <div key={f.name} className="flex items-center justify-between px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">
                      .tf
                    </span>
                    <span className="text-xs text-gray-700 truncate">{f.name}</span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {(f.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                  <button
                    onClick={() => removeFile(f.name)}
                    className="text-gray-300 hover:text-red-400 transition-colors ml-2 shrink-0"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Errors */}
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-400">
            Canvas will be replaced with the imported architecture.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="text-xs px-3 py-1.5 rounded border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!files.length || loading}
              className={`text-xs px-4 py-1.5 rounded font-medium transition-colors ${
                files.length && !loading
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? "Importing…" : "Import to Canvas"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
