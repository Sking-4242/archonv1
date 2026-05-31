// Relative base — requests go to the same origin (localhost:3001) and are
// proxied to the backend by Vite's dev server. No CORS, no hardcoded URLs.
const BASE_URL = "";

const PUBLIC_AUTH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/mfa/verify",
  "/auth/password/forgot",
  "/auth/password/reset",
];

function isPublicAuthPath(path) {
  return PUBLIC_AUTH_PATHS.some((prefix) => path.startsWith(prefix));
}

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

async function parseErrorDetail(res) {
  const err = await res.json().catch(() => ({ detail: res.statusText }));
  return typeof err.detail === "string" ? err.detail : err.detail || "Request failed";
}

async function request(method, path, body, token) {
  const publicAuth = isPublicAuthPath(path);
  const resolvedToken = publicAuth ? null : token ?? getStoredToken();
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

  if (res.status === 401) {
    const detail = await parseErrorDetail(res);
    if (publicAuth) {
      throw new Error(detail === "Unauthorized" ? "Invalid email or password" : detail);
    }
    try {
      localStorage.removeItem("archon-academy-auth");
    } catch {}
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    throw new Error(await parseErrorDetail(res));
  }

  return res.json();
}

export const api = {
  get: (path, token) => request("GET", path, null, token),
  post: (path, body, token) => request("POST", path, body, token),
  put: (path, body, token) => request("PUT", path, body, token),
  patch: (path, body, token) => request("PATCH", path, body, token),
  delete: (path, token) => request("DELETE", path, null, token),
};
