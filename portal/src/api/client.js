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
    const raw = localStorage.getItem("archon-portal-auth");
    if (!raw) return null;
    return JSON.parse(raw)?.state?.token ?? null;
  } catch {
    return null;
  }
}

async function parseErrorDetail(res) {
  const err = await res.json().catch(() => ({ detail: res.statusText }));
  return typeof err.detail === "string" ? err.detail : "Request failed";
}

async function request(method, path, body) {
  const publicAuth = isPublicAuthPath(path);
  const headers = { "Content-Type": "application/json" };
  const token = publicAuth ? null : getStoredToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    const detail = await parseErrorDetail(res);
    if (publicAuth) {
      throw new Error(detail === "Unauthorized" ? "Invalid email or password" : detail);
    }
    localStorage.removeItem("archon-portal-auth");
    throw new Error("Session expired. Please log in again.");
  }
  if (!res.ok) {
    throw new Error(await parseErrorDetail(res));
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  delete: (path) => request("DELETE", path),
};
