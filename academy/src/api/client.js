// Relative base — requests go to the same origin (localhost:3001) and are
// proxied to the backend by Vite's dev server. No CORS, no hardcoded URLs.
// See vite.config.js proxy config for the forwarding target.
const BASE_URL = "";

function getStoredToken() {
  try {
    const raw = localStorage.getItem("archon-academy-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function request(method, path, body, token) {
  const resolvedToken = token ?? getStoredToken();
  const headers = { "Content-Type": "application/json" };
  if (resolvedToken) headers["Authorization"] = `Bearer ${resolvedToken}`;

  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Cannot reach the server. Make sure the backend is running.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  get:    (path, token)       => request("GET",    path, null, token),
  post:   (path, body, token) => request("POST",   path, body, token),
  patch:  (path, body, token) => request("PATCH",  path, body, token),
  delete: (path, token)       => request("DELETE", path, null, token),
};
