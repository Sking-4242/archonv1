import { api } from "./client";

export async function listModules(course) {
  const qs = course ? `?course=${course}` : "";
  return api.get(`/academy/modules${qs}`);
}

export async function getModule(id) {
  return api.get(`/academy/modules/${id}`);
}

export async function createModule(data) {
  return api.post("/academy/modules", data);
}

export async function updateModule(id, data) {
  return api.put(`/academy/modules/${id}`, data);
}

export async function deleteModule(id) {
  return api.delete(`/academy/modules/${id}`);
}

export async function reorderModules(items) {
  return api.post("/academy/modules/reorder", { items });
}

export async function linkAssignment(moduleId, assignmentId, orderIndex = 0) {
  return api.post(`/academy/modules/${moduleId}/assignments`, {
    assignment_id: assignmentId,
    order_index: orderIndex,
  });
}

export async function unlinkAssignment(moduleId, assignmentId) {
  return api.delete(`/academy/modules/${moduleId}/assignments/${assignmentId}`);
}

export async function reorderLessons(moduleId, items) {
  return api.post(`/academy/modules/${moduleId}/lessons/reorder`, { items });
}
