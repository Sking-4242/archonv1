import { api } from "./client";

export async function sendTutorMessage(payload) {
  return api.post("/academy/tutor/chat", payload);
}
