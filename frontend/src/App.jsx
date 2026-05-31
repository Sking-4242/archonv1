import { useRef, useState, useCallback, useEffect } from "react";
import Canvas from "./components/canvas/Canvas";
import ComponentPanel from "./components/panels/ComponentPanel";
import SecurityTab from "./components/panels/SecurityTab";
import IAMTab from "./components/panels/IAMTab";
import GeneratePanel from "./components/panels/GeneratePanel";
import EstimatePanel from "./components/panels/EstimatePanel";
import ChatPanel from "./components/panels/ChatPanel";
import ValidateTab from "./components/panels/ValidateTab";
import DiscoverTab from "./components/panels/DiscoverTab";
import SettingsModal from "./components/ui/SettingsModal";
import TemplateModal from "./components/ui/TemplateModal";
import ImportPlanModal from "./components/ui/ImportPlanModal";
import ImportTfModal from "./components/ui/ImportTfModal";
import ImportCLIReportModal from "./components/ui/ImportCLIReportModal";
import LandingPage from "./components/LandingPage";
import LandingAccountBar from "./components/LandingAccountBar";
import useGraphStore from "./store/graphStore";
import useSecurityStore from "./store/securityStore";
import useIAMStore from "./store/iamStore";
import useSettingsStore from "./store/settingsStore";
import useValidationStore from "./store/validationStore";
import useProviderStore from "./store/providerStore";
import useArchiveStore from "./store/archiveStore";
import usePlanStore from "./store/planStore";
import useAuthStore from "./store/authStore";
import useAccessStore from "./store/accessStore";
import CloudSavesModal from "./components/ui/CloudSavesModal";
import CloudMigrationModal, {
  hasLocalGraphToMigrate,
  isCloudMigrationDone,
} from "./components/ui/CloudMigrationModal";
import { serializeGraph } from "./utils/serializer";
import { graphJsonToCanvasState } from "./utils/graphLoader";
import { UPGRADE_URL, featureLabel } from "./utils/tierGates";

const PROVIDER_LABELS = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
  ollama: "Ollama",
  xai: "xAI",
};

const SIDEBAR_TABS = ["Component", "Security", "IAM", "Validate", "Discover"];

// ── Assignment mode detection ─────────────────────────────────────────────────
// Detected once at module parse time — the param never changes during a session.
// This flag is the single gate for all academy-specific behaviour in this file.
// Normal Pro users will never have this param, so every branch below is a no-op.
const isAssignmentMode =
  new URLSearchParams(window.location.search).get("assignment_mode") === "true";

export default function App() {
  const [showLanding, setShowLanding] = useState(!isAssignmentMode);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState("llm");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [importPlanOpen, setImportPlanOpen] = useState(false);
  const [importTfOpen, setImportTfOpen] = useState(false);
  const [importCLIOpen, setImportCLIOpen] = useState(false);
  const [cloudSavesOpen, setCloudSavesOpen] = useState(false);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [estimateOpen, setEstimateOpen] = useState(false);
  const [generateOpen, setGenerateOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState("Component");
  const [archNameEditing, setArchNameEditing] = useState(false);
  const archNameRef = useRef(null);

  // Assignment mode state — only populated when isAssignmentMode is true
  const [assignmentTitle, setAssignmentTitle] = useState(null);

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
  const updateFindings = useValidationStore((s) => s.updateFindings);
  const findings = useValidationStore((s) => s.findings);
  const infraProvider = useProviderStore((s) => s.infraProvider);
  const setInfraProvider = useProviderStore((s) => s.setInfraProvider);
  const saveArchitecture = useArchiveStore((s) => s.saveArchitecture);
  const setPlanSummary = usePlanStore((s) => s.setPlanSummary);
  const clearPlan = usePlanStore((s) => s.clearPlan);
  const authUser = useAuthStore((s) => s.user);
  const refreshAccess = useAccessStore((s) => s.refresh);
  const canUse = useAccessStore((s) => s.canUse);
  const showRenewalWarning = useAccessStore((s) => s.showRenewalWarning);
  const renewalMessage = useAccessStore((s) => s.renewalMessage);

  useEffect(() => {
    refreshAccess();
  }, [authUser, refreshAccess]);

  useEffect(() => {
    if (!authUser || isCloudMigrationDone() || !hasLocalGraphToMigrate()) return;
    setMigrationOpen(true);
  }, [authUser]);

  const applySerializedGraph = useCallback(
    (data) => {
      const restored = graphJsonToCanvasState(data);
      loadState({
        nodes: restored.nodes,
        edges: restored.edges,
        graphMeta: restored.graphMeta,
      });
      if (restored.securityGroups.length) setSecurityGroups(restored.securityGroups);
      if (restored.iamRoles.length) setIAMRoles(restored.iamRoles);
      if (restored.graphMeta.provider) setInfraProvider(restored.graphMeta.provider);
      updateFindings(
        restored.nodes,
        restored.edges,
        restored.securityGroups.length ? restored.securityGroups : securityGroups,
        restored.iamRoles.length ? restored.iamRoles : iamRoles,
      );
      setShowLanding(false);
    },
    [loadState, setSecurityGroups, setIAMRoles, setInfraProvider, updateFindings, securityGroups, iamRoles],
  );

  const requirePaidFeature = useCallback(
    (feature, action) => {
      if (canUse(feature)) {
        action();
        return;
      }
      const upgrade = window.confirm(
        `${featureLabel(feature)} requires a license. Open archonpro.net to upgrade?`,
      );
      if (upgrade) window.open(UPGRADE_URL, "_blank", "noopener,noreferrer");
    },
    [canUse],
  );

  const openAccountSettings = useCallback(() => {
    setSettingsTab("account");
    setSettingsOpen(true);
  }, []);

  const criticalCount = findings.filter((f) => f.level === "critical").length;
  const warningCount = findings.filter((f) => f.level === "warning").length;

  // ── Assignment mode postMessage bridge ──────────────────────────────────────
  // Handles the Academy ↔ Pro protocol when embedded as an iframe.
  // Uses getState() so the handler never goes stale between renders.
  useEffect(() => {
    if (!isAssignmentMode) return;

    function handleMessage(e) {
      const { type, assignment } = e.data ?? {};

      // Academy sends this after the iframe fires its load event
      if (type === "INIT_ASSIGNMENT") {
        setAssignmentTitle(assignment?.title ?? null);
        // Clear canvas so each assignment starts fresh
        const { loadState: ls } = useGraphStore.getState();
        const { setSecurityGroups: setSGs } = useSecurityStore.getState();
        const { setIAMRoles: setRoles } = useIAMStore.getState();
        ls({
          nodes: [],
          edges: [],
          graphMeta: {
            id: crypto.randomUUID(),
            name: assignment?.title ?? "Assignment",
            provider: "aws",
            region: "us-east-1",
          },
        });
        setSGs([]);
        setRoles([]);
      }

      // Academy requests the current graph for submission
      if (type === "GRAPH_REQUEST") {
        const { nodes: n, edges: ed } = useGraphStore.getState();
        const { securityGroups: sgs } = useSecurityStore.getState();
        // Shape matches grader.py expectations: nodes[].data.awsType, edges[].source/target
        const graph = {
          nodes: n.map((node) => ({
            id: node.id,
            type: node.type,
            position: node.position,
            data: node.data,
          })),
          edges: ed.map((edge) => ({
            id: edge.id,
            source: edge.source,
            target: edge.target,
          })),
          securityGroups: sgs,
        };
        window.parent.postMessage({ type: "GRAPH_SUBMIT", graph }, "*");
      }
    }

    window.addEventListener("message", handleMessage);
    // Tell the Academy iframe wrapper that the canvas is ready to receive INIT_ASSIGNMENT
    window.parent.postMessage({ type: "CANVAS_READY" }, "*");
    return () => window.removeEventListener("message", handleMessage);
  }, []); // intentionally empty — uses getState() to avoid stale closures

  // ── Node selection ─────────────────────────────────────────────────────────
  const handleNodeSelect = useCallback(
    (nodeId) => {
      setSelectedNodeId(nodeId);
      if (nodeId) setSidebarTab("Component");

      // In assignment mode, notify Academy so it can show learning mode info
      if (isAssignmentMode && nodeId) {
        const { nodes: n } = useGraphStore.getState();
        const node = n.find((nd) => nd.id === nodeId);
        if (node) {
          window.parent.postMessage(
            {
              type: "NODE_SELECTED",
              nodeType: node.data.awsType || node.data.type || node.type,
              nodeData: node.data,
            },
            "*"
          );
        }
      }
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
      updateFindings(tpl.nodes, tpl.edges, securityGroups, iamRoles);
      setTemplatesOpen(false);
      setShowLanding(false);
    },
    [loadState, updateFindings, setInfraProvider, securityGroups, iamRoles],
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
          const loadedRoles = data.iam_roles ?? [];
          if (loadedRoles.length) setIAMRoles(loadedRoles);
          updateFindings(restoredNodes, restoredEdges, loadedSGs.length ? loadedSGs : securityGroups, loadedRoles.length ? loadedRoles : iamRoles);
          if (data.provider) setInfraProvider(data.provider);
        } catch {
          alert("Invalid JSON file.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, [loadState, updateFindings, setInfraProvider, setSecurityGroups, setIAMRoles, securityGroups, iamRoles]);

  const handleImportTF = useCallback(
    () => requirePaidFeature("terraform_import", () => setImportTfOpen(true)),
    [requirePaidFeature],
  );

  const handleImportTFApply = useCallback(
    ({ graph, warnings }) => {
      const restoredNodes = (graph.components ?? []).map((c) => ({
        id: c.id,
        type: c.type,
        position: c.position ?? { x: 0, y: 0 },
        ...(c.parentId ? { parentId: c.parentId } : {}),
        ...(c.style    ? { style:    c.style    } : {}),
        data: {
          label: c.label ?? c.type,
          awsType: c.awsType ?? c.cloudType ?? c.type,
          icon: c.icon ?? "",
          config: c.config ?? {},
          category: c.category ?? "",
          security_group_ids: c.security_group_ids ?? [],
          iam_role_id: c.iam_role_id ?? null,
        },
      }));
      const restoredEdges = graph.edges ?? [];
      const importedSGs = graph.security_groups ?? [];
      const importedRoles = graph.iam_roles ?? [];
      loadState({
        nodes: restoredNodes,
        edges: restoredEdges,
        graphMeta: {
          id: graph.id,
          name: graph.name ?? "Imported Architecture",
          provider: graph.provider ?? "aws",
          region: graph.region ?? "us-east-1",
        },
      });
      setSecurityGroups(importedSGs);
      setIAMRoles(importedRoles);
      setInfraProvider(graph.provider ?? "aws");
      updateFindings(restoredNodes, restoredEdges, importedSGs, importedRoles);
      setShowLanding(false);
    },
    [loadState, setSecurityGroups, setIAMRoles, setInfraProvider, updateFindings]
  );

  const handleImportPlanApply = useCallback(
    ({ graph, summary, warnings }) => {
      const restoredNodes = (graph.components ?? []).map((c) => ({
        id: c.id,
        type: c.type,
        position: c.position ?? { x: 0, y: 0 },
        ...(c.parentId ? { parentId: c.parentId } : {}),
        ...(c.style    ? { style:    c.style    } : {}),
        data: {
          label: c.label ?? c.data?.label ?? c.type,
          awsType: c.awsType ?? c.data?.awsType ?? c.type,
          icon: c.icon ?? c.data?.icon ?? "",
          config: c.config ?? c.data?.config ?? {},
          category: c.category ?? c.data?.category ?? "",
          nodeType: c.nodeType ?? c.data?.nodeType ?? c.type,
          change_action: c.data?.change_action ?? null,
          tf_address: c.data?.tf_address ?? null,
          security_group_ids: c.security_group_ids ?? [],
          iam_role_id: c.iam_role_id ?? null,
        },
      }));
      const restoredEdges = graph.edges ?? [];
      const planSGs = graph.security_groups ?? [];
      const planRoles = graph.iam_roles ?? [];
      clearPlan();
      loadState({
        nodes: restoredNodes,
        edges: restoredEdges,
        graphMeta: {
          id: graph.id,
          name: graph.name ?? "Terraform Plan",
          provider: "aws",
          region: graph.region ?? "us-east-1",
        },
      });
      setSecurityGroups(planSGs);
      setIAMRoles(planRoles);
      setPlanSummary(summary);
      setSidebarTab("Validate");
      setShowLanding(false);
      if (warnings?.length > 0) {
        const unique = [...new Set(warnings)];
        console.warn(`Plan import notices:\n${unique.join("\n")}`);
      }
    },
    [loadState, setSecurityGroups, setIAMRoles, setPlanSummary, clearPlan]
  );

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
      const archivedRoles = entry.graph.iam_roles ?? [];
      if (archivedRoles.length) setIAMRoles(archivedRoles);
      updateFindings(restoredNodes, restoredEdges, archivedSGs.length ? archivedSGs : securityGroups, archivedRoles.length ? archivedRoles : iamRoles);
      setShowLanding(false);
    },
    [loadState, setInfraProvider, setSecurityGroups, setIAMRoles, updateFindings, securityGroups, iamRoles],
  );

  const graph = serializeGraph(
    { ...graphMeta, provider: infraProvider },
    nodes,
    edges,
    securityGroups,
    iamRoles,
  );

  // Assignment mode never shows the landing page
  if (showLanding && !isAssignmentMode) {
    return (
      <>
        <LandingPage
          onNewCanvas={handleNewCanvas}
          onLoadArchive={handleLoadArchive}
          onOpenTemplates={() => {
            setShowLanding(false);
            setTemplatesOpen(true);
          }}
          onImportTF={handleImportTF}
          onLoadTemplate={handleLoadTemplate}
          onOpenAccount={openAccountSettings}
        />
        {settingsOpen && (
          <SettingsModal
            initialTab={settingsTab}
            onClose={() => setSettingsOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <div
      className={`flex flex-col h-screen ${darkMode ? "bg-gray-950" : "bg-gray-100"}`}
    >
      {/* ── Header — two variants ─────────────────────────────────────────────── */}
      {isAssignmentMode ? (
        /* Assignment mode: minimal banner, no Pro-specific actions */
        <header className="flex items-center justify-between px-4 h-10 bg-gray-900 text-white flex-shrink-0 border-b border-indigo-900/60">
          <div className="flex items-center gap-3">
            <span className="font-bold text-indigo-400 tracking-wide text-xs">ARCHON</span>
            <span className="text-gray-600 text-xs">|</span>
            <span className="text-xs text-indigo-300 font-medium">Assignment Canvas</span>
            {assignmentTitle && (
              <>
                <span className="text-gray-600 text-xs">—</span>
                <span className="text-xs text-gray-300 truncate max-w-sm">{assignmentTitle}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-500">
              Build your architecture · Submit from the Academy panel
            </span>
            <button
              onClick={toggleDarkMode}
              className="text-xs px-2 py-1 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-300"
              title="Toggle dark mode"
            >
              {darkMode ? "Light" : "Dark"}
            </button>
          </div>
        </header>
      ) : (
        /* Normal Pro header — completely unchanged */
        <>
        {showRenewalWarning && renewalMessage && (
          <div className="px-4 py-2 bg-amber-900 text-amber-100 text-xs text-center border-b border-amber-800">
            {renewalMessage}
          </div>
        )}
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
              Home
            </button>
            <button
              onClick={handleSaveToLibrary}
              className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
              title="Save to library"
            >
              Save to Library
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
              onClick={() => requirePaidFeature("terraform_plan", () => setImportPlanOpen(true))}
              className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
              title="Visualize a Terraform plan (terraform show -json)"
            >
              Import Plan
            </button>
            <button
              onClick={() => setImportCLIOpen(true)}
              className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
              title="Import a report from archon-cli (validate, cost, or discover)"
            >
              CLI Report
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
            {authUser && canUse("cloud_save") && (
              <button
                onClick={() => setCloudSavesOpen(true)}
                className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
                title="Save or load from your account"
              >
                Cloud Saves
              </button>
            )}
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
              {darkMode ? "Light" : "Dark"}
            </button>
            <span className="text-xs text-gray-400">
              {PROVIDER_LABELS[provider] ?? provider}
            </span>
            <button
              onClick={() => {
                setSettingsTab("llm");
                setSettingsOpen(true);
              }}
              className="text-xs px-2.5 py-1.5 rounded bg-gray-700 hover:bg-gray-600 transition-colors text-gray-200"
            >
              Settings
            </button>
          </div>
        </header>
        </>
      )}

      {/* Main layout */}
      <main className="flex flex-1 overflow-hidden">
        {/* Canvas area */}
        <div className="flex-1 relative overflow-hidden">
          <Canvas onNodeSelect={handleNodeSelect} />

          {/* Estimate slide-in */}
          {estimateOpen && (
            <div className="absolute top-0 right-0 bottom-0 w-[520px] bg-white border-l border-gray-200 shadow-xl z-10 flex flex-col">
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
              {sidebarTab === "Discover" && (
                <DiscoverTab onOpenImport={() => setImportCLIOpen(true)} />
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
      {settingsOpen && <SettingsModal initialTab={settingsTab} onClose={() => setSettingsOpen(false)} />}

      {/* Templates modal */}
      {templatesOpen && (
        <TemplateModal
          onSelect={handleLoadTemplate}
          onClose={() => setTemplatesOpen(false)}
          provider={infraProvider}
        />
      )}

      {/* Import Terraform .tf modal */}
      {importTfOpen && (
        <ImportTfModal
          apiUrl={import.meta.env.VITE_API_URL ?? "http://localhost:8000"}
          onApply={handleImportTFApply}
          onClose={() => setImportTfOpen(false)}
        />
      )}

      {/* Import Plan modal */}
      {importPlanOpen && (
        <ImportPlanModal
          apiUrl={import.meta.env.VITE_API_URL ?? "http://localhost:8000"}
          onApply={handleImportPlanApply}
          onClose={() => setImportPlanOpen(false)}
        />
      )}

      {/* Import CLI Report modal */}
      {importCLIOpen && (
        <ImportCLIReportModal
          onClose={() => setImportCLIOpen(false)}
          onSwitchToValidate={() => setSidebarTab("Validate")}
          onSwitchToDiscover={() => setSidebarTab("Discover")}
        />
      )}

      {cloudSavesOpen && authUser && (
        <CloudSavesModal
          onClose={() => setCloudSavesOpen(false)}
          onLoad={(row) => applySerializedGraph(row.graph_json)}
          currentGraph={graph}
          currentName={graphMeta.name}
          currentProvider={infraProvider}
        />
      )}

      {migrationOpen && authUser && (
        <CloudMigrationModal onClose={() => setMigrationOpen(false)} />
      )}
    </div>
  );
}
