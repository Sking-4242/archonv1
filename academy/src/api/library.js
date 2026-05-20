import { api } from "./client";

// ── Library lessons ───────────────────────────────────────────────────────────

export async function listLibrary(course) {
  const qs = course ? `?course=${course}` : "";
  return api.get(`/academy/library${qs}`);
}

export async function searchLibrary(q, course) {
  const qs = new URLSearchParams({ q, ...(course ? { course } : {}) });
  return api.get(`/academy/library/search?${qs}`);
}

export async function getLibraryLesson(id) {
  return api.get(`/academy/library/${id}`);
}

export async function markLibraryComplete(id) {
  return api.post(`/academy/library/${id}/complete`, {});
}

export async function unmarkLibraryComplete(id) {
  return api.delete(`/academy/library/${id}/complete`);
}

// ── Module library links ──────────────────────────────────────────────────────

export async function getModuleLibraryLinks(moduleId) {
  return api.get(`/academy/modules/${moduleId}/library-links`);
}

export async function linkLibraryLesson(moduleId, libraryLessonId, orderIndex = 0) {
  return api.post(`/academy/modules/${moduleId}/library-links`, {
    library_lesson_id: libraryLessonId,
    order_index: orderIndex,
  });
}

export async function updateLibraryLink(moduleId, linkId, { instructor_note, instructor_note_visible }) {
  return api.put(`/academy/modules/${moduleId}/library-links/${linkId}`, {
    instructor_note,
    instructor_note_visible,
  });
}

export async function unlinkLibraryLesson(moduleId, linkId) {
  return api.delete(`/academy/modules/${moduleId}/library-links/${linkId}`);
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export async function getNotes({ lessonId, libraryLessonId }) {
  const qs = new URLSearchParams();
  if (lessonId) qs.set("lesson_id", lessonId);
  if (libraryLessonId) qs.set("library_lesson_id", libraryLessonId);
  return api.get(`/academy/notes?${qs}`);
}

export async function createNote({ lessonId, libraryLessonId, content, is_visible = false }) {
  return api.post("/academy/notes", {
    lesson_id: lessonId ?? null,
    library_lesson_id: libraryLessonId ?? null,
    content,
    is_visible,
  });
}

export async function updateNote(noteId, { content, is_visible }) {
  return api.put(`/academy/notes/${noteId}`, {
    content,
    is_visible,
  });
}

export async function deleteNote(noteId) {
  return api.delete(`/academy/notes/${noteId}`);
}
