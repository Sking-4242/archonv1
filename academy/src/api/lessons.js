import { api } from "./client";

export async function listLessons(course) {
  const qs = course ? `?course=${course}` : "";
  return api.get(`/academy/lessons${qs}`);
}

export async function getLesson(id) {
  return api.get(`/academy/lessons/${id}`);
}

export async function createLesson(data) {
  return api.post("/academy/lessons", data);
}

export async function updateLesson(id, data) {
  return api.put(`/academy/lessons/${id}`, data);
}

export async function deleteLesson(id) {
  return api.delete(`/academy/lessons/${id}`);
}

export async function markLessonComplete(id) {
  return api.post(`/academy/lessons/${id}/complete`, {});
}

export async function unmarkLessonComplete(id) {
  return api.delete(`/academy/lessons/${id}/complete`);
}
