import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { fetchEstimate } from "../../api/estimate";
import FinOpsSection from "./FinOpsSection";
import useGraphStore from "../../store/graphStore";
import useProviderStore from "../../store/providerStore";
import useUsageStore from "../../store/usageStore";
import { getUsageSchema } from "../../utils/usageSchema";

const REGIONS_BY_PROVIDER = {
  aws: [
    "us-east-1","us-east-2","us-west-1","us-west-2","ca-central-1",
    "eu-west-1","eu-west-2","eu-west-3","eu-central-1","eu-north-1",
    "ap-northeast-1","ap-northeast-2","ap-southeast-1","ap-southeast-2",
    "ap-south-1","sa-east-1","me-south-1","af-south-1",
  ],
  azure: [
    "eastus","eastus2","westus","westus2","westus3","centralus",
    "northcentralus","southcentralus","canadacentral","canadaeast",
    "northeurope","westeurope","uksouth","ukwest","francecentral",
    "germanywestcentral","swedencentral","norwayeast","eastasia",
    "southeastasia","japaneast","japanwest","australiaeast",
    "australiasoutheast","centralindia","southindia","brazilsouth",
  ],
  gcp: [
    "us-central1","us-east1","us-east4","us-east5","us-south1",
    "us-west1","us-west2","us-west3","us-west4",
    "northamerica-northeast1","northamerica-northeast2","southamerica-east1",
    "europe-north1","europe-west1","europe-west2","europe-west3",
    "europe-west4","europe-west6","europe-west8","europe-west9",
    "asia-east1","asia-east2","asia-northeast1","asia-northeast2",
    "asia-northeast3","asia-south1","asia-south2","asia-southeast1",
    "asia-southeast2","australia-southeast1",
  ],
  onprem: ["on-premises"],
};

const CSV_SERVICE_MAP = {
  "amazon elastic compute cloud": "ec2",
  "amazon ec2": "ec2",
  "aws lambda": "lambda",
  "amazon simple storage service": "s3",
  "amazon s3": "s3",
  "amazon dynamodb": "dynamodb",
  "amazon relational database service": "rds",
  "amazon rds": "rds",
  "amazon aurora": "aurora",
  "amazon cloudfront": "cloudfront",
  "amazon api gateway": "api_gateway",
  "amazon simple queue service": "sqs",
  "amazon simple notification service": "sns",
  "amazon kinesis": "kinesis",
  "amazon kinesis data firehose": "kinesis_firehose",
  "amazon elasticache": "elasticache",
  "amazon elastic kubernetes service": "eks",
  "amazon elastic container service": "ecs_fargate",
  "amazon cloudwatch": "cloudwatch",
  "amazon route 53": "route53",
  "aws secrets manager": "secretsmanager",
  "aws key management service": "kms",
  "amazon cognito": "cognito",
  "amazon bedrock": "bedrock",
  "aws waf": "waf",
  "amazon guardduty": "guardduty",
  "amazon athena": "athena",
  "aws glue": "glue",
  "amazon managed streaming for apache kafka": "msk",
  "amazon eventbridge": "eventbridge",
  "amazon redshift": "redshift",
  "aws step functions": "step_functions",
  "amazon elastic container registry": "ecr",
  "amazon elastic block store": "ebs",
  "amazon elastic file system": "efs",
  "aws backup": "backup",
  "amazon inspector": "inspector",
  "aws security hub": "security_hub",
  "amazon macie": "macie",
  "aws cloudtrail": "cloudtrail",
  "aws x-ray": "xray",
  "aws config": "config",
  "amazon sagemaker": "sagemaker",
  "amazon rekognition": "rekognition",
  "amazon comprehend": "comprehend",
  "amazon textract": "textract",
  "amazon polly": "polly",
  "amazon translate": "translate",
  "amazon lex": "lex",
  "aws codebuild": "codebuild",
  "aws codepipeline": "codepipeline",
  "amazon timestream": "timestream",
  "amazon opensearch service": "opensearch",
  "amazon documentdb": "documentdb",
  "amazon neptune": "neptune",
  "amazon appsync": "appsync",
  "amazon mq": "mq",
  "aws direct connect": "direct_connect",
  "aws transit gateway": "transit_gateway",
};

function parseCostExplorerCsv(text) {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const serviceIdx = headers.findIndex((h) => h === "service");
  if (serviceIdx === -1) return null;
  let costIdx = headers.findIndex((h) => h === "unblended cost");
  if (costIdx === -1) costIdx = headers.findIndex((h) => h === "cost");
  if (costIdx === -1) costIdx = headers.findIndex((h) => h.includes("cost"));
  if (costIdx === -1) return null;
  const result = {};
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const service = (cols[serviceIdx] ?? "").toLowerCase().replace(/\s+/g, " ").trim();
    const rawCost = (cols[costIdx] ?? "").replace(/[$,]/g, "");
    const cost = parseFloat(rawCost);
    if (!service || isNaN(cost)) continue;
    const type = CSV_SERVICE_MAP[service];
    if (type) result[type] = (result[type] ?? 0) + cost;
  }
  return Object.keys(result).length > 0 ? result : null;
}

const fmt = (n) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

// Stable empty object — prevents Zustand selector from returning a new {} on every
// call when a node has no overrides, which would cause an infinite re-render loop.
const _EMPTY_OVERRIDES = {};

const fmtShort = (n) => {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
};

function EstBadge() {
  return (
    <span className="ml-1 text-[10px] text-gray-400 italic" title="Pre-filled estimate">
      est.
    </span>
  );
}

function UsageRow({ node }) {
  const schema = getUsageSchema(node.type);
  const setUsageParam = useUsageStore((s) => s.setUsageParam);
  const nodeOverrides = useUsageStore((s) => s.usage[node.id] ?? _EMPTY_OVERRIDES);
  const [open, setOpen] = useState(true);
  if (!schema) return null;
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="text-left">
          <span className="text-xs font-semibold text-gray-800">{node.label}</span>
          <span className="ml-2 text-[10px] text-gray-400 font-mono">{node.type}</span>
        </div>
        <span className="text-gray-400 text-xs">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="px-3 py-2 space-y-2">
          {schema.fields.map((field) => {
            const overridden = nodeOverrides[field.key] !== undefined;
            const effectiveValue = overridden ? nodeOverrides[field.key] : field.default;
            return (
              <div key={field.key} className="flex items-center gap-2">
                <label className="flex-1 text-xs text-gray-600 min-w-0">
                  <span className="flex items-center gap-0.5">
                    {field.label}
                    {!overridden && <EstBadge />}
                  </span>
                  {field.description && (
                    <span className="block text-[10px] text-gray-400 mt-0.5 leading-tight">
                      {field.description}
                    </span>
                  )}
                </label>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <input
                    type="number"
                    min={0}
                    step="any"
                    value={effectiveValue}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") { setUsageParam(node.id, field.key, null); return; }
                      const val = parseFloat(raw);
                      if (!isNaN(val)) setUsageParam(node.id, field.key, val);
                    }}
                    onBlur={(e) => {
                      if (e.target.value === "" || isNaN(parseFloat(e.target.value))) {
                        setUsageParam(node.id, field.key, null);
                      }
                    }}
                    className={[
                      "w-24 text-xs px-2 py-1 border rounded text-right focus:outline-none focus:ring-1 focus:ring-amber-400",
                      overridden
                        ? "border-amber-300 bg-amber-50 text-gray-900"
                        : "border-gray-200 bg-white text-gray-500 italic",
                    ].join(" ")}
                  />
                  <span className="text-[10px] text-gray-400 w-8 text-left truncate">
                    {field.unit}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow-sm px-3 py-2 text-xs">
      <div className="font-semibold text-gray-700">{label}</div>
      <div className="text-amber-700 font-mono">{fmt(payload[0].value)}</div>
    </div>
  );
}

function ProjectionChart({ data, months }) {
  if (!data.length) return null;
  const total = data.reduce((s, d) => s + d.cost, 0);
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          Cost Projection
        </span>
        <span className="text-xs text-gray-500">
          {months}-month total:{" "}
          <span className="font-semibold text-gray-800">{fmt(total)}</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            interval={months === 6 ? 0 : months === 12 ? 1 : 3}
          />
          <YAxis
            tickFormatter={fmtShort}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="cost"
            stroke="#d97706"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#d97706" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function EstimatePanel({ graph, onClose }) {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [growthRate, setGrowthRate] = useState(10);
  const [projectionMonths, setProjectionMonths] = useState(12);
  const [csvActual, setCsvActual] = useState(null);
  const [csvError, setCsvError] = useState(null);
  const fileInputRef = useRef(null);
  const debounceRef = useRef(null);

  const region = useGraphStore((s) => s.graphMeta.region);
  const updateGraphMeta = useGraphStore((s) => s.updateGraphMeta);
  const infraProvider = useProviderStore((s) => s.infraProvider);
  const regionList = REGIONS_BY_PROVIDER[infraProvider] ?? REGIONS_BY_PROVIDER.aws;
  const usage = useUsageStore((s) => s.usage);
  const getNodeParams = useUsageStore((s) => s.getNodeParams);

  const usageNodes = useMemo(
    () => (graph?.components ?? []).filter((c) => getUsageSchema(c.type)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph?.components]
  );

  const buildUsageParams = useCallback(() => {
    const params = {};
    for (const node of usageNodes) {
      const schema = getUsageSchema(node.type);
      params[node.id] = getNodeParams(node.id, node.type, schema);
    }
    return params;
  }, [usageNodes, getNodeParams]);

  useEffect(() => {
    if (!regionList.includes(region)) {
      updateGraphMeta({ region: regionList[0] });
      setResult(null);
      setStatus("idle");
    }
  }, [infraProvider]); // eslint-disable-line

  const runEstimate = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchEstimate(graph, buildUsageParams());
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, [graph, buildUsageParams]);

  useEffect(() => {
    if (status === "idle") return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runEstimate(), 700);
    return () => clearTimeout(debounceRef.current);
  }, [usage]); // eslint-disable-line

  const projectionData = useMemo(() => {
    if (!result) return [];
    const base = result.totals.monthly;
    return Array.from({ length: projectionMonths }, (_, i) => ({
      month: `M${i + 1}`,
      cost: Math.round(base * Math.pow(1 + growthRate / 100, i) * 100) / 100,
    }));
  }, [result, growthRate, projectionMonths]);

  function handleCsvFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvError(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCostExplorerCsv(ev.target.result);
      if (!parsed) {
        setCsvError("Could not parse this file. Export a monthly service summary from AWS Cost Explorer (CSV format).");
        setCsvActual(null);
      } else {
        setCsvActual(parsed);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function getActualCost(componentType) {
    if (!csvActual) return null;
    return csvActual[componentType] ?? null;
  }

  const priceable = result?.line_items.filter((i) => i.monthly_cost > 0) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">Cost Estimate</span>
          <select
            value={region}
            onChange={(e) => { updateGraphMeta({ region: e.target.value }); setResult(null); setStatus("idle"); }}
            className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {regionList.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {result?.live_prices && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              LIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={runEstimate}
            disabled={status === "loading"}
            className={["text-xs px-3 py-1.5 rounded transition-colors", status === "loading" ? "bg-amber-100 text-amber-600 cursor-wait" : "bg-amber-600 hover:bg-amber-500 text-white"].join(" ")}
          >
            {status === "loading" ? "Calculating…" : status === "done" ? "Recalculate" : "Calculate"}
          </button>
          <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-700">&#x2715;</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {status === "idle" && (
          <div className="flex flex-col items-center justify-center py-12 px-5 text-center gap-2">
            <span className="text-2xl">&#128202;</span>
            <p className="text-sm text-gray-500">
              Set your expected usage below, then click{" "}
              <span className="font-medium text-amber-600">Calculate</span>.
            </p>
            <p className="text-xs text-gray-400">
              Pre-filled values are estimates &#8212; update them to match your actual usage.
            </p>
          </div>
        )}
        {status === "error" && (
          <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        {status === "done" && result && (
          <div className="px-5 py-4 space-y-5">
            {!result.live_prices && result.live_attempted && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                <span className="mt-0.5 flex-shrink-0">&#9888;</span>
                <span>
                  Live pricing unavailable &#8212; using static rates from {result.prices_as_of}.
                  Add cloud credentials to{" "}
                  <code className="font-mono bg-amber-100 px-0.5 rounded">.env</code> for real-time pricing.
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Weekly", value: result.totals.weekly },
                { label: "Monthly", value: result.totals.monthly },
                { label: "Yearly", value: result.totals.yearly },
              ].map(({ label, value }) => (
                <div key={label} className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center">
                  <div className="text-xs text-amber-600 font-medium mb-1">{label}</div>
                  <div className="text-base font-bold text-gray-900">{fmt(value)}</div>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-600 whitespace-nowrap">Growth rate</label>
                <input
                  type="number" min={0} max={500} step={1} value={growthRate}
                  onChange={(e) => setGrowthRate(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-16 text-xs px-2 py-1 border border-gray-200 rounded text-right focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
                <span className="text-xs text-gray-500">% / month</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-600">Projection</span>
                {[6, 12, 24].map((m) => (
                  <button
                    key={m}
                    onClick={() => setProjectionMonths(m)}
                    className={["text-xs px-2.5 py-1 rounded transition-colors border", projectionMonths === m ? "bg-amber-600 text-white border-amber-600" : "bg-white text-gray-600 border-gray-200 hover:border-amber-400"].join(" ")}
                  >
                    {m}mo
                  </button>
                ))}
              </div>
            </div>

            <ProjectionChart data={projectionData} months={projectionMonths} />

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setQuickOpen((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <span className="text-xs font-semibold text-gray-700">
                  Line Items{" "}
                  <span className="font-normal text-gray-400">({priceable.length} resources)</span>
                </span>
                <span className="text-gray-400 text-xs">{quickOpen ? "▲" : "▼"}</span>
              </button>
              {quickOpen && (
                <div className="overflow-x-auto">
                  {csvActual && (
                    <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 text-[10px] text-blue-600">
                      &#9679; Actual column from Cost Explorer import
                    </div>
                  )}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-gray-500 font-medium w-2/5">Resource</th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">Details</th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium whitespace-nowrap w-20">Modeled</th>
                        {csvActual && <th className="text-right px-3 py-2 text-blue-500 font-medium whitespace-nowrap w-20">Actual</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {priceable.map((item) => {
                        const actual = getActualCost(item.component_type);
                        const delta = actual != null ? Math.round(((item.monthly_cost - actual) / actual) * 100) : null;
                        return (
                          <tr key={item.component_id} className="border-b border-gray-100 last:border-0">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-800 truncate" title={item.component_label}>{item.component_label}</div>
                              <div className="text-gray-400 truncate">{item.component_type}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-500 truncate">{item.description}</td>
                            <td className="px-3 py-2 text-right font-mono text-gray-900 whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                {item.live && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Live price" />}
                                {fmt(item.monthly_cost)}
                              </div>
                            </td>
                            {csvActual && (
                              <td className="px-3 py-2 text-right whitespace-nowrap">
                                {actual != null ? (
                                  <div>
                                    <div className="font-mono text-blue-700">{fmt(actual)}</div>
                                    {delta != null && (
                                      <div className={["text-[10px]", Math.abs(delta) > 30 ? "text-red-500" : Math.abs(delta) > 15 ? "text-amber-500" : "text-gray-400"].join(" ")}>
                                        {delta > 0 ? "+" : ""}{delta}%
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-gray-300">&#8212;</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td className="px-3 py-2 font-semibold text-gray-700" colSpan={2}>Total</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">{fmt(result.totals.monthly)}</td>
                        {csvActual && (
                          <td className="px-3 py-2 text-right font-mono font-bold text-blue-700">
                            {fmt(Object.values(csvActual).reduce((s, v) => s + v, 0))}
                          </td>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-700">Calibrate with actual spend</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Upload a Cost Explorer monthly service summary CSV to compare modeled vs actual costs.
                  </div>
                </div>
                {csvActual && (
                  <button onClick={() => setCsvActual(null)} className="text-[10px] text-gray-400 hover:text-gray-600">
                    Clear
                  </button>
                )}
              </div>
              {csvError && (
                <div className="text-[10px] text-red-600 bg-red-50 px-2 py-1 rounded">{csvError}</div>
              )}
              {csvActual ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700">
                  <span>&#10003;</span>
                  <span>
                    {Object.keys(csvActual).length} service type{Object.keys(csvActual).length !== 1 ? "s" : ""} imported &#8212;
                    expand Line Items above to compare.
                  </span>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full text-xs px-3 py-2 border border-dashed border-gray-300 rounded text-gray-500 hover:border-amber-400 hover:text-amber-600 transition-colors"
                >
                  Click to upload Cost Explorer CSV
                </button>
              )}
              <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFile} />
              <div className="text-[10px] text-gray-400">
                In Cost Explorer: Reports &#8594; Monthly costs by service &#8594; Download CSV
              </div>
            </div>

            <FinOpsSection
              graph={graph}
              csvActual={csvActual}
              buildUsageParams={buildUsageParams}
              disabled={status !== "done"}
            />

            <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
              <span className="font-medium">Note: </span>
              {result.excluded_note} Estimates are for planning only.
            </p>
          </div>
        )}

        <div className="px-5 pb-4">
          {(status === "idle" || status === "done" || status === "error") && usageNodes.length > 0 && (
            <div className="space-y-3">
              {status !== "done" && (
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide pt-2">
                  Usage Inputs
                </div>
              )}
              {status === "done" && (
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide border-t border-gray-100 pt-4">
                  Usage Inputs
                  <span className="ml-2 text-[10px] text-gray-400 font-normal normal-case">
                    &#8212; edit and costs update automatically
                  </span>
                </div>
              )}
              <div className="text-[10px] text-gray-400">
                <span className="italic">est.</span> = pre-filled estimate &#183; edit any field to override
              </div>
              <div className="space-y-2">
                {usageNodes.map((node) => (
                  <UsageRow key={node.id} node={node} />
                ))}
              </div>
            </div>
          )}
          {(status === "idle" || status === "done" || status === "error") && usageNodes.length === 0 && (
            <p className="text-xs text-gray-400 py-4 text-center">
              No usage-billed services on canvas.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
