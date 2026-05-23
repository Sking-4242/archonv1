const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function sendChatMessage(
  graph,
  messages,
  { provider, apiKey, model, baseUrl } = {},
) {
  const res = await fetch(`${API_URL}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      graph,
      messages,
      provider: provider ?? null,
      api_key: apiKey ?? null,
      model: model ?? null,
      base_url: baseUrl ?? null,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Chat failed (${res.status}): ${detail}`);
  }
  return res.json();
}

export async function sendDesignMessage(
  graph,
  messages,
  { provider, apiKey, model, baseUrl } = {},
) {
  const res = await fetch(`${API_URL}/design`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      graph,
      messages,
      provider: provider ?? null,
      api_key: apiKey ?? null,
      model: model ?? null,
      base_url: baseUrl ?? null,
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Design failed (${res.status}): ${detail}`);
  }
  return res.json();
}
