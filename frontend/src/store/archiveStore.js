import { create } from "zustand";

const STORAGE_KEY = "archon_library";

const _load = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const _save = (entries) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (_) {}
};

const useArchiveStore = create((set, get) => ({
  entries: _load(),

  saveArchitecture: (graph) => {
    const entry = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      name: graph.name || "Untitled Architecture",
      provider: graph.provider || "aws",
      region: graph.region || "us-east-1",
      componentCount: (graph.components || []).length,
      graph,
    };
    const entries = [entry, ...get().entries].slice(0, 50);
    _save(entries);
    set({ entries });
    return entry;
  },

  deleteArchitecture: (id) => {
    const entries = get().entries.filter((e) => e.id !== id);
    _save(entries);
    set({ entries });
  },

  clearAll: () => {
    _save([]);
    set({ entries: [] });
  },
}));

export default useArchiveStore;
