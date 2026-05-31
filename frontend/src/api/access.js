import { api } from "./client";

export async function fetchAccessStatus() {
  return api.get("/access/status");
}

export async function activateLicense(key) {
  return api.post("/license/activate", { key });
}
