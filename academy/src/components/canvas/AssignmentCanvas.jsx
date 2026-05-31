import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { useAuthStore } from "../../store/authStore";
import { useAssignmentStore } from "../../store/assignmentStore";
import { getAssignment } from "../../api/assignments";
import { submitAssignment } from "../../api/submissions";
import AssignmentPanel from "./AssignmentPanel";
import SubmissionFeedback from "../student/SubmissionFeedback";

const CANVAS_URL = import.meta.env.VITE_CANVAS_URL ?? "http://localhost:3000";

export default function AssignmentCanvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const {
    activeAssignment,
    setActiveAssignment,
    learningMode,
    setSubmission,
    submission,
  } = useAssignmentStore();

  const iframeRef = useRef(null);
  const [canvasReady, setCanvasReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeCount, setNodeCount] = useState(0);
  const [edgeCount, setEdgeCount] = useState(0);
  const [canvasGraph, setCanvasGraph] = useState(null);

  // ── Load assignment ───────────────────────────────────────────────────────

  useEffect(() => {
    setCanvasReady(false);
    setShowFeedback(false);
    setSelectedNode(null);
    setNodeCount(0);
    setEdgeCount(0);
    getAssignment(id, token)
      .then(setActiveAssignment)
      .catch(() => navigate("/dashboard"));
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show feedback when submission arrives
  useEffect(() => {
    if (submission) setShowFeedback(true);
  }, [submission]);

  // ── postMessage bridge ────────────────────────────────────────────────────

  useEffect(() => {
    function handleMessage(e) {
      const { type, graph, nodeType, nodeData } = e.data ?? {};

      if (type === "CANVAS_READY") {
        setCanvasReady(true);
      }

      if (type === "GRAPH_SUBMIT") {
        // graph has come back from iframe — run submission
        const { nodes = [], edges = [] } = graph ?? {};
        setCanvasGraph(graph);
        setNodeCount(nodes.length);
        setEdgeCount(edges.length);
        setSubmitting(true);
        setError(null);
        submitAssignment(id, graph, token)
          .then((result) => {
            setSubmission(result);
          })
          .catch((err) => {
            setError(err.message ?? "Submission failed. Please try again.");
          })
          .finally(() => setSubmitting(false));
      }

      if (type === "NODE_SELECTED") {
        setSelectedNode(nodeData ? { nodeType, nodeData } : null);
      }

      if (type === "GRAPH_STATE") {
        // Periodic state updates for node/edge counts
        const { nodes = [], edges = [] } = graph ?? {};
        setCanvasGraph(graph);
        setNodeCount(nodes.length);
        setEdgeCount(edges.length);
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [id, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Send INIT_ASSIGNMENT once canvas is ready and assignment is loaded ────

  useEffect(() => {
    if (!canvasReady || !activeAssignment) return;
    iframeRef.current?.contentWindow?.postMessage(
      {
        type: "INIT_ASSIGNMENT",
        assignment: {
          id: activeAssignment.id,
          title: activeAssignment.title,
          brief: activeAssignment.brief,
        },
      },
      CANVAS_URL
    );
  }, [canvasReady, activeAssignment]);

  // ── Submit — ask iframe for graph, it replies with GRAPH_SUBMIT ──────────

  function handleSubmit() {
    if (!canvasReady) {
      setError("Canvas is not ready yet.");
      return;
    }
    iframeRef.current?.contentWindow?.postMessage({ type: "GRAPH_REQUEST" }, CANVAS_URL);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!activeAssignment) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading assignment…</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
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
          {!canvasReady && (
            <span className="text-yellow-500 text-xs">Canvas loading…</span>
          )}
          {error && <span className="text-red-400 text-xs">{error}</span>}
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Assignment panel (left) */}
        <AssignmentPanel
          onSubmit={handleSubmit}
          submitting={submitting}
          selectedNode={selectedNode}
          canvasGraph={canvasGraph}
        />

        {/* Archon Pro canvas (right, iframe) */}
        <div className="flex-1 relative">
          <iframe
            ref={iframeRef}
            src={`${CANVAS_URL}?assignment_mode=true`}
            title="Archon Canvas"
            className="w-full h-full border-0"
            allow="same-origin"
          />
          {!canvasReady && (
            <div className="absolute inset-0 bg-gray-950 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-500 text-sm">Connecting to canvas…</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Submission feedback overlay */}
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
