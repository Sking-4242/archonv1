import { api } from "./client";

export async function fetchPracticeTestCatalog() {
  return api.get("/academy/practice-tests/catalog");
}

export async function fetchPracticeTestAttempts(cert) {
  const query = cert ? `?cert=${encodeURIComponent(cert)}` : "";
  return api.get(`/academy/practice-tests/attempts${query}`);
}

export async function startPracticeTest({ cert, testNumber, mode }) {
  return api.post("/academy/practice-tests/attempts/start", {
    cert,
    test_number: testNumber,
    mode,
  });
}

export async function fetchPracticeTestAttempt(attemptId) {
  return api.get(`/academy/practice-tests/attempts/${attemptId}`);
}

export async function savePracticeTestAnswer(attemptId, questionId, answer) {
  return api.put(`/academy/practice-tests/attempts/${attemptId}/answer`, {
    question_id: questionId,
    answer,
  });
}

export async function checkPracticeTestAnswer(attemptId, questionId, answer) {
  return api.post(`/academy/practice-tests/attempts/${attemptId}/check`, {
    question_id: questionId,
    answer,
  });
}

export async function submitPracticeTest(attemptId, { answers, timeSpentSeconds } = {}) {
  return api.post(`/academy/practice-tests/attempts/${attemptId}/submit`, {
    answers: answers ?? undefined,
    time_spent_seconds: timeSpentSeconds ?? undefined,
  });
}
