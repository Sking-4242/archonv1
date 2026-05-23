import { create } from "zustand";
import { persist } from "zustand/middleware";

const PROVIDERS = ["anthropic", "openai", "gemini", "ollama", "xai"];

const DEFAULT_MODELS = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4.1",
  gemini: "gemini-2.5-flash",
  ollama: "llama4",
  xai: "grok-3",
};

const useSettingsStore = create(
  persist(
    (set) => ({
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
      darkMode: false,

      setProvider: (provider) => set({ provider }),
      setModel: (provider, model) =>
        set((state) => ({ models: { ...state.models, [provider]: model } })),
      setApiKey: (provider, key) =>
        set((state) => ({ apiKeys: { ...state.apiKeys, [provider]: key } })),
      setOllamaBaseUrl: (url) => set({ ollamaBaseUrl: url }),
      toggleDarkMode: () =>
        set((state) => ({ darkMode: !state.darkMode })),
    }),
    {
      name: "archon-settings",
      partialize: (state) => ({
        provider: state.provider,
        models: state.models,
        apiKeys: state.apiKeys,
        ollamaBaseUrl: state.ollamaBaseUrl,
        darkMode: state.darkMode,
      }),
    },
  ),
);

export default useSettingsStore;
