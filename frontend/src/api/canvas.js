import { api } from "./client";

export async function listCanvasSaves() {
  return api.get("/canvas/saves");
}

export async function getCanvasSave(saveId) {
  return api.get(`/canvas/saves/${saveId}`);
}

export async function createCanvasSave(payload) {
  return api.post("/canvas/saves", payload);
}

export async function updateCanvasSave(saveId, payload) {
  return api.put(`/canvas/saves/${saveId}`, payload);
}

export async function deleteCanvasSave(saveId) {
  return api.delete(`/canvas/saves/${saveId}`);
}
