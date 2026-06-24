const CANVAS_URL = import.meta.env.VITE_CANVAS_URL ?? "http://localhost:3000";

export default function StudentSandbox() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Sandbox</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            A free architecture canvas — experiment without submitting for a grade.
          </p>
        </div>
        <a
          href={CANVAS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm px-4 py-2 rounded-lg border border-gray-200 text-gray-700 font-medium hover:border-gray-300 hover:bg-gray-50 transition-colors"
        >
          Open in new tab ↗
        </a>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <iframe
          title="Archon Sandbox Canvas"
          src={CANVAS_URL}
          className="w-full"
          style={{ height: "calc(100vh - 16rem)", minHeight: "520px", border: "0" }}
        />
      </div>
    </div>
  );
}
