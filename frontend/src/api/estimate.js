import { api } from "./client";

export async function fetchEstimate(graph, usageParams = {}) {
  return api.post("/estimate", { graph, usage_params: usageParams });
}
