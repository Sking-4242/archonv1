import { create } from "zustand";

const PROVIDERS = ["anthropic", "openai", "gemini", "ollama", "xai"];

const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4.1",
  gemini: "gemini-2.5-flash",
  ollama: "llama4",
  xai: "grok-3",
};

const _loadDarkMode = () => {
  try {
    return localStorage.getItem("archon_dark_mode") === "true";
  } catch {
    return false;
  }
};

const useSettingsStore = create((set) => ({
  provider: "anthropic",
  models: { ...DEFAULT_MODELS },
  apiKeys: {
    anthropic: "",
    openai: "",
    gemini: "",
    xai: "",
  },
  ollamaBaseUrl: "http://localhost:11434",
  providers: PROVIDERS,
  defaultModels: DEFAULT_MODELS,
  darkMode: _loadDarkMode(),

  setProvider: (provider) => set({ provider }),
  setModel: (provider, model) =>
    set((state) => ({ models: { ...state.models, [provider]: model } })),
  setApiKey: (provider, key) =>
    set((state) => ({ apiKeys: { ...state.apiKeys, [provider]: key } })),
  setOllamaBaseUrl: (url) => set({ ollamaBaseUrl: url }),
  toggleDarkMode: () =>
    set((state) => {
      const next = !state.darkMode;
      try {
        localStorage.setItem("archon_dark_mode", String(next));
      } catch {}
      return { darkMode: next };
    }),
}));

export default useSettingsStore;
