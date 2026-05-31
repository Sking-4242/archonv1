import { api } from "./client";

export async function loginUser(email, password) {
  return api.post("/auth/login", { email, password });
}

export async function verifyMfa(mfaToken, code) {
  return api.post("/auth/mfa/verify", { mfa_token: mfaToken, code });
}

export async function registerUser(email, password, displayName) {
  return api.post("/auth/register", {
    email,
    password,
    display_name: displayName || undefined,
    academy_role: "student",
  });
}

export async function fetchMe() {
  return api.get("/auth/me");
}

export async function requestPasswordReset(email) {
  return api.post("/auth/password/forgot", { email });
}

export async function resetPassword(token, password) {
  return api.post("/auth/password/reset", { token, password });
}

export async function setupMfa() {
  return api.post("/auth/mfa/setup", {});
}

export async function enableMfa(code) {
  return api.post("/auth/mfa/enable", { code });
}

export async function disableMfa(code) {
  return api.post("/auth/mfa/disable", { code });
}
