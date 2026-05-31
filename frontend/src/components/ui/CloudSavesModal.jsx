import { useEffect, useState } from "react";
import { createCanvasSave, listCanvasSaves, getCanvasSave } from "../../api/canvas";
import useAuthStore from "../../store/authStore";

export default function CloudSavesModal({ onClose, onLoad, currentGraph, currentName, currentProvider }) {
  const { user, activeSaveId, setActiveSaveId } = useAuthStore();
  const [saves, setSaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    listCanvasSaves()
      .then(setSaves)
      .catch((err) => setError(err.message ?? "Could not load saves"))
      .finally(() => setLoading(false));
  }, [user]);

  async function handleSaveNew() {
    setBusy(true);
    setError("");
    try {
      const row = await createCanvasSave({
        name: currentName || "Untitled Architecture",
        graph_json: currentGraph,
        provider: currentProvider,
      });
      setActiveSaveId(row.id);
      setSaves((prev) => [row, ...prev.filter((s) => s.id !== row.id)]);
    } catch (err) {
      setError(err.message ?? "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleLoad(saveId) {
    setBusy(true);
    setError("");
    try {
      const row = await getCanvasSave(saveId);
      setActiveSaveId(row.id);
      onLoad(row);
      onClose();
    } catch (err) {
      setError(err.message ?? "Load failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Cloud saves</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            ✕
          </button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
          <button
            type="button"
            disabled={busy}
            onClick={handleSaveNew}
            className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60"
          >
            Save current architecture to cloud
          </button>

          {activeSaveId && (
            <p className="text-xs text-gray-500">Active cloud save: {activeSaveId.slice(0, 8)}…</p>
          )}

          {loading && <p className="text-sm text-gray-500">Loading saves…</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && saves.length === 0 && (
            <p className="text-sm text-gray-500">No cloud saves yet.</p>
          )}

          <ul className="divide-y divide-gray-100">
            {saves.map((save) => (
              <li key={save.id} className="py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{save.name}</div>
                  <div className="text-xs text-gray-500">
                    {save.provider ?? "unknown"} · {new Date(save.updated_at).toLocaleString()}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleLoad(save.id)}
                  className="text-xs px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-800 flex-shrink-0"
                >
                  Load
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
