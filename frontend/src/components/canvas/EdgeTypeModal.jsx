const EDGE_TYPES = [
  {
    type: "network",
    label: "Network",
    color: "text-blue-600",
    border: "border-blue-200 hover:border-blue-400",
    uniPreview: "───────▶",
    biPreview: "◀───────▶",
    previewClass: "text-blue-500",
  },
  {
    type: "data_flow",
    label: "Data Flow",
    color: "text-purple-600",
    border: "border-purple-200 hover:border-purple-400",
    uniPreview: "- - - - ▶",
    biPreview: "◀- - - - ▶",
    previewClass: "text-purple-500",
  },
  {
    type: "dependency",
    label: "Dependency",
    color: "text-gray-600",
    border: "border-gray-200 hover:border-gray-400",
    uniPreview: "· · · · ▶",
    biPreview: "◀· · · · ▶",
    previewClass: "text-gray-500",
  },
  {
    type: "streaming",
    label: "Streaming",
    color: "text-sky-600",
    border: "border-sky-200 hover:border-sky-400",
    uniPreview: "══════▶",
    biPreview: "◀══════▶",
    previewClass: "text-sky-500",
  },
  {
    type: "batch",
    label: "Batch",
    color: "text-amber-600",
    border: "border-amber-200 hover:border-amber-400",
    uniPreview: "━━━━━▶",
    biPreview: "◀━━━━━▶",
    previewClass: "text-amber-500",
  },
  {
    type: "event",
    label: "Event",
    color: "text-green-600",
    border: "border-green-200 hover:border-green-400",
    uniPreview: "· · · · ▶",
    biPreview: "◀· · · · ▶",
    previewClass: "text-green-500",
  },
];

export default function EdgeTypeModal({ onSelect, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-5 py-4 border-b">
          <h2 className="text-sm font-semibold text-gray-900">
            Select connection type
          </h2>
        </div>
        <div className="px-5 py-4 space-y-2">
          {EDGE_TYPES.map((et) => (
            <div key={et.type} className="flex gap-2">
              <button
                onClick={() =>
                  onSelect({ type: et.type, bidirectional: false })
                }
                className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-colors text-left ${et.border}`}
              >
                <span
                  className={`font-mono text-xs tracking-widest w-20 shrink-0 ${et.previewClass}`}
                >
                  {et.uniPreview}
                </span>
                <div>
                  <div className={`text-xs font-medium ${et.color}`}>
                    {et.label}
                  </div>
                  <div className="text-[10px] text-gray-400">One-way</div>
                </div>
              </button>
              <button
                onClick={() => onSelect({ type: et.type, bidirectional: true })}
                className={`flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border-2 transition-colors text-left ${et.border}`}
              >
                <span
                  className={`font-mono text-xs tracking-widest w-20 shrink-0 ${et.previewClass}`}
                >
                  {et.biPreview}
                </span>
                <div>
                  <div className={`text-xs font-medium ${et.color}`}>
                    {et.label}
                  </div>
                  <div className="text-[10px] text-gray-400">Bidirectional</div>
                </div>
              </button>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t flex justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
