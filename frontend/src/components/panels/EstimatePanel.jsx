import { useState, useCallback, useEffect } from "react";
import { fetchEstimate } from "../../api/estimate";
import useGraphStore from "../../store/graphStore";
import useProviderStore from "../../store/providerStore";

const REGIONS_BY_PROVIDER = {
  aws: [
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "ca-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "eu-central-1",
    "eu-north-1",
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-south-1",
    "sa-east-1",
    "me-south-1",
    "af-south-1",
  ],
  azure: [
    "eastus",
    "eastus2",
    "westus",
    "westus2",
    "westus3",
    "centralus",
    "northcentralus",
    "southcentralus",
    "canadacentral",
    "canadaeast",
    "northeurope",
    "westeurope",
    "uksouth",
    "ukwest",
    "francecentral",
    "germanywestcentral",
    "swedencentral",
    "norwayeast",
    "eastasia",
    "southeastasia",
    "japaneast",
    "japanwest",
    "australiaeast",
    "australiasoutheast",
    "centralindia",
    "southindia",
    "brazilsouth",
  ],
  gcp: [
    "us-central1",
    "us-east1",
    "us-east4",
    "us-east5",
    "us-south1",
    "us-west1",
    "us-west2",
    "us-west3",
    "us-west4",
    "northamerica-northeast1",
    "northamerica-northeast2",
    "southamerica-east1",
    "europe-north1",
    "europe-west1",
    "europe-west2",
    "europe-west3",
    "europe-west4",
    "europe-west6",
    "europe-west8",
    "europe-west9",
    "asia-east1",
    "asia-east2",
    "asia-northeast1",
    "asia-northeast2",
    "asia-northeast3",
    "asia-south1",
    "asia-south2",
    "asia-southeast1",
    "asia-southeast2",
    "australia-southeast1",
  ],
  onprem: ["on-premises"],
};

const fmt = (n) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });

export default function EstimatePanel({ graph, onClose }) {
  const [status, setStatus] = useState("idle");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const region = useGraphStore((s) => s.graphMeta.region);
  const updateGraphMeta = useGraphStore((s) => s.updateGraphMeta);
  const infraProvider = useProviderStore((s) => s.infraProvider);
  const regionList = REGIONS_BY_PROVIDER[infraProvider] ?? REGIONS_BY_PROVIDER.aws;

  // When provider changes, reset the region to the first valid one for that provider
  useEffect(() => {
    if (!regionList.includes(region)) {
      updateGraphMeta({ region: regionList[0] });
      setResult(null);
      setStatus("idle");
    }
  }, [infraProvider]); // eslint-disable-line react-hooks/exhaustive-deps

  const runEstimate = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const data = await fetchEstimate(graph);
      setResult(data);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }, [graph]);

  const priceable = result?.line_items.filter((i) => i.monthly_cost > 0) ?? [];
  const usageBased =
    result?.line_items.filter((i) => i.monthly_cost === 0) ?? [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-gray-800">
            Cost Estimate
          </span>
          <select
            value={region}
            onChange={(e) => {
              updateGraphMeta({ region: e.target.value });
              setResult(null);
              setStatus("idle");
            }}
            className="text-xs border border-gray-200 rounded px-2 py-0.5 text-gray-600 focus:outline-none focus:ring-1 focus:ring-amber-400"
          >
            {regionList.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
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
            className={[
              "text-xs px-3 py-1.5 rounded transition-colors",
              status === "loading"
                ? "bg-amber-100 text-amber-600 cursor-wait"
                : "bg-amber-600 hover:bg-amber-500 text-white",
            ].join(" ")}
          >
            {status === "loading"
              ? "Calculating…"
              : status === "done"
                ? "Recalculate"
                : "Calculate"}
          </button>
          <button
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {status === "idle" && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Click{" "}
            <span className="mx-1 font-medium text-amber-600">Calculate</span>{" "}
            to estimate costs.
          </div>
        )}
        {status === "loading" && (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            Calculating costs…
          </div>
        )}
        {status === "error" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}
        {status === "done" && result && !result.live_prices && result.live_attempted && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
            <span className="mt-0.5 flex-shrink-0">⚠</span>
            <span>
              Live pricing unavailable — using static rates from {result.prices_as_of}.
              Add cloud credentials to <code className="font-mono bg-amber-100 px-0.5 rounded">.env</code> for real-time pricing.
            </span>
          </div>
        )}
        {status === "done" && result && (
          <div className="space-y-4">
            {/* Totals */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Weekly", value: result.totals.weekly },
                { label: "Monthly", value: result.totals.monthly },
                { label: "Yearly", value: result.totals.yearly },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-center"
                >
                  <div className="text-xs text-amber-600 font-medium mb-1">
                    {label}
                  </div>
                  <div className="text-base font-bold text-gray-900">
                    {fmt(value)}
                  </div>
                </div>
              ))}
            </div>

            {/* Priced line items */}
            {priceable.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Priced Resources
                </div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs table-fixed">
                    <colgroup>
                      <col className="w-[38%]" />
                      <col />
                      <col className="w-24" />
                    </colgroup>
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">
                          Resource
                        </th>
                        <th className="text-left px-3 py-2 text-gray-500 font-medium">
                          Details
                        </th>
                        <th className="text-right px-3 py-2 text-gray-500 font-medium whitespace-nowrap">
                          $/month
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceable.map((item) => (
                        <tr
                          key={item.component_id}
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="px-3 py-2">
                            <div className="font-medium text-gray-800 truncate" title={item.component_label}>
                              {item.component_label}
                            </div>
                            <div className="text-gray-400 truncate">
                              {item.component_type}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-500">
                            <div>{item.description}</div>
                            {item.note && (
                              <div className="text-gray-400 mt-0.5">
                                {item.note}
                              </div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-medium text-gray-900 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {item.live && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" title="Live price" />
                              )}
                              {fmt(item.monthly_cost)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 border-t border-gray-200">
                        <td
                          className="px-3 py-2 font-semibold text-gray-700"
                          colSpan={2}
                        >
                          Total
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">
                          {fmt(result.totals.monthly)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Usage-based */}
            {usageBased.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                  Usage-Based (not included in total)
                </div>
                <div className="space-y-1">
                  {usageBased.map((item) => (
                    <div
                      key={item.component_id}
                      className="flex items-start justify-between px-3 py-2 bg-gray-50 rounded text-xs text-gray-500"
                    >
                      <span className="font-medium text-gray-700">
                        {item.component_label}
                      </span>
                      {item.note && <span className="ml-2">{item.note}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 border-t border-gray-100 pt-3">
              <span className="font-medium">Note: </span>
              {result.excluded_note} Estimates are for planning only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
