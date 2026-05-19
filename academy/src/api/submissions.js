import { api } from "./client";

export async function submitAssignment(assignmentId, graphJson, token) {
  return api.post("/academy/submissions", { assignment_id: assignmentId, graph: graphJson }, token);
}

export async function getSubmission(id, token) {
  return api.get(`/academy/submissions/${id}`, token);
}

export async function listSubmissions(assignmentId, token) {
  return api.get(`/academy/submissions?assignment_id=${assignmentId}`, token);
}

export async function gradeSubmission(id, score, feedback, token) {
  return api.patch(`/academy/submissions/${id}/grade`, { score, feedback }, token);
}
