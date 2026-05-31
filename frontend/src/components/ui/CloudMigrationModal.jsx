import { useState } from "react";
import useGraphStore from "../../store/graphStore";
import useSecurityStore from "../../store/securityStore";
import useIAMStore from "../../store/iamStore";
import { serializeGraph } from "../../utils/serializer";
import { createCanvasSave } from "../../api/canvas";

const MIGRATION_FLAG = "archon-cloud-migration-done";

export function isCloudMigrationDone() {
  return localStorage.getItem(MIGRATION_FLAG) === "1";
}

export function markCloudMigrationDone() {
  localStorage.setItem(MIGRATION_FLAG, "1");
}

export function hasLocalGraphToMigrate() {
  try {
    const raw = localStorage.getItem("archon_graph");
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.nodes) && parsed.nodes.length > 0;
  } catch {
    return false;
  }
}

export default function CloudMigrationModal({ onClose, onComplete }) {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const graphMeta = useGraphStore((s) => s.graphMeta);
  const securityGroups = useSecurityStore((s) => s.securityGroups);
  const iamRoles = useIAMStore((s) => s.iamRoles);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload() {
    setBusy(true);
    setError("");
    try {
      const graph_json = serializeGraph(graphMeta, nodes, edges, securityGroups, iamRoles);
      await createCanvasSave({
        name: graphMeta.name || "My Architecture",
        provider: graphMeta.provider,
        graph_json,
      });
      markCloudMigrationDone();
      onComplete?.();
      onClose();
    } catch (err) {
      setError(err.message ?? "Could not save to cloud");
    } finally {
      setBusy(false);
    }
  }

  function handleSkip() {
    markCloudMigrationDone();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Save architecture to the cloud?</h2>
        <p className="text-sm text-gray-600">
          You have a local architecture on this device. Upload it to your account so you can access
          it from anywhere and keep working after you sign out.
        </p>
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={handleSkip}
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-60"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={busy}
            className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save to cloud"}
          </button>
        </div>
      </div>
    </div>
  );
}
