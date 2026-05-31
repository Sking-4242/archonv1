import { api } from "./client";

export async function loginUser(email, password) {
  return api.post("/auth/login", { email, password });
}

export async function verifyMfa(mfaToken, code) {
  return api.post("/auth/mfa/verify", { mfa_token: mfaToken, code });
}

// alias for backward compatibility
export const login = loginUser;

export async function logout(token) {
  return api.post("/academy/auth/logout", {}, token);
}
