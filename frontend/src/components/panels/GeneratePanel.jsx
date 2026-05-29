import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import useGraphStore from "../../store/graphStore";
import useSecurityStore from "../../store/securityStore";
import useIAMStore from "../../store/iamStore";
import useSettingsStore from "../../store/settingsStore";
import useProviderStore from "../../store/providerStore";
import {
  serializeGraph,
  validateGraphForGeneration,
} from "../../utils/serializer";
import { generateTerraform } from "../../api/generate";

// ── HCL syntax coloriser ──────────────────────────────────────────────────────

function HCLViewer({ hcl }) {
  const lines = hcl.split("\n");
  return (
    <pre
      style={{
        backgroundColor: "#0f172a",
        color: "#e2e8f0",
        fontSize: "11px",
        lineHeight: "1.6",
        padding: "12px",
        margin: 0,
        overflowX: "auto",
        whiteSpace: "pre",
        fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
      }}
    >
      {lines.map((line, i) => {
        const trimmed = line.trimStart();
        let color = "#e2e8f0";
        if (trimmed.startsWith("#")) color = "#64748b";
        else if (
          /^(resource|terraform|provider|variable|output|locals|module)\b/.test(trimmed)
        )
          color = "#818cf8";
        else if (/^\s*([\w_]+)\s*=/.test(line)) color = "#93c5fd";
        return (
          <span key={i} style={{ color, display: "block" }}>
            {line || " "}
          </span>
        );
      })}
    </pre>
  );
}

// ── File tab bar ──────────────────────────────────────────────────────────────

const FILE_ORDER = ["backend.tf", "variables.tf", "main.tf", "outputs.tf"];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      onClick={handleCopy}
      title="Copy to clipboard"
      className="text-xs px-2 py-0.5 rounded border border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 transition-colors"
      style={{ fontFamily: "inherit" }}
    >
      {copied ? "✓ copied" : "copy"}
    </button>
  );
}

function FileTabs({ files }) {
  const available = FILE_ORDER.filter((f) => files[f]);
  const [active, setActive] = useState(available[0] ?? null);

  // If active tab was removed (shouldn't happen but be safe)
  const currentTab = available.includes(active) ? active : available[0] ?? null;

  if (!available.length) return null;

  const content = currentTab ? files[currentTab] : "";

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Tab bar */}
      <div
        className="flex items-center gap-0 border-b border-slate-700 flex-shrink-0"
        style={{ backgroundColor: "#0f172a" }}
      >
        {available.map((name) => (
          <button
            key={name}
            onClick={() => setActive(name)}
            className={`text-xs px-3 py-1.5 border-b-2 transition-colors whitespace-nowrap ${
              name === currentTab
                ? "border-indigo-400 text-indigo-300 bg-slate-800/50"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
            style={{ fontFamily: '"JetBrains Mono", monospace' }}
          >
            {name}
          </button>
        ))}
        {/* Copy button aligned right */}
        <div className="ml-auto pr-2 py-1">
          {currentTab && <CopyButton text={content} />}
        </div>
      </div>
      {/* Content */}
      <div className="flex-1 overflow-auto">
        {content && <HCLViewer hcl={content} />}
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export default function GeneratePanel({ onClose }) {
  const [validationErrors, setValidationErrors] = useState([]);

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const graphMeta = useGraphStore((s) => s.graphMeta);
  const securityGroups = useSecurityStore((s) => s.securityGroups);
  const iamRoles = useIAMStore((s) => s.iamRoles);
  const provider = useSettingsStore((s) => s.provider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const models = useSettingsStore((s) => s.models);
  const ollamaBaseUrl = useSettingsStore((s) => s.ollamaBaseUrl);
  const infraProvider = useProviderStore((s) => s.infraProvider);

  const mutation = useMutation({
    mutationFn: (payload) => generateTerraform(payload),
  });

  const handleGenerate = () => {
    setValidationErrors([]);
    mutation.reset();

    const graph = serializeGraph(
      { ...graphMeta, provider: infraProvider },
      nodes,
      edges,
      securityGroups,
      iamRoles,
    );
    const errors = validateGraphForGeneration(graph);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    mutation.mutate({
      graph,
      provider,
      apiKey: apiKeys[provider] ?? null,
      model: models[provider] ?? null,
      baseUrl: provider === "ollama" ? ollamaBaseUrl : null,
    });
  };

  const handleDownloadTf = () => {
    if (!mutation.data?.hcl) return;
    const blob = new Blob([mutation.data.hcl], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${graphMeta.name || "infrastructure"}.tf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = () => {
    if (!mutation.data?.zip_b64) return;
    const binary = atob(mutation.data.zip_b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${graphMeta.name || "infrastructure"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hasFiles =
    mutation.data?.files && Object.keys(mutation.data.files).length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-700">
            Generate Terraform
          </span>
          <span className="text-xs text-gray-400 capitalize">{provider}</span>
        </div>
        <div className="flex items-center gap-2">
          {mutation.data?.zip_b64 && (
            <button
              onClick={handleDownloadZip}
              className="text-xs px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
            >
              ↓ Download .zip
            </button>
          )}
          {mutation.data?.hcl && (
            <button
              onClick={handleDownloadTf}
              className="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            >
              ↓ Download .tf
            </button>
          )}
          <button
            onClick={handleGenerate}
            disabled={mutation.isPending}
            className="text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {mutation.isPending ? "Generating…" : "Generate"}
          </button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm leading-none px-1"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Status banners */}
      {validationErrors.length > 0 && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          {validationErrors.map((e, i) => (
            <p key={i} className="text-xs text-amber-700">
              {e}
            </p>
          ))}
        </div>
      )}

      {mutation.isError && (
        <div className="px-4 py-3 bg-red-50 border-b border-red-200 flex-shrink-0">
          <p className="text-xs text-red-700">
            {mutation.error?.message ?? "Generation failed."}
          </p>
        </div>
      )}

      {/* Body */}
      <div className="flex-1 overflow-auto flex flex-col min-h-0">
        {mutation.isPending && (
          <div className="flex items-center justify-center h-32 text-xs text-gray-400">
            Calling {provider}…
          </div>
        )}

        {/* Multi-file tabs view (preferred) */}
        {hasFiles && !mutation.isPending && (
          <FileTabs files={mutation.data.files} />
        )}

        {/* Fallback: monolithic HCL if no split files returned */}
        {!hasFiles && mutation.data?.hcl && !mutation.isPending && (
          <HCLViewer hcl={mutation.data.hcl} />
        )}

        {!mutation.data &&
          !mutation.isPending &&
          !mutation.isError &&
          validationErrors.length === 0 && (
            <div className="flex items-center justify-center h-32 text-xs text-gray-400">
              Press Generate to produce Terraform HCL from your canvas.
            </div>
          )}
      </div>
    </div>
  );
}
