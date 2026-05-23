import { useState, useRef } from "react";

const ACTION_COLORS = {
  create:  { bg: "bg-green-50",  border: "border-green-300",  text: "text-green-700",  label: "Create",  dot: "bg-green-500"  },
  update:  { bg: "bg-amber-50",  border: "border-amber-300",  text: "text-amber-700",  label: "Update",  dot: "bg-amber-500"  },
  delete:  { bg: "bg-red-50",    border: "border-red-300",    text: "text-red-700",    label: "Destroy", dot: "bg-red-500"    },
  replace: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-700", label: "Replace", dot: "bg-orange-500" },
  "no-op": { bg: "bg-gray-50",   border: "border-gray-200",   text: "text-gray-400",   label: "No-op",   dot: "bg-gray-300"   },
};

function CountPill({ action, count }) {
  if (!count) return null;
  const cfg = ACTION_COLORS[action] ?? ACTION_COLORS["no-op"];
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold border ${cfg.bg} ${cfg.border} ${cfg.text}`}
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}: {count}
    </span>
  );
}

export default function ImportPlanModal({ onClose, onApply, apiUrl }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);   // parsed JSON for preview panels
  const [parseError, setParseError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  // ── File handling ──────────────────────────────────────────────────────────

  function handleFileChosen(chosen) {
    setParseError(null);
    setError(null);
    setPreview(null);
    setFile(chosen);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        if (!json.resource_changes) {
          setParseError(
            "This doesn't look like a Terraform plan JSON.\n" +
            "Generate it with: terraform show -json plan.tfplan"
          );
          setFile(null);
          return;
        }
        // Build client-side preview counts
        const counts = {};
        for (const rc of json.resource_changes) {
          const actions = rc.change?.actions ?? ["no-op"];
          const a = normalizeAction(actions);
          counts[a] = (counts[a] ?? 0) + 1;
        }
        // Prior state resource count
        const priorResources =
          json.prior_state?.values?.root_module?.resources ?? [];
        const priorByType = {};
        for (const r of priorResources) {
          priorByType[r.type] = (priorByType[r.type] ?? 0) + 1;
        }
        const priorSummary = Object.entries(priorByType)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10);

        setPreview({ counts, priorSummary, totalResources: priorResources.length });
      } catch {
        setParseError("File is not valid JSON.");
        setFile(null);
      }
    };
    reader.readAsText(chosen);
  }

  function normalizeAction(actions) {
    const a = new Set(actions);
    if (a.has("create") && a.has("delete")) return "replace";
    if (a.has("create")) return "create";
    if (a.has("delete")) return "delete";
    if (a.has("update")) return "update";
    return "no-op";
  }

  // ── Apply ──────────────────────────────────────────────────────────────────

  async function handleApply() {
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${apiUrl}/import-plan`, {
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

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileChosen(dropped);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const counts = preview?.counts ?? {};
  const activeChangeCount = (counts.create ?? 0) + (counts.update ?? 0) + (counts.delete ?? 0) + (counts.replace ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-w-[96vw] flex flex-col max-h-[90vh] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="text-base font-semibold text-gray-800">Import Terraform Plan</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload the JSON output of{" "}
              <code className="bg-gray-100 px-1 rounded font-mono text-gray-700">
                terraform show -json plan.tfplan
              </code>
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
            className={`relative rounded-lg border-2 border-dashed transition-colors cursor-pointer text-center py-8 ${
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : file
                ? "border-green-400 bg-green-50"
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
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files[0] && handleFileChosen(e.target.files[0])}
            />
            {file ? (
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mb-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                <p className="text-sm font-semibold text-green-700">{file.name}</p>
                <p className="text-xs text-green-600">
                  {(file.size / 1024).toFixed(1)} KB — click to replace
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mb-1"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></div>
                <p className="text-sm text-gray-500">
                  Drop your plan JSON here, or <span className="text-indigo-600 font-medium">browse</span>
                </p>
                <p className="text-xs text-gray-400">Accepts .json files only</p>
              </div>
            )}
          </div>

          {parseError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
              ⚠ {parseError}
            </div>
          )}

          {/* Two-panel preview */}
          {preview && (
            <div className="grid grid-cols-2 gap-3">

              {/* Left: Current State */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Current State
                </p>
                {preview.totalResources === 0 ? (
                  <p className="text-xs text-gray-400 italic">No prior state (fresh deployment)</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {preview.totalResources} resource{preview.totalResources !== 1 ? "s" : ""}
                    </p>
                    <div className="space-y-1 max-h-36 overflow-y-auto">
                      {preview.priorSummary.map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 truncate font-mono">{type.replace("aws_", "")}</span>
                          <span className="ml-2 shrink-0 text-gray-400 font-medium">{count}</span>
                        </div>
                      ))}
                      {Object.keys(preview.priorSummary).length > 10 && (
                        <p className="text-xs text-gray-400 italic">…and more</p>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Right: Proposed Changes */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Proposed Changes
                </p>
                {activeChangeCount === 0 ? (
                  <p className="text-xs text-gray-400 italic">No changes — all resources up to date</p>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      {activeChangeCount} change{activeChangeCount !== 1 ? "s" : ""}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {["create", "update", "replace", "delete"].map((a) =>
                        counts[a] ? (
                          <CountPill key={a} action={a} count={counts[a]} />
                        ) : null
                      )}
                      {counts["no-op"] ? (
                        <CountPill action="no-op" count={counts["no-op"]} />
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">
              ⚠ {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-400">
            Canvas will be replaced with the plan visualization.
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
              disabled={!file || loading}
              className={`text-xs px-4 py-1.5 rounded font-medium transition-colors ${
                file && !loading
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {loading ? "Applying…" : "Apply to Canvas"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
