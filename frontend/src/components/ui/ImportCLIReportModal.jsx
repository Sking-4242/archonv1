/**
 * ImportCLIReportModal.jsx
 *
 * Accepts JSON output from `archon-cli --format archon` and routes it to the
 * appropriate store / canvas action based on reportType:
 *
 *   validate → validationStore.loadExternalFindings()  → Validate tab
 *   cost     → inline summary modal
 *   discover → graphStore.loadState()                  → canvas nodes
 */

import { useRef, useState } from "react";
import useValidationStore from "../../store/validationStore";
import useDiscoveryStore from "../../store/discoveryStore";

const LEVEL_COLOR = {
  critical: "text-red-400",
  warning: "text-yellow-400",
  info: "text-cyan-400",
};

const ACTION_COLOR = {
  create: "text-green-400",
  delete: "text-red-400",
  update: "text-yellow-400",
  replace: "text-yellow-400",
};

function CostSummaryView({ report, onClose }) {
  const { addedMonthly, removedMonthly, netDelta, totalAfter, lineItems, pricingAsOf } = report;
  const deltaColor = netDelta > 0 ? "text-red-400" : "text-green-400";
  const deltaSign = netDelta > 0 ? "+" : "";

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-gray-800 rounded p-3">
          <div className="text-gray-400 text-xs mb-1">Added / month</div>
          <div className="text-green-400 font-mono font-bold text-lg">${addedMonthly.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-gray-400 text-xs mb-1">Removed / month</div>
          <div className="text-red-400 font-mono font-bold text-lg">${removedMonthly.toFixed(2)}</div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-gray-400 text-xs mb-1">Net delta</div>
          <div className={`font-mono font-bold text-lg ${deltaColor}`}>
            {deltaSign}${Math.abs(netDelta).toFixed(2)}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3">
          <div className="text-gray-400 text-xs mb-1">Est. total after</div>
          <div className="text-white font-mono font-bold text-lg">${totalAfter.toFixed(2)}</div>
        </div>
      </div>

      <div className="text-xs text-gray-500">Pricing as of: {pricingAsOf}</div>

      <div className="overflow-auto max-h-64 text-xs font-mono">
        <table className="w-full border-collapse">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-1 pr-3">Action</th>
              <th className="text-left py-1 pr-3">Resource</th>
              <th className="text-right py-1 pr-3">$/month</th>
              <th className="text-left py-1">Description</th>
            </tr>
          </thead>
          <tbody>
            {(lineItems || []).map((item, i) => (
              <tr key={i} className="border-b border-gray-800 hover:bg-gray-800">
                <td className={`py-1 pr-3 ${ACTION_COLOR[item.action] ?? "text-gray-300"}`}>
                  {item.action}
                </td>
                <td className="py-1 pr-3 text-gray-300 truncate max-w-[200px]">{item.address}</td>
                <td className="py-1 pr-3 text-right text-gray-200">
                  {item.monthlyCost != null ? `$${item.monthlyCost.toFixed(2)}` : "—"}
                </td>
                <td className="py-1 text-gray-500 truncate max-w-[160px]">{item.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm"
        >
          Close
        </button>
      </div>
    </div>
  );
}

export default function ImportCLIReportModal({ onClose, onSwitchToValidate, onSwitchToDiscover }) {
  const fileRef = useRef(null);
  const [error, setError] = useState(null);
  const [stage, setStage] = useState("pick"); // "pick" | "cost"
  const [parsedReport, setParsedReport] = useState(null);

  const loadExternalFindings = useValidationStore((s) => s.loadExternalFindings);
  const setDiscoveryReport = useDiscoveryStore((s) => s.setReport);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      let data;
      try {
        data = JSON.parse(ev.target.result);
      } catch {
        setError("Invalid JSON file.");
        return;
      }

      if (!data.archonCliVersion || !data.reportType) {
        setError(
          'This file does not appear to be an archon-cli report. ' +
          'Generate one with: archon-cli <command> --format archon'
        );
        return;
      }

      const { reportType } = data;

      if (reportType === "validate") {
        loadExternalFindings(data.findings ?? []);
        onSwitchToValidate?.();
        onClose();
      } else if (reportType === "cost") {
        setParsedReport(data);
        setStage("cost");
      } else if (reportType === "discover") {
        setDiscoveryReport(data);
        onSwitchToDiscover?.();
        onClose();
      } else {
        setError(`Unknown reportType: "${reportType}"`);
      }
    };
    reader.readAsText(file);
  }

  const title =
    stage === "cost" ? "Cost Report — archon-cli" : "Import CLI Report";

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-xl w-[600px] max-h-[80vh] overflow-auto p-6 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>

        {/* File picker stage */}
        {stage === "pick" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-400">
              Load a report generated by{" "}
              <code className="text-cyan-400 bg-gray-800 px-1 rounded">archon-cli</code> with{" "}
              <code className="text-cyan-400 bg-gray-800 px-1 rounded">--format archon</code>.
              Reports are routed automatically by type:
            </p>
            <ul className="text-sm text-gray-400 list-disc list-inside space-y-1">
              <li>
                <code className="text-cyan-400">validate</code> → loads findings into the Validate tab
              </li>
              <li>
                <code className="text-cyan-400">cost</code> → shows cost delta summary
              </li>
              <li>
                <code className="text-cyan-400">discover</code> → places discovered resources on canvas
              </li>
            </ul>

            <div className="bg-gray-800 rounded p-3 text-xs font-mono text-gray-400">
              <div className="text-gray-500 mb-1"># Generate reports:</div>
              <div>archon-cli validate plan.json --format archon &gt; report.json</div>
              <div>archon-cli cost plan.json --format archon &gt; report.json</div>
              <div>archon-cli discover --region us-east-1 --format archon &gt; report.json</div>
            </div>

            <div className="flex gap-3 items-center">
              <input
                ref={fileRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFile}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-sm"
              >
                Choose JSON file…
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 rounded bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm"
              >
                Cancel
              </button>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}

        {/* Cost report view */}
        {stage === "cost" && parsedReport && (
          <CostSummaryView report={parsedReport} onClose={onClose} />
        )}

      </div>
    </div>
  );
}
