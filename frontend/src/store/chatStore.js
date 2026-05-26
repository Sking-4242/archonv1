import { create } from "zustand";

const STORAGE_KEY = "archon-chat-history";
const MAX_MESSAGES_PER_THREAD = 200;

// ── Storage helpers ───────────────────────────────────────────────────────────

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
// Message: { role, content, plan?, stage?, graph? }

const useChatStore = create((set, get) => ({
  threads: loadFromStorage(),

  getMessages: (archId, mode) => {
    const key = `${archId}:${mode}`;
    return get().threads[key]?.messages ?? [];
  },

  addMessage: (archId, mode, message) => {
    const key = `${archId}:${mode}`;
    const { threads } = get();
    const existing = threads[key] ?? { messages: [] };
    const messages = [...existing.messages, message].slice(-MAX_MESSAGES_PER_THREAD);
    const updated = {
      ...threads,
      [key]: { messages, updatedAt: new Date().toISOString() },
    };
    saveToStorage(updated);
    set({ threads: updated });
  },

  clearThread: (archId, mode) => {
    const key = `${archId}:${mode}`;
    const { threads } = get();
    const { [key]: _removed, ...rest } = threads;
    saveToStorage(rest);
    set({ threads: rest });
  },
}));

export default useChatStore;
