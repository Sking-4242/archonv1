import { useEffect, useRef, useState } from "react";
import useGraphStore from "../../store/graphStore";
import useSecurityStore from "../../store/securityStore";
import useIAMStore from "../../store/iamStore";
import useSettingsStore from "../../store/settingsStore";
import useChatStore from "../../store/chatStore";
import { serializeGraph } from "../../utils/serializer";
import { sendChatMessage, sendDesignMessage } from "../../api/chat";

// ── Constants ──────────────────────────────────────────────────────────────────

const CHAT_WELCOME =
  "Ask me anything about your architecture — security, cost, scalability, Terraform snippets, best practices...";

const BUILD_WELCOME =
  "Describe the architecture you want to build. I'll propose a plan, ask a couple of questions, then build it on the canvas once you confirm.";

const EDGE_TYPE_COLORS = {
  network:    "bg-blue-100 text-blue-700",
  data_flow:  "bg-purple-100 text-purple-700",
  dependency: "bg-gray-100 text-gray-700",
  streaming:  "bg-orange-100 text-orange-700",
  batch:      "bg-yellow-100 text-yellow-700",
  event:      "bg-green-100 text-green-700",
};

const ZONE_ORDER = ["external", "public", "private", "data", "management"];

// ── ChatBubble ─────────────────────────────────────────────────────────────────

function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2 ${isUser ? "flex-row-reverse" : "flex-row"} mb-3`}>
      <div
        className={`text-xs rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold ${
          isUser ? "bg-indigo-600 text-white" : "bg-gray-700 text-white"
        }`}
      >
        {isUser ? "U" : "A"}
      </div>
      <div
        className={`max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-indigo-600 text-white ml-auto"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

// ── ThinkingBubble ─────────────────────────────────────────────────────────────

function ThinkingBubble() {
  return (
    <div className="flex gap-2 flex-row mb-3">
      <div className="text-xs rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold bg-gray-700 text-white">
        A
      </div>
      <div className="bg-gray-100 rounded-lg px-3 py-2 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

// ── ErrorBubble ────────────────────────────────────────────────────────────────

function ErrorBubble({ message }) {
  return (
    <div className="flex gap-2 flex-row mb-3">
      <div className="text-xs rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold bg-red-500 text-white">
        !
      </div>
      <div className="max-w-[80%] rounded-lg px-3 py-2 text-xs leading-relaxed bg-red-50 text-red-700 border border-red-200">
        {message}
      </div>
    </div>
  );
}

// ── PlanCard ───────────────────────────────────────────────────────────────────

function PlanCard({ plan, stage, onApply }) {
  const [expanded, setExpanded] = useState(true);
  if (!plan) return null;

  const nodesByZone = {};
  for (const node of plan.nodes) {
    const zone = node.zone || "private";
    (nodesByZone[zone] = nodesByZone[zone] || []).push(node);
  }
  const orderedZones = ZONE_ORDER.filter((z) => nodesByZone[z]);
  const otherZones = Object.keys(nodesByZone).filter((z) => !ZONE_ORDER.includes(z));
  const canApply = stage === "build" && typeof onApply === "function";

  return (
    <div className="mx-8 mb-3 border border-indigo-200 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Card header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-indigo-50 hover:bg-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <span className="text-xs font-semibold text-indigo-700">Architecture Plan</span>
          <span className="text-xs text-indigo-500">
            {plan.nodes.length} components · {plan.edges.length} connections
          </span>
        </div>
        <svg
          className={`w-3.5 h-3.5 text-indigo-500 transition-transform ${expanded ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-3 py-2 space-y-2">
          {plan.summary && (
            <p className="text-xs text-gray-600 leading-relaxed">{plan.summary}</p>
          )}

          {/* Components grouped by zone */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
              Components
            </p>
            <div className="space-y-1.5">
              {[...orderedZones, ...otherZones].map((zone) => (
                <div key={zone}>
                  <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider">
                    {zone}
                  </span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {nodesByZone[zone].map((node) => (
                      <span
                        key={node.id}
                        className="inline-flex items-center gap-1 text-[10px] bg-gray-100 text-gray-700 rounded px-1.5 py-0.5"
                      >
                        <span className="font-mono text-gray-400 text-[9px]">{node.type}</span>
                        <span>{node.label}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Connections */}
          {plan.edges.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Connections
              </p>
              <div className="flex flex-wrap gap-1">
                {plan.edges.map((edge) => (
                  <span
                    key={edge.id}
                    className={`inline-flex items-center gap-1 text-[10px] rounded px-1.5 py-0.5 ${
                      EDGE_TYPE_COLORS[edge.type] ?? "bg-gray-100 text-gray-700"
                    }`}
                  >
                    <span className="font-mono opacity-60">
                      {edge.source} → {edge.target}
                    </span>
                    {edge.label && <span>· {edge.label}</span>}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Apply button — only shown when stage === "build" */}
          {canApply && (
            <button
              onClick={onApply}
              className="mt-1 w-full py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold transition-colors"
            >
              Apply to Canvas
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── ConflictDialog ─────────────────────────────────────────────────────────────

function ConflictDialog({ nodeCount, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-5 w-72 text-sm">
        <h3 className="font-semibold text-gray-900 mb-2">Canvas is not empty</h3>
        <p className="text-gray-600 text-xs leading-relaxed mb-4">
          Your canvas already has {nodeCount} node{nodeCount !== 1 ? "s" : ""}. The AI
          design will be added alongside existing components. You can undo this with Ctrl+Z.
        </p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-3 py-1.5 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700 font-semibold"
          >
            Add to Canvas
          </button>
        </div>
      </div>
    </div>
  );
}

// ── ChatPanel ──────────────────────────────────────────────────────────────────

export default function ChatPanel({ onClose }) {
  const [mode, setMode] = useState("chat");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pendingBuild, setPendingBuild] = useState(null); // { nodes, edges } awaiting conflict confirm
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const { nodes: canvasNodes, edges: canvasEdges, graphMeta, applyBuild } = useGraphStore();
  const sgs = useSecurityStore((s) => s.securityGroups);
  const iamRoles = useIAMStore((s) => s.roles);
  const provider    = useSettingsStore((s) => s.provider);
  const apiKeys     = useSettingsStore((s) => s.apiKeys);
  const models      = useSettingsStore((s) => s.models);
  const ollamaBaseUrl = useSettingsStore((s) => s.ollamaBaseUrl);

  const { getMessages, addMessage, clearThread } = useChatStore();
  const archId = graphMeta?.id ?? "default";
  const messages = getMessages(archId, mode);

  // Auto-scroll on new messages or loading state change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading, error]);

  // Focus input on mount and mode change
  useEffect(() => {
    inputRef.current?.focus();
  }, [mode]);

  const welcomeText = mode === "chat" ? CHAT_WELCOME : BUILD_WELCOME;

  // ── Apply build plan to canvas ──────────────────────────────────────────────

  function handleApply(graph) {
    if (canvasNodes.length > 0) {
      setPendingBuild(graph);
    } else {
      applyBuild(graph.nodes, graph.edges);
    }
  }

  function confirmApply() {
    if (pendingBuild) {
      applyBuild(pendingBuild.nodes, pendingBuild.edges);
      setPendingBuild(null);
    }
  }

  // ── Send message ────────────────────────────────────────────────────────────

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    setInput("");
    setError(null);

    const userMsg = { role: "user", content: text };
    addMessage(archId, mode, userMsg);
    setLoading(true);

    // Build the full message history to send (all stored messages + this one)
    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const graph = serializeGraph(
      graphMeta,
      canvasNodes,
      canvasEdges,
      sgs,
      iamRoles,
    );

    const llmOpts = {
      provider,
      apiKey: apiKeys[provider] ?? null,
      model: models[provider] ?? null,
      baseUrl: provider === "ollama" ? ollamaBaseUrl : null,
    };

    try {
      if (mode === "chat") {
        const { reply } = await sendChatMessage(graph, history, llmOpts);
        addMessage(archId, mode, { role: "assistant", content: reply });
      } else {
        const data = await sendDesignMessage(graph, history, llmOpts);
        addMessage(archId, mode, {
          role: "assistant",
          content: data.message,
          plan: data.plan ?? null,
          stage: data.stage,
          graph: data.graph ?? null,
        });
      }
    } catch (err) {
      const msg = err.message ?? "Something went wrong. Please try again.";
      setError(msg.length > 200 ? msg.slice(0, 200) + "…" : msg);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleClear() {
    if (messages.length === 0) return;
    if (window.confirm(`Clear this ${mode === "chat" ? "chat" : "build"} conversation?`)) {
      clearThread(archId, mode);
      setError(null);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {pendingBuild && (
        <ConflictDialog
          nodeCount={canvasNodes.length}
          onConfirm={confirmApply}
          onCancel={() => setPendingBuild(null)}
        />
      )}

      <div className="flex flex-col h-full bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 flex-shrink-0">
          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-md p-0.5 gap-0.5">
            {["chat", "build"].map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
                  mode === m
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {m === "chat" ? "Chat" : "Build"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            {/* Clear button */}
            <button
              onClick={handleClear}
              disabled={messages.length === 0}
              title="Clear conversation"
              className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Message list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {/* Welcome text when thread is empty */}
          {messages.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-4 leading-relaxed px-4">
              {welcomeText}
            </p>
          )}

          {/* Render each message (bubble + optional plan card) */}
          {messages.map((msg, i) => (
            <div key={i}>
              <ChatBubble msg={msg} />
              {msg.plan && (
                <PlanCard
                  plan={msg.plan}
                  stage={msg.stage}
                  onApply={msg.graph ? () => handleApply(msg.graph) : undefined}
                />
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && <ThinkingBubble />}

          {/* Error display */}
          {error && <ErrorBubble message={error} />}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 px-3 py-2 flex-shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "chat" ? "Ask about your architecture…" : "Describe what you want to build…"}
              rows={2}
              disabled={loading}
              className="flex-1 resize-none text-xs border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400 disabled:opacity-50 disabled:cursor-not-allowed leading-relaxed"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
            >
              {loading ? (
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </>
  );
}
