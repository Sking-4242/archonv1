import { create } from "zustand";

// Infrastructure cloud provider (separate from LLM provider in settingsStore)
const STORAGE_KEY = "archon_infra_provider";

const _load = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "aws";
  } catch {
    return "aws";
  }
};

const useProviderStore = create((set) => ({
  infraProvider: _load(),

  setInfraProvider: (provider) => {
    try {
      localStorage.setItem(STORAGE_KEY, provider);
    } catch (_) {}
    set({ infraProvider: provider });
  },
}));

export default useProviderStore;
