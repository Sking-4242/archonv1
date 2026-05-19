import { useState } from "react";
import useValidationStore from "../../store/validationStore";
import useGraphStore from "../../store/graphStore";

const SEVERITY = {
  critical: {
    label: "Critical",
    icon: "🔴",
    badge: "bg-red-100 text-red-700 border border-red-200",
    row: "border-l-4 border-red-500 bg-red-50",
    rowHover: "hover:bg-red-100",
    dot: "bg-red-500",
  },
  warning: {
    label: "Warning",
    icon: "🟡",
    badge: "bg-amber-100 text-amber-700 border border-amber-200",
    row: "border-l-4 border-amber-400 bg-amber-50",
    rowHover: "hover:bg-amber-100",
    dot: "bg-amber-400",
  },
  info: {
    label: "Info",
    icon: "🔵",
    badge: "bg-blue-100 text-blue-700 border border-blue-200",
    row: "border-l-4 border-blue-400 bg-blue-50",
    rowHover: "hover:bg-blue-100",
    dot: "bg-blue-400",
  },
};

function SeverityPill({ level, count }) {
  const cfg = SEVERITY[level];
  if (!count) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}
    >
      {cfg.icon} {cfg.label}: {count}
    </span>
  );
}

function DismissFlow({ findingId, onDone }) {
  const [reason, setReason] = useState("");
  const acknowledge = useValidationStore((s) => s.acknowledge);

  const handleConfirm = () => {
    acknowledge(findingId, reason.trim());
    onDone();
  };

  return (
    <div
      className="mt-2 rounded border border-amber-300 bg-amber-50 p-2 text-xs"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="font-semibold text-amber-800 mb-1">Dismiss this warning?</p>
      <input
        type="text"
        className="w-full rounded border border-amber-300 bg-white px-2 py-1 text-xs outline-none focus:border-amber-500 placeholder-gray-400"
        placeholder="Reason (optional)"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        autoFocus
      />
      <div className="flex gap-2 mt-2">
        <button
          className="flex-1 rounded bg-amber-500 px-2 py-1 text-white font-medium hover:bg-amber-600"
          onClick={handleConfirm}
        >
          Confirm dismiss
        </button>
        <button
          className="flex-1 rounded border border-gray-300 px-2 py-1 text-gray-600 hover:bg-gray-100"
          onClick={onDone}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function FindingRow({ f, onSelectNode, isAcknowledged }) {
  const [expanded, setExpanded] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId);
  const unacknowledge = useValidationStore((s) => s.unacknowledge);

  const cfg = SEVERITY[f.level];

  const handleClick = () => {
    setSelectedNodeId(f.nodeId);
    onSelectNode?.(f.nodeId);
  };

  if (isAcknowledged) {
    return (
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs">
        <div className="flex-1 min-w-0">
          <span className="text-gray-400 line-through truncate">{f.title}</span>
          <span className="ml-2 text-gray-400 font-mono">· {f.nodeLabel}</span>
        </div>
        <button
          className="ml-2 shrink-0 text-blue-500 hover:underline"
          onClick={() => unacknowledge(f.id)}
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <div className={`${cfg.row} border-b border-gray-100`}>
      <button
        onClick={handleClick}
        className={`w-full text-left px-4 py-3 transition-colors ${cfg.rowHover}`}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-800 leading-tight">
              {f.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">
              {f.message}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 font-mono truncate">
              {f.nodeLabel}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0 mt-0.5">
            {f.fix && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((v) => !v);
                }}
                className="text-xs px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-500 hover:border-gray-400 hover:text-gray-700"
                title="Show fix suggestion"
              >
                {expanded ? "▲ fix" : "▼ fix"}
              </button>
            )}
            {f.canAcknowledge && !dismissing && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDismissing(true);
                }}
                className="text-xs px-1.5 py-0.5 rounded bg-white border border-amber-300 text-amber-600 hover:bg-amber-50"
                title="Dismiss this warning"
              >
                Dismiss
              </button>
            )}
            <span className="text-gray-300 text-xs">→</span>
          </div>
        </div>
        {expanded && f.fix && (
          <div className="mt-2 rounded bg-white border border-gray-200 px-2 py-1.5 text-xs text-gray-600 leading-snug">
            <span className="font-semibold text-gray-700">Fix: </span>
            {f.fix}
          </div>
        )}
      </button>
      {dismissing && (
        <div className="px-4 pb-3">
          <DismissFlow findingId={f.id} onDone={() => setDismissing(false)} />
        </div>
      )}
    </div>
  );
}

export default function ValidateTab({ onSelectNode }) {
  const findings = useValidationStore((s) => s.findings);
  const acknowledgedFindings = useValidationStore((s) => s.acknowledgedFindings);
  const [ackOpen, setAckOpen] = useState(false);

  const active = findings.filter((f) => !acknowledgedFindings[f.id]);
  const acknowledged = findings.filter((f) => acknowledgedFindings[f.id]);

  const critical = active.filter((f) => f.level === "critical");
  const warning = active.filter((f) => f.level === "warning");
  const info = active.filter((f) => f.level === "info");

  if (active.length === 0 && acknowledged.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 gap-3">
        <div className="text-4xl">✅</div>
        <p className="text-sm font-semibold text-gray-700">No issues found</p>
        <p className="text-xs text-gray-400">
          Your architecture passes all checks. Add components and connections to
          continue validation.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
          {active.length} active {active.length === 1 ? "issue" : "issues"}
          {acknowledged.length > 0 && (
            <span className="normal-case font-normal text-gray-400">
              {" "}· {acknowledged.length} dismissed
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <SeverityPill level="critical" count={critical.length} />
          <SeverityPill level="warning" count={warning.length} />
          <SeverityPill level="info" count={info.length} />
        </div>
      </div>

      {/* Active findings */}
      <div className="flex-1 overflow-y-auto">
        {active.length === 0 && acknowledged.length > 0 && (
          <div className="flex flex-col items-center justify-center py-10 gap-2 text-center px-6">
            <div className="text-3xl">✅</div>
            <p className="text-sm font-semibold text-gray-700">All issues dismissed</p>
            <p className="text-xs text-gray-400">
              Review dismissed items below or add more components to continue.
            </p>
          </div>
        )}

        {["critical", "warning", "info"].map((level) => {
          const group = active.filter((f) => f.level === level);
          if (group.length === 0) return null;
          const cfg = SEVERITY[level];
          return (
            <div key={level}>
              <div className="sticky top-0 z-10 px-4 py-1.5 bg-gray-100 border-b border-gray-200 flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  {cfg.label} · {group.length}
                </span>
              </div>
              {group.map((f) => (
                <FindingRow
                  key={f.id}
                  f={f}
                  onSelectNode={onSelectNode}
                  isAcknowledged={false}
                />
              ))}
            </div>
          );
        })}

        {/* Acknowledged section */}
        {acknowledged.length > 0 && (
          <div className="border-t border-gray-200 mt-2">
            <button
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 text-xs text-gray-500 font-semibold"
              onClick={() => setAckOpen((v) => !v)}
            >
              <span>Acknowledged ({acknowledged.length})</span>
              <span>{ackOpen ? "▲" : "▼"}</span>
            </button>
            {ackOpen && (
              <div>
                {acknowledged.map((f) => (
                  <FindingRow
                    key={f.id}
                    f={f}
                    onSelectNode={onSelectNode}
                    isAcknowledged
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-4 text-xs text-gray-400 text-center">
          Click any finding to select the component on the canvas.
        </div>
      </div>
    </div>
  );
}
