const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function generateTerraform({
  graph,
  provider,
  apiKey,
  model,
  baseUrl,
}) {
  const response = await fetch(`${API_URL}/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      graph,
      provider: provider ?? null,
      api_key: apiKey ?? null,
      model: model ?? null,
      base_url: baseUrl ?? null,
    }),
  });

  if (!response.ok) {
    let detail = "Generation failed. Please try again.";
    try {
      const data = await response.json();
      if (data.detail) {
        detail =
          typeof data.detail === "string"
            ? data.detail
            : JSON.stringify(data.detail);
      }
    } catch (_) {}
    const err = new Error(detail);
    err.status = response.status;
    throw err;
  }

  return response.json();
}
