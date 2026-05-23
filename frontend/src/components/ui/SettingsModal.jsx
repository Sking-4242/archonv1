import useSettingsStore from "../../store/settingsStore";

const PROVIDER_LABELS = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Google Gemini",
  ollama: "Ollama (local)",
  xai: "xAI (Grok)",
};

const PROVIDER_MODELS = {
  anthropic: [
    "claude-sonnet-4-6",
    "claude-opus-4-6",
    "claude-haiku-4-5-20251001",
  ],
  openai: ["gpt-4.1", "gpt-4.1-mini", "gpt-4o", "gpt-4o-mini", "o3", "o4-mini"],
  gemini: ["gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.0-flash"],
  ollama: ["llama4", "llama3.3", "llama3.2", "mistral", "phi4", "codellama"],
  xai: ["grok-3", "grok-3-fast", "grok-3-mini"],
};

export default function SettingsModal({ onClose }) {
  const {
    provider,
    models,
    apiKeys,
    ollamaBaseUrl,
    providers,
    setProvider,
    setModel,
    setApiKey,
    setOllamaBaseUrl,
  } = useSettingsStore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">LLM Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provider
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {providers.map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Model
            </label>
            <select
              value={models[provider]}
              onChange={(e) => setModel(provider, e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {(PROVIDER_MODELS[provider] ?? [models[provider]]).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {provider !== "ollama" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={apiKeys[provider] ?? ""}
                onChange={(e) => setApiKey(provider, e.target.value)}
                placeholder="Enter your API key"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-400">
                Saved locally in your browser. Never sent to any third party.
              </p>
            </div>
          )}

          {provider === "ollama" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ollama Base URL
              </label>
              <input
                type="text"
                value={ollamaBaseUrl}
                onChange={(e) => setOllamaBaseUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
