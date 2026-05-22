import { useState, useCallback, useMemo } from "react";
import useValidationStore from "../../store/validationStore";
import useGraphStore from "../../store/graphStore";
import usePlanStore from "../../store/planStore";
import StandardSelector from "../ui/StandardSelector";

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
            {(f.standards ?? []).length > 0 && (
              <div className="flex flex-wrap gap-0.5 mt-1">
                {(f.standards ?? []).map((s) => (
                  <span
                    key={s}
                    className="text-xs px-1 py-0 rounded bg-purple-50 border border-purple-200 text-purple-600 font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
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

function exportFindings(findings, archName) {
  const LEVEL_LABEL = { critical: "CRITICAL", warning: "WARNING", info: "INFO" };
  const lines = [
    `Archon Validation Report — ${archName ?? "Architecture"}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Total findings: ${findings.length}`,
    "",
  ];
  for (const level of ["critical", "warning", "info"]) {
    const group = findings.filter((f) => f.level === level);
    if (!group.length) continue;
    lines.push(`── ${LEVEL_LABEL[level]} (${group.length}) ─────────────────────────`);
    for (const f of group) {
      lines.push(`[${LEVEL_LABEL[level]}] ${f.title}`);
      lines.push(`  Component : ${f.nodeLabel}`);
      lines.push(`  Issue     : ${f.message}`);
      if (f.fix) lines.push(`  Fix       : ${f.fix}`);
      lines.push("");
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(archName ?? "architecture").replace(/\s+/g, "_")}_findings.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Plan mode config ─────────────────────────────────────────────────────────

const PLAN_ACTION_CFG = {
  create:  { label: "Create",  dot: "bg-green-500",  row: "border-l-4 border-green-500 bg-green-50",  text: "text-green-700"  },
  update:  { label: "Update",  dot: "bg-amber-500",  row: "border-l-4 border-amber-400 bg-amber-50",  text: "text-amber-700"  },
  replace: { label: "Replace", dot: "bg-orange-500", row: "border-l-4 border-orange-400 bg-orange-50", text: "text-orange-700" },
  delete:  { label: "Destroy", dot: "bg-red-500",    row: "border-l-4 border-red-500 bg-red-50",      text: "text-red-700"    },
  "no-op": { label: "No-op",   dot: "bg-gray-300",   row: "border-l-4 border-gray-200 bg-gray-50",    text: "text-gray-400"   },
};

function PlanActionPill({ action, count }) {
  if (!count) return null;
  const cfg = PLAN_ACTION_CFG[action] ?? PLAN_ACTION_CFG["no-op"];
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border bg-white ${cfg.text}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {cfg.label}: {count}
    </span>
  );
}

function exportPlanChanges(changes, archName) {
  const ORDER = ["create", "update", "replace", "delete", "no-op"];
  const lines = [
    `Archon Plan Diff — ${archName ?? "Architecture"}`,
    `Generated: ${new Date().toLocaleString()}`,
    `Total changes: ${changes.length}`,
    "",
  ];
  for (const action of ORDER) {
    const group = changes.filter((c) => c.action === action);
    if (!group.length) continue;
    const cfg = PLAN_ACTION_CFG[action];
    lines.push(`── ${cfg.label.toUpperCase()} (${group.length}) ─────────────────────────`);
    for (const c of group) {
      lines.push(`[${cfg.label.toUpperCase()}] ${c.address}`);
      lines.push(`  ${c.description}`);
      lines.push("");
    }
  }
  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${(archName ?? "plan").replace(/\s+/g, "_")}_plan_diff.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function PlanModeView({ planSummary, archName, onClearPlan }) {
  const counts = planSummary.counts ?? {};
  const changes = planSummary.changes ?? [];
  const ORDER = ["create", "update", "replace", "delete", "no-op"];
  const activeCount = (counts.create ?? 0) + (counts.update ?? 0) + (counts.replace ?? 0) + (counts.delete ?? 0);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Plan header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-indigo-50">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">
            Plan Diff · {activeCount} change{activeCount !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            {changes.length > 0 && (
              <button
                onClick={() => exportPlanChanges(changes, archName)}
                className="text-xs px-2 py-0.5 rounded border border-indigo-200 text-indigo-600 hover:bg-indigo-100 transition-colors"
                title="Download plan diff as text"
              >
                ↓ Export
              </button>
            )}
            <button
              onClick={onClearPlan}
              className="text-xs px-2 py-0.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-100 transition-colors"
              title="Clear plan and return to validation view"
            >
              ✕ Clear Plan
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ORDER.map((a) =>
            counts[a] ? <PlanActionPill key={a} action={a} count={counts[a]} /> : null
          )}
        </div>
      </div>

      {/* Change list */}
      <div className="flex-1 overflow-y-auto">
        {changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 gap-3">
            <div className="text-4xl">✅</div>
            <p className="text-sm font-semibold text-gray-700">No changes planned</p>
            <p className="text-xs text-gray-400">All resources are up to date.</p>
          </div>
        ) : (
          <>
            {ORDER.map((action) => {
              const group = changes.filter((c) => c.action === action);
              if (!group.length) return null;
              const cfg = PLAN_ACTION_CFG[action];
              return (
                <div key={action}>
                  <div className="sticky top-0 z-10 px-4 py-1.5 bg-gray-100 border-b border-gray-200 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {cfg.label} · {group.length}
                    </span>
                  </div>
                  {group.map((c) => (
                    <div key={c.address} className={`${cfg.row} border-b border-gray-100 px-4 py-2.5`}>
                      <p className={`text-xs font-semibold leading-tight ${cfg.text}`}>
                        {c.display_name}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-snug">
                        {c.description}
                      </p>
                      <p className="text-xs text-gray-400 font-mono mt-0.5 truncate" title={c.address}>
                        {c.address}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })}
          </>
        )}
        <div className="px-4 py-4 text-xs text-gray-400 text-center">
          Click any node on the canvas to inspect its configuration.
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ValidateTab({ onSelectNode }) {
  const findings        = useValidationStore((s) => s.findings);
  const activeStandard  = useValidationStore((s) => s.activeStandard);
  const acknowledged    = useValidationStore((s) => s.acknowledgedFindings);
  const filteredFindings = useMemo(() => {
    if (!activeStandard || activeStandard === "all") return findings;
    return findings.filter((f) => (f.standards ?? []).includes(activeStandard));
  }, [findings, activeStandard]);
  const archName         = useGraphStore((s) => s.graphMeta?.name);
  const planSummary      = usePlanStore((s) => s.planSummary);
  const clearPlan        = usePlanStore((s) => s.clearPlan);

  // ── Plan mode — show diff view instead of validation findings ─────────────
  if (planSummary) {
    return (
      <PlanModeView
        planSummary={planSummary}
        archName={archName}
        onClearPlan={clearPlan}
      />
    );
  }

  // ── Normal validation mode ─────────────────────────────────────────────────
  const active      = filteredFindings.filter((f) => !acknowledged[f.id]);
  const dismissed   = filteredFindings.filter((f) =>  acknowledged[f.id]);

  const criticalCnt = active.filter((f) => f.level === "critical").length;
  const warningCnt  = active.filter((f) => f.level === "warning").length;
  const infoCnt     = active.filter((f) => f.level === "info").length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Validation · {active.length} finding{active.length !== 1 ? "s" : ""}
          </p>
          {findings.length > 0 && (
            <button
              onClick={() => exportFindings(active, archName)}
              className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              title="Export findings as text"
            >
              ↓ Export
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SeverityPill level="critical" count={criticalCnt} />
          <SeverityPill level="warning"  count={warningCnt}  />
          <SeverityPill level="info"     count={infoCnt}     />
        </div>
        <StandardSelector />
      </div>

      {/* Finding list */}
      <div className="flex-1 overflow-y-auto">
        {active.length === 0 && dismissed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6 py-12 gap-3">
            <div className="text-4xl">✅</div>
            <p className="text-sm font-semibold text-gray-700">No issues found</p>
            <p className="text-xs text-gray-400">
              Add components and connect them to see validation results.
            </p>
          </div>
        ) : (
          <>
            {["critical", "warning", "info"].map((level) => {
              const group = active.filter((f) => f.level === level);
              if (!group.length) return null;
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

            {dismissed.length > 0 && (
              <div>
                <div className="sticky top-0 z-10 px-4 py-1.5 bg-gray-100 border-b border-gray-200">
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Dismissed · {dismissed.length}
                  </span>
                </div>
                {dismissed.map((f) => (
                  <FindingRow
                    key={f.id}
                    f={f}
                    onSelectNode={onSelectNode}
                    isAcknowledged={true}
                  />
                ))}
              </div>
            )}
          </>
        )}
        <div className="px-4 py-4 text-xs text-gray-400 text-center">
          Click any finding to highlight the affected node.
        </div>
      </div>
    </div>
  );
}
