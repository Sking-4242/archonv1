import { create } from "zustand";

const STORAGE_KEY = "archon-chat-history";
const MAX_MESSAGES_PER_THREAD = 200;

// ── Storage helpers (same pattern as graphStore) ──────────────────────────────

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw).threads ?? {};
  } catch {
    return {};
  }
}

function saveToStorage(threads) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ threads }));
  } catch {
    // localStorage full — silently skip; history is non-critical
  }
}

// ── Store ─────────────────────────────────────────────────────────────────────
// Threads are keyed by "${archId}:chat" or "${archId}:build".
// Each thread: { messages: Message[], updatedAt: ISO string }
// Message fields: role, content, stage?, plan?, graph?

const useChatStore = create((set) => ({
  threads: loadFromStorage(),

  addMessages: (threadKey, incoming) =>
    set((state) => {
      const current = state.threads[threadKey]?.messages ?? [];
      const merged = [...current, ...incoming].slice(-MAX_MESSAGES_PER_THREAD);
      const threads = {
        ...state.threads,
        [threadKey]: { messages: merged, updatedAt: new Date().toISOString() },
      };
      saveToStorage(threads);
      return { threads };
    }),

  clearThread: (threadKey) =>
    set((state) => {
      const { [threadKey]: _removed, ...rest } = state.threads;
      saveToStorage(rest);
      return { threads: rest };
    }),
}));

export default useChatStore;
