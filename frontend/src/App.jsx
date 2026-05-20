import { useRef, useState, useCallback, useEffect } from "react";
import Canvas from "./components/canvas/Canvas";
import ComponentPanel from "./components/panels/ComponentPanel";
import SecurityTab from "./components/panels/SecurityTab";
import IAMTab from "./components/panels/IAMTab";
import GeneratePanel from "./components/panels/GeneratePanel";
import EstimatePanel from "./components/panels/EstimatePanel";
import ChatPanel from "./components/panels/ChatPanel";
import ValidateTab from "./components/panels/ValidateTab";
import SettingsModal from "./components/ui/SettingsModal";
import TemplateModal from "./components/ui/TemplateModal";
import LandingPage from "./components/LandingPage";
import useGraphStore from "./store/graphStore";
import useSecurityStore from "./store/securityStore";
import useIAMStore from "./store/iamStore";
import useSettingsStore from "./store/settingsStore";
import useValidationStore from "./store/validationStore";
import useProviderStore from "./store/providerStore";
import useArchiveStore from "./store/archiveStore";
import { serializeGraph } from "./utils/serializer";

const PROVIDER_LABELS = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
  ollama: "Ollama",
  xai: "xAI",
};

const SIDEBAR_TABS = ["Component", "Security", "IAM", "Validate"];

export default function App() {
  const [showLanding, setShowLanding] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("Component");
  const [archNameEditing, setArchNameEditing] = useState(false);
  const archNameRef = useRef(null);

  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const graphMeta = useGraphStore((s) => s.graphMeta);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const setSelectedNodeId = useGraphStore((s) => s.setSelectedNodeId);
  const updateGraphMeta = useGraphStore((s) => s.updateGraphMeta);
  const loadState = useGraphStore((s) => s.loadState);
  const securityGroups = useSecurityStore((s) => s.securityGroups);
  const setSecurityGroups = useSecurityStore((s) => s.setSecurityGroups);
  const iamRoles = useIAMStore((s) => s.iamRoles);
  const setIAMRoles = useIAMStore((s) => s.setIAMRoles);
  const provider = useSettingsStore((s) => s.provider);
  const darkMode = useSettingsStore((s) => s.darkMode);
  const toggleDarkMode = useSettingsStore((s) => s.toggleDarkMode);
  const updateFindings = useValidationStore((s) => s.update);
  const findings = useValidationStore((s) => s.findings);
  const infraProvider = useProviderStore((s) => s.infraProvider);
  const setInfraProvider = useProviderStore((s) => s.setInfraProvider);
  const saveArchitecture = useArchiveStore((s) => s.saveArchitecture);

  const criticalCount = findings.filter((f) => f.level === "critical").length;
  const warningCount = findings.filter((f) => f.level === "warning").length;

  const handleNodeSelect = useCallback(
    (nodeId) => {
      setSelectedNodeId(nodeId);
      if (nodeId) setSidebarTab("Component");
    },
    [setSelectedNodeId],
  );

  const handleLoadTemplate = useCallback(
    (tpl) => {
      loadState({
        nodes: tpl.nodes,
        edges: tpl.edges,
        graphMeta: tpl.graphMeta,
      });
      if (tpl.graphMeta?.provider) setInfraProvider(tpl.graphMeta.provider);
      updateFindings(tpl.nodes, tpl.edges, securityGroups);
      setTemplatesOpen(false);
      setShowLanding(false);
    },
    [loadState, updateFindings, setInfraProvider, securityGroups],
  );

  const handleSaveJSON = useCallback(() => {
    const graph = serializeGraph(
      graphMeta,
      nodes,
      edges,
      securityGroups,
      iamRoles,
    );
    const blob = new Blob([JSON.stringify(graph, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${graphMeta.name ?? "architecture"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [graphMeta, nodes, edges, securityGroups, iamRoles]);

  const handleLoadJSON = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          const restoredNodes = (data.components ?? data.nodes ?? []).map((c) => ({
            id: c.id,
            type: c.type,
            position: c.position ?? { x: 0, y: 0 },
            data: {
              label: c.label ?? c.data?.label ?? c.type,
              awsType: c.awsType ?? c.cloudType ?? c.data?.awsType ?? c.type,
              icon: c.icon ?? c.data?.icon ?? "",
              config: c.config ?? c.data?.config ?? {},
              category: c.category ?? c.data?.category ?? "",
              security_group_ids: c.security_group_ids ?? c.data?.security_group_ids ?? [],
              iam_role_id: c.iam_role_id ?? c.data?.iam_role_id ?? null,
            },
          }));
          const restoredEdges = data.edges ?? [];
          loadState({
            nodes: restoredNodes,
            edges: restoredEdges,
            graphMeta: {
              id: data.id,
              name: data.name,
              provider: data.provider,
              region: data.region,
            },
          });
          const loadedSGs = data.security_groups ?? [];
          if (loadedSGs.length) setSecurityGroups(loadedSGs);
          updateFindings(restoredNodes, restoredEdges, loadedSGs.length ? loadedSGs : securityGroups);
          if (data.provider) setInfraProvider(data.provider);
        } catch {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadState, updateFindings, setInfraProvider, setSecurityGroups, securityGroups]);

  const handleImportTF = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".tf";
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length) return;
      const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      try {
        const res = await fetch(`${apiUrl}/import-tf`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Import failed: ${err.detail ?? res.statusText}`);
          return;
        }
        const { graph, warnings } = await res.json();
        const restoredNodes = (graph.components ?? []).map((c) => ({
          id: c.id,
          type: c.type,
          position: c.position ?? { x: 0, y: 0 },
          ...(c.parentId ? { parentId: c.parentId } : {}),
          ...(c.style    ? { style:    c.style    } : {}),
          data: {
            label: c.label ?? c.type,
            awsType: c.awsType ?? c.cloudType ?? c.type,
            icon: c.icon ?? "📦",
            config: c.config ?? {},
            category: c.category ?? "",
            security_group_ids: c.security_group_ids ?? [],
            iam_role_id: c.iam_role_id ?? null,
          },
        }));
        const restoredEdges = graph.edges ?? [];
        loadState({
          nodes: restoredNodes,
          edges: restoredEdges,
          graphMeta: {
            id: graph.id,
            name: graph.name,
            provider: graph.provider ?? "aws",
            region: graph.region ?? "us-east-1",
          },
        });
        const importedSGs = graph.security_groups ?? [];
        setSecurityGroups(importedSGs);
        setIAMRoles(graph.iam_roles ?? []);
        setInfraProvider(graph.provider ?? "aws");
        updateFindings(restoredNodes, restoredEdges, importedSGs);
        setShowLanding(false);
        if (warnings.length > 0) {
          const unique = [...new Set(warnings)];
          alert(
            `Import complete with ${unique.length} notice(s):\n\n` +
            unique.join("\n")
          );
        }
      } catch (err) {
        alert(`Import error: ${err.message}`);
      }
    };
    input.click();
  }, [loadState, setSecurityGroups, setIAMRoles, setInfraProvider, updateFindings]);

  const handleArchNameCommit = useCallback(() => {
    const val = archNameRef.current?.value?.trim();
    if (val) updateGraphMeta({ name: val });
    setArchNameEditing(false);
  }, [updateGraphMeta]);

  const handleSaveToLibrary = useCallback(() => {
    const g = serializeGraph(
      { ...graphMeta, provider: infraProvider },
      nodes,
      edges,
      securityGroups,
      iamRoles,
    );
    saveArchitecture(g);
  }, [graphMeta, infraProvider, nodes, edges, securityGroups, iamRoles, saveArchitecture]);

  // ── Consume ?seed= param from Academy canvas lab links ───────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const seed = params.get("seed");
    if (!seed) return;
    try {
      const template = JSON.parse(atob(seed));
      loadState({
        nodes: template.nodes ?? [],
        edges: template.edges ?? [],
        graphMeta: {
          id: crypto.randomUUID(),
          name: template.graphMeta?.name ?? "Academy Lab",
          provider: template.graphMeta?.provider ?? "aws",
          region: template.graphMeta?.region ?? "us-east-1",
        },
      });
      if (template.graphMeta?.provider) setInfraProvider(template.graphMeta.provider);
      setShowLanding(false);
    } catch {
      // malformed seed — ignore and show landing
    } finally {
      // strip param from URL so it doesn't re-apply on refresh
      const clean = window.location.pathname;
      window.history.replaceState({}, "", clean);
    }
  }, []);

  const handleNewCanvas = useCallback(
    (providerName, opts = {}) => {
      loadState({
        nodes: [],
        edges: [],
        graphMeta: {
          id: crypto.randomUUID(),
          name: opts.name ?? "My Architecture",
          provider: providerName,
          region: opts.region ?? "us-east-1",
        },
      });
      setInfraProvider(providerName);
      setShowLanding(false);
    },
    [setInfraProvider, loadState],
  );

  const handleLoadArchive = useCallback(
    (entry) => {
      const restoredNodes = (entry.graph.components ?? []).map((c) => ({
        id: c.id,
        type: c.type,
        position: c.position,
        data: {
          label: c.label,
          awsType: c.awsType ?? c.cloudType ?? c.type,
          icon: c.icon ?? "",
          config: c.config ?? {},
          category: c.category ?? "",
          security_group_ids: c.security_group_ids ?? [],
          iam_role_id: c.iam_role_id ?? null,
        },
      }));
      const restoredEdges = entry.graph.edges ?? [];
      loadState({
        nodes: restoredNodes,
        edges: restoredEdges,
        graphMeta: {
          id: entry.graph.id,
          name: entry.graph.name,
          provider: entry.graph.provider,
          region: entry.graph.region,
        },
      });
      const archivedSGs = entry.graph.security_groups ?? [];
      if (archivedSGs.length) setSecurityGroups(archivedSGs);
      setInfraProvider(entry.graph.provider ?? "aws");
      updateFindings(restoredNodes, restoredEdges, archivedSGs.length ? archivedSGs : securityGroups);
      setShowLanding(false);
    },
    [loadState, setInfraProvider, setSecurityGroups, updateFindings, securityGroups],
  );

  const graph = serializeGraph(
    { ...graphMeta, provider: infraProvider },
    nodes,
    edges,
    securityGroups,
    iamRoles,
  );

  if (showLanding) {
    return (
      <LandingPage
        onNewCanvas={handleNewCanvas}
        onLoadArchive={handleLoadArchive}
        onOpenTemplates={() => {
          setShowLanding(false);
          setTemplatesOpen(true);
        }}
        onImportTF={handleImportTF}
        onLoadTemplate={handleLoadTemplate}
      />
    );
  }

  return (
    <div
      className={`flex flex-col h-screen ${darkMode ? "bg-gray-950" : "bg-gray-100"}`}
    >
      {/* Nav bar */}
      <header className="flex items-center justify-between px-4 h-12 bg-gray-900 text-white flex-shrink-0 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <span className="font-bold text-indigo-400 tracking-wide text-sm">
            ARCHON
          </span>
          <span className="text-gray-600 text-xs">v0.1.0</span>
          {archNameEditing ? (
            <input
              ref={archNameRef}
              defaultValue={graphMeta.name ?? "Untitled Architecture"}
              autoFocus
              onBlur={handleArchNameCommit}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleArchNameCommit();
                if (e.key === "Escape") setArchNameEditing(false);
              }}
              className="text-xs bg-gray-800 border border-indigo-400 rounded px-2 py-0.5 text-white focus:outline-none w-44"
            />
          ) : (
            <button
              onClick={() => setArchNameEditing(true)}
              className="text-xs text-gray-400 hover:text-gray-200 transition-colors truncate max-w-xs"
            >
              {graphMeta.name ?? "Untitled Architecture"}
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLanding(true)}
            className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
            title="Go to home"
          >
            🏠 Home
          </button>
          <button
            onClick={handleSaveToLibrary}
            className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
            title="Save to library"
          >
            💾 Save to Library
          </button>
          <button
            onClick={() => setTemplatesOpen(true)}
            className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
          >
            Templates
          </button>
          <button
            onClick={handleImportTF}
            className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
            title="Import Terraform .tf files"
          >
            Import .tf
          </button>
          <button
            onClick={handleLoadJSON}
            className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
          >
            Load
          </button>
          <button
            onClick={handleSaveJSON}
            className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
          >
            Save
          </button>
          <div className="w-px h-4 bg-gray-600 mx-1" />
          <button
            onClick={() => {
              setChatOpen((v) => !v);
              if (estimateOpen) setEstimateOpen(false);
            }}
            className={[
              "text-xs px-2.5 py-1.5 rounded transition-colors",
              chatOpen
                ? "bg-indigo-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200",
            ].join(" ")}
          >
            AI Chat
          </button>
          <button
            onClick={() => {
              setEstimateOpen((v) => !v);
              if (chatOpen) setChatOpen(false);
            }}
            className={[
              "text-xs px-2.5 py-1.5 rounded transition-colors",
              estimateOpen
                ? "bg-amber-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-200",
            ].join(" ")}
          >
            Estimate
          </button>
          <button
            onClick={() => setGenerateOpen(true)}
            className="text-xs px-2.5 py-1.5 rounded bg-indigo-700 hover:bg-indigo-600 transition-colors text-white font-medium"
          >
            Generate
          </button>
          <div className="w-px h-4 bg-gray-600 mx-1" />
          <button
            onClick={toggleDarkMode}
            className="text-xs px-2 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300"
            title="Toggle dark mode"
          >
            {darkMode ? "☀" : "🌙"}
          </button>
          <span className="text-xs text-gray-400">
            {PROVIDER_LABELS[provider] ?? provider}
          </span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
          >
            ⚙ Settings
          </button>
        </div>
      </header>

      {/* Main layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          <Canvas onNodeSelect={handleNodeSelect} />

          {/* Estimate slide-in */}
          {estimateOpen && (
            <div className="absolute top-0 right-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl z-10 flex flex-col">
              <EstimatePanel
                graph={graph}
                onClose={() => setEstimateOpen(false)}
              />
            </div>
          )}

          {/* Chat slide-in */}
          {chatOpen && (
            <div className="absolute top-0 right-0 bottom-0 w-96 bg-white border-l border-gray-200 shadow-xl z-10 flex flex-col">
              <ChatPanel onClose={() => setChatOpen(false)} />
            </div>
          )}
        </div>

        {/* Right sidebar — hidden when chat/estimate overlays are open */}
        {!chatOpen && !estimateOpen && (
          <aside className="w-80 flex flex-col bg-white border-l border-gray-200 flex-shrink-0 overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-gray-200 flex-shrink-0">
              {SIDEBAR_TABS.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={[
                    "flex-1 text-xs py-2 font-medium transition-colors relative",
                    sidebarTab === tab
                      ? "text-indigo-600 border-b-2 border-indigo-600 -mb-px"
                      : "text-gray-500 hover:text-gray-700",
                  ].join(" ")}
                >
                  {tab}
                  {tab === "Validate" &&
                    (criticalCount > 0 || warningCount > 0) && (
                      <span
                        className={`ml-1 text-xs px-1 rounded-full font-bold ${
                          criticalCount > 0
                            ? "bg-red-500 text-white"
                            : "bg-amber-400 text-white"
                        }`}
                      >
                        {criticalCount + warningCount}
                      </span>
                    )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {sidebarTab === "Component" && (
                <ComponentPanel nodeId={selectedNodeId} />
              )}
              {sidebarTab === "Security" && <SecurityTab />}
              {sidebarTab === "IAM" && <IAMTab />}
              {sidebarTab === "Validate" && (
                <ValidateTab onSelectNode={(id) => handleNodeSelect(id)} />
              )}
            </div>
          </aside>
        )}
      </main>

      {/* Generate modal */}
      {generateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl w-[800px] max-h-[85vh] flex flex-col overflow-hidden">
            <GeneratePanel
              graph={graph}
              onClose={() => setGenerateOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Settings modal */}
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}

      {/* Templates modal */}
      {templatesOpen && (
        <TemplateModal
          onSelect={handleLoadTemplate}
          onClose={() => setTemplatesOpen(false)}
          provider={infraProvider}
        />
      )}
    </div>
  );
}
