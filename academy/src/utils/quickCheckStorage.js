const STORAGE_PREFIX = "archon:quick-check:";

export function loadQuickCheckState(storageKey) {
  if (!storageKey) return {};
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveQuickCheckAnswer(storageKey, questionId, selected) {
  if (!storageKey) return;
  const state = loadQuickCheckState(storageKey);
  state[String(questionId)] = { selected, submitted: true };
  localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(state));
}

export function clearQuickCheckState(storageKey) {
  if (!storageKey) return;
  localStorage.removeItem(STORAGE_PREFIX + storageKey);
}

export function hasQuickCheckProgress(storageKey, questionIds) {
  if (!storageKey || !questionIds?.length) return false;
  const state = loadQuickCheckState(storageKey);
  return questionIds.some((id) => Boolean(state[String(id)]?.submitted));
}
