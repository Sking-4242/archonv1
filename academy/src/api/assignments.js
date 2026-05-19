import { api } from "./client";

export async function listAssignments(token) {
  return api.get("/academy/assignments", token);
}

export async function getAssignment(id, token) {
  return api.get(`/academy/assignments/${id}`, token);
}

export async function createAssignment(data, token) {
  return api.post("/academy/assignments", data, token);
}
