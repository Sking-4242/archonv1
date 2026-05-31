import { useCallback, useState } from "react";
import { fetchFinOpsAnalysis, fetchFinOpsTerraform } from "../../api/finops";
import useAccessStore from "../../store/accessStore";
import { featureLabel, UPGRADE_URL } from "../../utils/tierGates";

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

const LEVEL_STYLES = {
  high: "bg-red-50 border-red-200 text-red-800",
  medium: "bg-amber-50 border-amber-200 text-amber-800",
  low: "bg-blue-50 border-blue-200 text-blue-700",
  info: "bg-gray-50 border-gray-200 text-gray-600",
};

const SOURCE_STYLES = {
  ok: "text-emerald-700",
  empty: "text-amber-700",
  error: "text-red-700",
  skipped: "text-gray-500",
};

export default function FinOpsSection({ graph, csvActual, buildUsageParams, disabled }) {
  const canFinOps = useAccessStore((s) => s.canUse("finops_live"));
  const [status, setStatus] = useState("idle");
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState({});
  const [fetchCloudwatch, setFetchCloudwatch] = useState(false);
  const [fetchCostExplorer, setFetchCostExplorer] = useState(false);
  const [summaryLlm, setSummaryLlm] = useState(false);
  const [utilizationCsv, setUtilizationCsv] = useState("");
  const [terraformHcl, setTerraformHcl] = useState("");
  const [terraformStatus, setTerraformStatus] = useState("idle");

  const runAnalysis = useCallback(async () => {
    setStatus("loading");
    setError(null);
    setTerraformHcl("");
    try {
      const data = await fetchFinOpsAnalysis({
        graph,
        actualCosts: csvActual,
        utilizationCsv: utilizationCsv.trim() || null,
        usageParams: buildUsageParams(),
        fetchCloudwatch,
        fetchCostExplorer: fetchCostExplorer && !csvActual,
        summaryLlm,
      });
      setReport(data);
      const initial = {};
      for (const rec of data.recommendations ?? []) {
        initial[rec.id] = rec.level === "high" || rec.level === "medium";
      }
      setSelected(initial);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, [
    graph,
    csvActual,
    buildUsageParams,
    utilizationCsv,
    fetchCloudwatch,
    fetchCostExplorer,
    summaryLlm,
  ]);

  const generateTerraform = useCallback(async () => {
    if (!report) return;
    setTerraformStatus("loading");
    try {
      const recs = (report.recommendations ?? []).filter((r) => selected[r.id]);
      const { hcl } = await fetchFinOpsTerraform({ graph, recommendations: recs });
      setTerraformHcl(hcl);
      setTerraformStatus("done");
    } catch (err) {
      setError(err.message);
      setTerraformStatus("error");
    }
  }, [graph, report, selected]);

  const copyTerraform = useCallback(() => {
    if (terraformHcl) navigator.clipboard.writeText(terraformHcl);
  }, [terraformHcl]);

  const selectedSavings = (report?.recommendations ?? [])
    .filter((r) => selected[r.id])
    .reduce((sum, r) => sum + (r.projectedSavingsMonthly ?? 0), 0);

  if (!canFinOps) {
    return (
      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 text-xs text-gray-600">
        <div className="font-semibold text-gray-800 mb-1">{featureLabel("finops_live")}</div>
        <p className="mb-2">
          Analyze utilization vs. cost, compare modeled estimates to Cost Explorer actuals, and get
          ranked optimization recommendations with Terraform hints.
        </p>
        <a
          href={UPGRADE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber-700 font-medium hover:underline"
        >
          Upgrade to Professional →
        </a>
      </div>
    );
  }

  return (
    <div className="border border-emerald-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-emerald-50 border-b border-emerald-100">
        <div>
          <span className="text-xs font-semibold text-emerald-900">FinOps Analysis</span>
          {csvActual && (
            <span className="ml-2 text-[10px] text-emerald-700">Cost Explorer CSV loaded</span>
          )}
        </div>
        <button
          type="button"
          onClick={runAnalysis}
          disabled={disabled || status === "loading"}
          className={[
            "text-xs px-3 py-1 rounded transition-colors",
            status === "loading"
              ? "bg-emerald-100 text-emerald-600 cursor-wait"
              : "bg-emerald-600 hover:bg-emerald-500 text-white",
          ].join(" ")}
        >
          {status === "loading" ? "Analyzing…" : "Run analysis"}
        </button>
      </div>

      <div className="px-4 py-2 border-b border-emerald-50 space-y-2">
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-gray-700">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={fetchCloudwatch}
              onChange={(e) => setFetchCloudwatch(e.target.checked)}
            />
            Fetch CloudWatch metrics (AWS creds on server)
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={fetchCostExplorer}
              onChange={(e) => setFetchCostExplorer(e.target.checked)}
              disabled={!!csvActual}
            />
            Fetch Cost Explorer API
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={summaryLlm}
              onChange={(e) => setSummaryLlm(e.target.checked)}
            />
            AI executive summary
          </label>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 mb-1">
            Utilization CSV (optional): component_id,cpu_avg_percent,memory_avg_percent
          </label>
          <textarea
            value={utilizationCsv}
            onChange={(e) => setUtilizationCsv(e.target.value)}
            rows={2}
            placeholder="web,12.5,45&#10;db,8.0,"
            className="w-full text-[11px] font-mono border border-gray-200 rounded px-2 py-1 resize-y"
          />
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {status === "idle" && (
        <p className="px-4 py-3 text-xs text-gray-500">
          Run a cost estimate first, optionally import Cost Explorer CSV or enable live AWS APIs,
          then analyze for savings opportunities.
        </p>
      )}

      {status === "done" && report && (
        <div className="px-4 py-3 space-y-3">
          {report.summary && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50 p-2 text-xs text-indigo-900">
              <div className="font-semibold mb-1">AI summary</div>
              {report.summary}
            </div>
          )}

          {report.dataSources && Object.keys(report.dataSources).length > 0 && (
            <div className="text-[10px] space-y-0.5">
              {Object.entries(report.dataSources).map(([key, meta]) => (
                <div key={key} className={SOURCE_STYLES[meta.state] ?? "text-gray-600"}>
                  <span className="font-medium">{key}:</span> {meta.detail}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-emerald-100 bg-white p-2 text-center">
              <div className="text-[10px] text-gray-500">Selected savings / mo</div>
              <div className="text-sm font-bold text-emerald-700">{fmt(selectedSavings)}</div>
            </div>
            <div className="rounded-lg border border-emerald-100 bg-white p-2 text-center">
              <div className="text-[10px] text-gray-500">All recommendations / mo</div>
              <div className="text-sm font-bold text-gray-800">{fmt(report.totalSavingsMonthly)}</div>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(report.recommendations ?? []).map((rec) => (
              <label
                key={rec.id}
                className={[
                  "flex gap-2 p-2 rounded border text-xs cursor-pointer",
                  LEVEL_STYLES[rec.level] ?? LEVEL_STYLES.info,
                ].join(" ")}
              >
                <input
                  type="checkbox"
                  checked={!!selected[rec.id]}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [rec.id]: e.target.checked }))
                  }
                  className="mt-0.5 flex-shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-semibold">{rec.title}</div>
                  <div className="opacity-90 mt-0.5">{rec.description}</div>
                  {rec.projectedSavingsMonthly > 0 && (
                    <div className="mt-1 font-mono">
                      Save ~{fmt(rec.projectedSavingsMonthly)}/mo
                      {rec.projectedSavingsPercent != null && ` (${rec.projectedSavingsPercent}%)`}
                    </div>
                  )}
                  {rec.terraformHint && (
                    <code className="block mt-1 text-[10px] font-mono bg-white/60 px-1 py-0.5 rounded truncate">
                      {rec.terraformHint}
                    </code>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex gap-2 pt-1 border-t border-emerald-50">
            <button
              type="button"
              onClick={generateTerraform}
              disabled={terraformStatus === "loading" || !Object.values(selected).some(Boolean)}
              className="text-xs px-3 py-1 rounded bg-gray-800 hover:bg-gray-700 text-white disabled:opacity-50"
            >
              {terraformStatus === "loading" ? "Generating…" : "Generate Terraform"}
            </button>
            {terraformHcl && (
              <button
                type="button"
                onClick={copyTerraform}
                className="text-xs px-3 py-1 rounded border border-gray-300 hover:bg-gray-50"
              >
                Copy HCL
              </button>
            )}
          </div>

          {terraformHcl && (
            <pre className="text-[10px] font-mono bg-gray-900 text-gray-100 rounded p-2 max-h-40 overflow-auto whitespace-pre-wrap">
              {terraformHcl}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
