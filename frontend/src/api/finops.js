import { api } from "./client";

export async function fetchFinOpsAnalysis({
  graph,
  actualCosts,
  csvText,
  utilization,
  utilizationCsv,
  usageParams,
  fetchCloudwatch = false,
  fetchCostExplorer = false,
  summaryLlm = false,
  awsProfile = null,
  cloudwatchDays = 14,
}) {
  return api.post("/finops/analyze", {
    graph,
    actual_costs: actualCosts ?? null,
    csv_text: csvText ?? null,
    utilization: utilization ?? {},
    utilization_csv: utilizationCsv ?? null,
    usage_params: usageParams ?? {},
    fetch_cloudwatch: fetchCloudwatch,
    fetch_cost_explorer: fetchCostExplorer,
    summary_llm: summaryLlm,
    aws_profile: awsProfile || null,
    cloudwatch_days: cloudwatchDays,
  });
}

export async function fetchFinOpsTerraform({ graph, recommendations }) {
  return api.post("/finops/terraform", {
    graph,
    recommendations,
  });
}
