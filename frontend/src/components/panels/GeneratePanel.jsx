import { useState } from "react";
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
          /^(resource|terraform|provider|variable|output|locals|module)\b/.test(
            trimmed,
          )
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

  return (
    <div className="flex flex-col h-full">
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
              Download .zip
            </button>
          )}
          {mutation.data?.hcl && (
            <button
              onClick={handleDownloadTf}
              className="text-xs px-3 py-1 rounded bg-gray-600 hover:bg-gray-700 text-white transition-colors"
            >
              Download .tf
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

      <div className="flex-1 overflow-auto">
        {validationErrors.length > 0 && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200">
            {validationErrors.map((e, i) => (
              <p key={i} className="text-xs text-amber-700">
                {e}
              </p>
            ))}
          </div>
        )}

        {mutation.isError && (
          <div className="px-4 py-3 bg-red-50 border-b border-red-200">
            <p className="text-xs text-red-700">
              {mutation.error?.message ?? "Generation failed."}
            </p>
          </div>
        )}

        {mutation.isPending && (
          <div className="flex items-center justify-center h-32 text-xs text-gray-400">
            Calling {provider}…
          </div>
        )}

        {mutation.data?.hcl && !mutation.isPending && (
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
