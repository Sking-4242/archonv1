/**
 * ImportTfReportModal.jsx — detailed post-import summary
 */
const ACTION_LABELS = {
  mapped: { label: "Mapped", color: "text-green-700 bg-green-50 border-green-200" },
  generic: { label: "Generic", color: "text-amber-700 bg-amber-50 border-amber-200" },
  companion_merged: { label: "Merged", color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  companion_orphan: { label: "Orphan", color: "text-orange-700 bg-orange-50 border-orange-200" },
  companion_pending_merge: { label: "Pending", color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
  data_merged: { label: "Data merged", color: "text-sky-700 bg-sky-50 border-sky-200" },
  data_skipped: { label: "Data skipped", color: "text-gray-600 bg-gray-50 border-gray-200" },
  data_pending_merge: { label: "Data pending", color: "text-gray-600 bg-gray-50 border-gray-200" },
  tab_managed: { label: "Tab", color: "text-purple-700 bg-purple-50 border-purple-200" },
  module_expanded: { label: "Module expanded", color: "text-teal-700 bg-teal-50 border-teal-200" },
  module_registry: { label: "Registry module", color: "text-teal-700 bg-teal-50 border-teal-200" },
  module_placeholder: { label: "Module placeholder", color: "text-teal-600 bg-teal-50 border-teal-100" },
  parse_error: { label: "Parse error", color: "text-red-700 bg-red-50 border-red-200" },
};

function actionStyle(action) {
  return ACTION_LABELS[action]?.color ?? "text-gray-700 bg-gray-50 border-gray-200";
}

function actionLabel(action) {
  return ACTION_LABELS[action]?.label ?? action;
}

export default function ImportTfReportModal({ report, warnings = [], onClose }) {
  const summary = report?.summary ?? {};
  const entries = report?.entries ?? [];

  const summaryCards = [
    { key: "mapped", label: "Canvas nodes" },
    { key: "companion_merged", label: "Companions merged" },
    { key: "generic", label: "Generic nodes" },
    { key: "tab_managed", label: "SG / IAM tab" },
    { key: "data_merged", label: "Data merged" },
    { key: "module_expanded", label: "Modules expanded" },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-w-[96vw] flex flex-col max-h-[85vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <div>
            <p className="text-base font-semibold text-gray-800">Import Report</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {summary.total ?? entries.length} resource actions recorded
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap gap-2">
          {summaryCards.map(({ key, label }) =>
            summary[key] ? (
              <div key={key} className="rounded-lg border border-gray-200 px-3 py-1.5 text-center min-w-[88px]">
                <p className="text-lg font-semibold text-gray-800">{summary[key]}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
              </div>
            ) : null
          )}
        </div>

        {warnings.length > 0 && (
          <div className="mx-5 mt-3 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
            {warnings.slice(0, 3).map((w, i) => (
              <p key={i}>⚠ {w}</p>
            ))}
            {warnings.length > 3 && (
              <p className="text-amber-600 mt-1">+ {warnings.length - 3} more warnings</p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {entries.map((entry, idx) => {
            const name = entry.resource_name
              ? `${entry.resource_type}.${entry.resource_name}`
              : entry.resource_type;
            return (
              <div key={idx} className="rounded-lg border border-gray-200 p-3 text-xs">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <code className="font-mono text-gray-800 break-all">{name}</code>
                  <span className={`shrink-0 px-2 py-0.5 rounded border text-[10px] font-semibold uppercase ${actionStyle(entry.action)}`}>
                    {actionLabel(entry.action)}
                  </span>
                </div>
                <p className="text-gray-600 leading-relaxed">{entry.reason}</p>
                {entry.parent_type && (
                  <p className="text-gray-400 mt-1">
                    Parent: {entry.parent_type}.{entry.parent_name}
                    {entry.archon_type ? ` → ${entry.archon_type}` : ""}
                  </p>
                )}
                {entry.detail && (
                  <p className="text-gray-400 mt-1 font-mono truncate" title={entry.detail}>
                    {entry.detail}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="text-xs px-4 py-1.5 rounded font-medium bg-indigo-600 text-white hover:bg-indigo-700"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
