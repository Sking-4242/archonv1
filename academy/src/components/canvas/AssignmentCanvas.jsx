import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useAuthStore } from "../../store/authStore";
import { useAssignmentStore } from "../../store/assignmentStore";
import useGraphStore from "../../store/graphStore";
import { getAssignment } from "../../api/assignments";
import { submitAssignment } from "../../api/submissions";
import AssignmentPanel from "./AssignmentPanel";
import AssignmentNode from "./AssignmentNode";
import SubmissionFeedback from "../student/SubmissionFeedback";
import { CANVAS_PALETTE } from "./canvasPalette";

// ── Constants ─────────────────────────────────────────────────────────────────

const nodeTypes = { assignmentNode: AssignmentNode };

const CATEGORY_ICONS = {
  networking:    "🌐",
  compute:       "⚡",
  load_balancing:"⚖️",
  storage:       "🗄️",
  database:      "💾",
  security:      "🛡️",
  integration:   "🔗",
  management:    "🔧",
  ai_ml:         "🤖",
  analytics:     "📊",
};

// ── Palette sidebar ───────────────────────────────────────────────────────────

function PaletteSidebar() {
  const [openCats, setOpenCats] = useState(() =>
    Object.fromEntries(CANVAS_PALETTE.map((c) => [c.category, c.category === "networking" || c.category === "compute"]))
  );

  function toggleCat(cat) {
    setOpenCats((prev) => ({ ...prev, [cat]: !prev[cat] }));
  }

  function onDragStart(e, component) {
    e.dataTransfer.setData("application/archon-component", JSON.stringify(component));
    e.dataTransfer.effectAllowed = "move";
  }

  return (
    <aside className="w-48 shrink-0 bg-gray-900 border-r border-gray-800 overflow-y-auto flex flex-col">
      <div className="px-3 py-2.5 border-b border-gray-800">
        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
          Components
        </p>
        <p className="text-[10px] text-gray-600 mt-0.5">Drag onto canvas</p>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {CANVAS_PALETTE.map((cat) => (
          <div key={cat.category}>
            {/* Category header */}
            <button
              onClick={() => toggleCat(cat.category)}
              className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-gray-800 transition-colors"
            >
              <span className="text-xs">{CATEGORY_ICONS[cat.category] ?? "📦"}</span>
              <span className="text-[10px] font-semibold text-gray-400 flex-1">{cat.label}</span>
              <span className="text-gray-600 text-[10px]">{openCats[cat.category] ? "▾" : "▸"}</span>
            </button>

            {/* Components */}
            {openCats[cat.category] && (
              <div className="pb-1">
                {cat.components.map((comp) => (
                  <div
                    key={comp.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, comp)}
                    className="flex items-center gap-2 pl-7 pr-3 py-1.5 cursor-grab hover:bg-gray-800 transition-colors group"
                    title={comp.awsType}
                  >
                    <span className="text-sm group-hover:scale-110 transition-transform">
                      {comp.icon}
                    </span>
                    <span className="text-[11px] text-gray-300 truncate">{comp.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
}

// ── Inner canvas (needs ReactFlowProvider context) ────────────────────────────

function CanvasInner({ submitting, error, onSubmit }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setActiveAssignment, activeAssignment, learningMode, setSubmission, submission } =
    useAssignmentStore();
  const { nodes, edges, addNode, onNodesChange, onEdgesChange, onConnect, clearGraph } =
    useGraphStore();
  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Load assignment & clear any previous graph
  useEffect(() => {
    clearGraph();
    setShowFeedback(false);
    getAssignment(id, token)
      .then(setActiveAssignment)
      .catch(() => navigate("/dashboard"));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show feedback when submission arrives
  useEffect(() => {
    if (submission) setShowFeedback(true);
  }, [submission]);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData("application/archon-component");
      if (!raw) return;
      const component = JSON.parse(raw);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(component, position);
    },
    [screenToFlowPosition, addNode]
  );

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  if (!activeAssignment) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading assignment…</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* ── Header ── */}
      <header className="shrink-0 border-b border-gray-800 px-4 py-2.5 flex items-center gap-3 bg-gray-950 z-10">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Dashboard
        </button>

        <span className="text-sm font-medium text-white">{activeAssignment.title}</span>

        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            learningMode
              ? "bg-blue-900/40 text-blue-400 border-blue-700/60"
              : "bg-gray-800 text-gray-500 border-gray-700"
          }`}
        >
          {learningMode ? "Learning Mode ON" : "Learning Mode OFF"}
        </span>

        <div className="ml-auto flex items-center gap-3">
          {error && <span className="text-red-400 text-xs">{error}</span>}
          <span className="text-[10px] text-gray-600">
            {nodes.length} component{nodes.length !== 1 ? "s" : ""} · {edges.length} connection{edges.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 min-h-0">
        {/* Palette */}
        <PaletteSidebar />

        {/* Canvas */}
        <div
          ref={wrapperRef}
          className="flex-1 relative bg-gray-950"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
              <div className="text-4xl mb-3 opacity-30">☁️</div>
              <p className="text-gray-600 text-sm">Drag AWS components from the left panel</p>
              <p className="text-gray-700 text-xs mt-1">Connect them by dragging between the dots on each node</p>
            </div>
          )}
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            fitView={nodes.length > 0}
            snapToGrid
            snapGrid={[16, 16]}
            deleteKeyCode="Backspace"
            minZoom={0.3}
            maxZoom={2}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={20} size={0.8} color="#374151" />
            <Controls
              style={{ backgroundColor: "#1f2937", border: "1px solid #374151" }}
              showInteractive={false}
            />
            <MiniMap
              style={{ backgroundColor: "#111827", border: "1px solid #374151" }}
              nodeColor="#4b5563"
              maskColor="rgba(0,0,0,0.5)"
            />
          </ReactFlow>
        </div>

        {/* Assignment panel */}
        <AssignmentPanel onSubmit={onSubmit} submitting={submitting} />
      </div>

      {/* ── Feedback overlay ── */}
      {showFeedback && submission && (
        <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <SubmissionFeedback submission={submission} />
            <button
              onClick={() => setShowFeedback(false)}
              className="mt-5 w-full bg-gray-800 hover:bg-gray-700 text-white text-sm rounded-lg px-4 py-2.5 transition-colors"
            >
              Continue working
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Outer wrapper (provides ReactFlow context + submit handler) ───────────────

export default function AssignmentCanvas() {
  const { id } = useParams();
  const { token } = useAuthStore();
  const { setSubmission } = useAssignmentStore();
  const { getGraph } = useGraphStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const graph = getGraph();
      const result = await submitAssignment(id, graph, token);
      setSubmission(result);
    } catch (err) {
      setError(err.message ?? "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ReactFlowProvider>
      <CanvasInner onSubmit={handleSubmit} submitting={submitting} error={error} />
    </ReactFlowProvider>
  );
}
