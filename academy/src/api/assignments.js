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

export async function updateAssignment(id, data, token) {
  return api.put(`/academy/assignments/${id}`, data, token);
}

export async function deleteAssignment(id, token) {
  return api.delete(`/academy/assignments/${id}`, token);
}
