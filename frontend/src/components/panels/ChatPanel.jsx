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

// ── PlanCard ───────────────────────────────────────────────────────────────────

function PlanCard({ plan, stage, graph, onApply }) {
  const [expanded, setExpanded] = useState(true);
  if (!plan) return null;

  const nodesByZone = {};
  for (const node of plan.nodes) {
    const zone = node.zone || "private";
    (nodesByZone[zone] = nodesByZone[zone] || []).push(node);
  }
  const orderedZones = ZONE_ORDER.filter((z) => nodesByZone[z]);
  const otherZones = Object.keys(nodesByZone).filter((z) => !ZONE_ORDER.includes(z));

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
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Components</p>
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
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Connections</p>
              <div className="space-y-0.5">
                {plan.edges.map((edge) => {
                  const src = plan.nodes.find((n) => n.id === edge.source);
                  const tgt = plan.nodes.find((n) => n.id === edge.target);
                  return (
                    <div key={edge.id} className="flex items-center gap-1 text-[10px] text-gray-600 flex-wrap">
                      <span className="font-medium">{src?.label ?? edge.source}</span>
                      <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <span className="font-medium">{tgt?.label ?? edge.target}</span>
                      <span className={`px-1 rounded text-[9px] font-medium ${EDGE_TYPE_COLORS[edge.type] ?? "bg-gray-100 text-gray-600"}`}>
                        {edge.type}
                      </span>
                      {edge.label && <span className="text-gray-400 italic">{edge.label}</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Apply button — build stage only */}
          {stage === "build" && graph && (
            <button
              onClick={onApply}
              className="w-full mt-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Apply to Canvas
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── ConflictDialog ─────────────────────────────────────────────────────────────

function ConflictDialog({ onReplace, onAdd, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-5 w-80 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800">Canvas has existing content</p>
            <p className="text-xs text-gray-500 mt-0.5">
              How would you like to apply the generated design?
            </p>
          </div>
        </div>
        <div className="space-y-2 pt-1">
          <button
            onClick={onReplace}
            className="w-full text-left px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
          >
            <p className="text-xs font-semibold text-red-700">Replace canvas</p>
            <p className="text-[10px] text-red-400 mt-0.5">Remove everything and apply the new design</p>
          </button>
          <button
            onClick={onAdd}
            className="w-full text-left px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors"
          >
            <p className="text-xs font-semibold text-indigo-700">Add alongside</p>
            <p className="text-[10px] text-indigo-400 mt-0.5">Keep existing nodes and place the new design next to them</p>
          </button>
          <button
            onClick={onCancel}
            className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <p className="text-xs font-semibold text-gray-600">Cancel</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Do nothing, keep current canvas unchanged</p>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Message renderer ───────────────────────────────────────────────────────────

function Message({ msg, onApply }) {
  if (msg.role === "user") return <ChatBubble msg={msg} />;
  return (
    <div>
      <ChatBubble msg={msg} />
      {msg.plan && (
        <PlanCard
          plan={msg.plan}
          stage={msg.stage}
          graph={msg.graph}
          onApply={() => onApply(msg)}
        />
      )}
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────────

export default function ChatPanel({ onClose }) {
  const [mode, setMode] = useState("chat"); // "chat" | "build"
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [conflictPayload, setConflictPayload] = useState(null);
  const scrollRef = useRef(null);

  // Graph store
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const graphMeta = useGraphStore((s) => s.graphMeta);
  const securityGroups = useSecurityStore((s) => s.securityGroups);
  const iamRoles = useIAMStore((s) => s.iamRoles);
  const applyBuild = useGraphStore((s) => s.applyBuild);
  const loadState = useGraphStore((s) => s.loadState);

  // Settings
  const provider = useSettingsStore((s) => s.provider);
  const apiKeys = useSettingsStore((s) => s.apiKeys);
  const models = useSettingsStore((s) => s.models);
  const ollamaBaseUrl = useSettingsStore((s) => s.ollamaBaseUrl);

  // Chat store — separate threads per mode
  const archId = graphMeta?.id ?? "default";
  const threadKey = `${archId}:${mode}`;
  const thread = useChatStore((s) => s.threads[threadKey]);
  const messages = thread?.messages ?? [];
  const addMessages = useChatStore((s) => s.addMessages);
  const clearThread = useChatStore((s) => s.clearThread);

  // Scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const llmConfig = {
    provider,
    apiKey: apiKeys[provider] ?? null,
    model: models[provider] ?? null,
    baseUrl: provider === "ollama" ? ollamaBaseUrl : null,
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMsg = { role: "user", content: text };
    const optimisticHistory = [...messages, userMsg];
    addMessages(threadKey, [userMsg]);
    setInput("");
    setSending(true);
    setError(null);

    try {
      const graph = serializeGraph(graphMeta, nodes, edges, securityGroups, iamRoles);
      // Strip rich fields — backend only needs role + content
      const apiHistory = optimisticHistory.map((m) => ({ role: m.role, content: m.content }));

      if (mode === "chat") {
        const data = await sendChatMessage(graph, apiHistory, llmConfig);
        addMessages(threadKey, [{ role: "assistant", content: data.reply }]);
      } else {
        const data = await sendDesignMessage(graph, apiHistory, llmConfig);
        addMessages(threadKey, [{
          role: "assistant",
          content: data.message,
          stage: data.stage ?? null,
          plan: data.plan ?? null,
          graph: data.graph ?? null,
        }]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    clearThread(threadKey);
    setError(null);
  };

  // Apply a build-stage graph to the canvas
  const handleApply = (msg) => {
    if (!msg.graph) return;
    if (nodes.length > 0) {
      setConflictPayload(msg.graph);
    } else {
      _doApply(msg.graph, "replace");
    }
  };

  const _doApply = (graph, strategy) => {
    if (strategy === "replace") {
      loadState({ nodes: graph.nodes, edges: graph.edges, graphMeta: { ...graphMeta } });
    } else {
      // Offset new nodes to the right of existing content
      const maxX = nodes.length > 0
        ? Math.max(...nodes.map((n) => (n.position?.x ?? 0) + (n.style?.width ?? 130))) + 100
        : 0;
      const offsetNodes = graph.nodes.map((n) => ({
        ...n,
        position: { x: n.position.x + maxX, y: n.position.y },
      }));
      applyBuild(offsetNodes, graph.edges);
    }
    setConflictPayload(null);
  };

  return (
    <>
      {conflictPayload && (
        <ConflictDialog
          onReplace={() => _doApply(conflictPayload, "replace")}
          onAdd={() => _doApply(conflictPayload, "add")}
          onCancel={() => setConflictPayload(null)}
        />
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Chat / Build toggle */}
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-[11px]">
              <button
                onClick={() => { setMode("chat"); setError(null); }}
                className={`px-2.5 py-1 font-medium transition-colors ${
                  mode === "chat"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                Chat
              </button>
              <button
                onClick={() => { setMode("build"); setError(null); }}
                className={`px-2.5 py-1 font-medium transition-colors ${
                  mode === "build"
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-500 hover:bg-gray-50"
                }`}
              >
                Build
              </button>
            </div>
            <span className="text-xs text-gray-400 capitalize">{provider}</span>
            {messages.length > 0 && (
              <button
                onClick={handleClear}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                Clear
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm leading-none px-1"
          >
            ✕
          </button>
        </div>

        {/* Message list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 && (
            <p className="text-xs text-gray-400 text-center mt-4">
              {mode === "chat" ? CHAT_WELCOME : BUILD_WELCOME}
            </p>
          )}
          {messages.map((msg, i) => (
            <Message key={i} msg={msg} onApply={handleApply} />
          ))}
          {sending && (
            <div className="flex gap-2 mb-3">
              <div className="text-xs rounded-full w-6 h-6 flex-shrink-0 flex items-center justify-center font-bold bg-gray-700 text-white">
                A
              </div>
              <div className="bg-gray-100 rounded-lg px-3 py-2 text-xs text-gray-400 italic">
                {mode === "build" ? "Designing…" : "Thinking…"}
              </div>
            </div>
          )}
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2 mb-2">
              {error}
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="flex items-end gap-2 px-4 py-2 border-t border-gray-200 flex-shrink-0">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              mode === "chat"
                ? "Ask about your architecture… (Enter to send, Shift+Enter for newline)"
                : "Describe what you want to build… (Enter to send)"
            }
            disabled={sending}
            rows={2}
            className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
