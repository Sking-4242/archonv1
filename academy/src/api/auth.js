import { api } from "./client";

export async function loginUser(email, password) {
  return api.post("/academy/auth/login", { email, password });
}

// alias for backward compatibility
export const login = loginUser;

export async function logout(token) {
  return api.post("/academy/auth/logout", {}, token);
}
