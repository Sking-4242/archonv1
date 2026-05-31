const BASE_URL = import.meta.env.VITE_API_URL ?? "";

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
    const raw = localStorage.getItem("archon-pro-auth");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function parseErrorDetail(res) {
  const err = await res.json().catch(() => ({ detail: res.statusText }));
  const detail = err.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return detail?.message ?? "Request failed";
}

async function request(method, path, body, token) {
  const publicAuth = isPublicAuthPath(path);
  const resolvedToken = publicAuth ? null : token ?? getStoredToken();
  const headers = { "Content-Type": "application/json" };
  if (resolvedToken) headers.Authorization = `Bearer ${resolvedToken}`;

  const url = BASE_URL ? `${BASE_URL}${path}` : path;
  let res;
  try {
    res = await fetch(url, {
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
      localStorage.removeItem("archon-pro-auth");
    } catch {}
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    throw new Error(await parseErrorDetail(res));
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path, token) => request("GET", path, null, token),
  post: (path, body, token) => request("POST", path, body, token),
  put: (path, body, token) => request("PUT", path, body, token),
  delete: (path, token) => request("DELETE", path, null, token),
};
