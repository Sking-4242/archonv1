import { api } from "./client";

export async function fetchAccessStatus() {
  return api.get("/access/status");
}
