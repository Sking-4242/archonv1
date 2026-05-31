import { api } from "./client";

export async function getInstructorDashboard() {
  return api.get("/academy/classes/dashboard");
}

export async function listClasses() {
  return api.get("/academy/classes");
}

export async function createClass(data) {
  return api.post("/academy/classes", data);
}

export async function getClass(classId) {
  return api.get(`/academy/classes/${classId}`);
}

export async function updateClass(classId, data) {
  return api.patch(`/academy/classes/${classId}`, data);
}

export async function deleteClass(classId) {
  return api.delete(`/academy/classes/${classId}`);
}

export async function getClassRoster(classId) {
  return api.get(`/academy/classes/${classId}/roster`);
}

export async function enrollStudent(classId, email) {
  return api.post(`/academy/classes/${classId}/enroll`, { email });
}

export async function bulkEnrollStudents(classId, emails) {
  return api.post(`/academy/classes/${classId}/enroll/bulk`, { emails });
}

export async function removeStudent(classId, studentId) {
  return api.delete(`/academy/classes/${classId}/enroll/${studentId}`);
}

export async function markGraduating(classId, studentId, isGraduating) {
  return api.patch(`/academy/classes/${classId}/enroll/${studentId}/graduating`, {
    is_graduating: isGraduating,
  });
}

export async function getClassProgress(classId) {
  return api.get(`/academy/classes/${classId}/progress`);
}

export async function getClassStudent(classId, studentId) {
  return api.get(`/academy/classes/${classId}/students/${studentId}`);
}

export async function getClassAssignments(classId) {
  return api.get(`/academy/classes/${classId}/assignments`);
}

export async function assignToClass(classId, assignmentId, dueDate = null) {
  return api.post(`/academy/classes/${classId}/assignments/${assignmentId}`, {
    due_date: dueDate,
  });
}

export async function unassignFromClass(classId, assignmentId) {
  return api.delete(`/academy/classes/${classId}/assignments/${assignmentId}`);
}

export async function getClassModules(classId) {
  return api.get(`/academy/classes/${classId}/modules`);
}

export async function assignModuleToClass(classId, moduleId, dueDate = null) {
  return api.post(`/academy/classes/${classId}/modules/${moduleId}`, {
    due_date: dueDate,
  });
}

export async function unassignModuleFromClass(classId, moduleId) {
  return api.delete(`/academy/classes/${classId}/modules/${moduleId}`);
}

export async function joinClass(classCode) {
  return api.post("/academy/classes/join", { class_code: classCode });
}

export async function myEnrolledClasses() {
  return api.get("/academy/classes/my/enrolled");
}
