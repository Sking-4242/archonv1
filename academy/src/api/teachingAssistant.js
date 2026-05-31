import { api } from "./client";

export async function sendTeachingAssistantMessage(payload) {
  return api.post("/academy/teaching-assistant/chat", payload);
}

export async function listAssistantTasks() {
  return api.get("/academy/teaching-assistant/tasks");
}
