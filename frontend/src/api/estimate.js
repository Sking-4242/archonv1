const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function fetchEstimate(graph) {
  const res = await fetch(`${API_URL}/estimate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(graph),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Estimate failed (${res.status}): ${detail}`);
  }
  return res.json();
}
