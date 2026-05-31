import { useEffect, useRef, useState } from "react";
import { sendTutorMessage } from "../../api/tutor";
import useAccessStore from "../../store/accessStore";
import UpgradePrompt from "../ui/UpgradePrompt";

function normalizeGraph(graph) {
  if (!graph || !Array.isArray(graph.nodes) || graph.nodes.length === 0) {
    return null;
  }
  return {
    id: graph.id || "academy-tutor",
    name: graph.name || graph.graphMeta?.name || "Student architecture",
    provider: graph.graphMeta?.provider || graph.provider || "aws",
    region: graph.graphMeta?.region || graph.region || "us-east-1",
    components: graph.nodes.map((node) => ({
      id: node.id,
      type: node.type || node.data?.awsType || node.data?.type || "unknown",
      label: node.data?.label || node.type || node.id,
      position: node.position || { x: 0, y: 0 },
      config: node.data?.config || {},
      security_group_ids: node.data?.security_group_ids || [],
      iam_role_id: node.data?.iam_role_id || null,
      subnet_id: node.data?.subnet_id || null,
      vpc_id: node.data?.vpc_id || null,
      category: node.data?.category || "",
    })),
    edges: (graph.edges || []).map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type || edge.data?.type || "network",
      bidirectional: edge.data?.bidirectional || false,
      suggested_rules: edge.data?.suggested_rules || [],
    })),
    security_groups: graph.securityGroups || graph.security_groups || [],
    iam_roles: graph.iamRoles || graph.iam_roles || [],
  };
}

export default function TutorPanel({
  contextType = "lesson",
  lessonTitle,
  lessonContent,
  moduleTitle,
  assignmentBrief,
  rubric,
  graph,
  variant = "light",
  className = "",
}) {
  const canUse = useAccessStore((s) => s.canUse);
  const loaded = useAccessStore((s) => s.loaded);
  const allowed = loaded && canUse("academy_ai_tutor");

  const [open, setOpen] = useState(true);
  const [hintMode, setHintMode] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const isDark = variant === "dark";
  const shell = isDark
    ? "bg-gray-950 border-gray-800 text-gray-100"
    : "bg-white border-gray-200 text-gray-900";
  const muted = isDark ? "text-gray-400" : "text-gray-500";
  const bubbleUser = isDark ? "bg-blue-900/50 text-blue-100" : "bg-blue-600 text-white";
  const bubbleTutor = isDark ? "bg-gray-900 border border-gray-800 text-gray-200" : "bg-gray-50 border border-gray-200 text-gray-800";

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !allowed) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setInput("");
    setMessages(nextMessages);
    setLoading(true);
    setError(null);

    try {
      const payload = {
        messages: nextMessages,
        context_type: contextType,
        lesson_title: lessonTitle || null,
        lesson_content: lessonContent || null,
        module_title: moduleTitle || null,
        assignment_brief: assignmentBrief || null,
        rubric: rubric || null,
        hint_mode: hintMode,
        graph: normalizeGraph(graph),
      };
      const { reply } = await sendTutorMessage(payload);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError(err.message || "Tutor request failed");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  if (!loaded) {
    return null;
  }

  if (!allowed) {
    return (
      <aside className={`w-full lg:w-96 shrink-0 border-l ${shell} ${className}`}>
        <div className="p-4">
          <UpgradePrompt feature="academy_ai_tutor" compact />
        </div>
      </aside>
    );
  }

  return (
    <aside className={`w-full lg:w-96 shrink-0 border-l flex flex-col ${shell} ${className}`}>
      <div className={`px-4 py-3 border-b ${isDark ? "border-gray-800" : "border-gray-200"} flex items-center justify-between gap-2`}>
        <div>
          <div className="text-sm font-semibold">AI Tutor</div>
          <div className={`text-xs ${muted}`}>Hint-first coaching</div>
        </div>
        <div className="flex items-center gap-2">
          <label className={`text-xs flex items-center gap-1.5 ${muted}`}>
            <input
              type="checkbox"
              checked={hintMode}
              onChange={(e) => setHintMode(e.target.checked)}
              className="rounded border-gray-400"
            />
            Hints
          </label>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={`text-xs px-2 py-1 rounded border ${
              isDark ? "border-gray-700 text-gray-300" : "border-gray-200 text-gray-600"
            }`}
          >
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {open && (
        <>
          <div
            ref={scrollRef}
            className={`flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 ${
              isDark ? "" : "max-h-[50vh] lg:max-h-none"
            }`}
          >
            {messages.length === 0 && (
              <div className={`text-sm ${muted} leading-relaxed`}>
                Ask about this {contextType === "assignment" ? "assignment" : "lesson"}. I will guide
                you with hints before giving full answers.
                {graph?.nodes?.length > 0 && " I can also see your current canvas."}
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${
                  message.role === "user" ? bubbleUser : bubbleTutor
                }`}
              >
                {message.content}
              </div>
            ))}
            {loading && (
              <div className={`text-xs ${muted}`}>Tutor is thinking…</div>
            )}
            {error && (
              <div className="text-xs text-red-500">{error}</div>
            )}
          </div>

          <div className={`px-4 py-3 border-t ${isDark ? "border-gray-800" : "border-gray-200"}`}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              placeholder="Ask a question…"
              className={`w-full text-sm rounded-lg px-3 py-2 resize-none ${
                isDark
                  ? "bg-gray-900 border border-gray-700 text-white placeholder:text-gray-500"
                  : "bg-white border border-gray-300 text-gray-900"
              }`}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="mt-2 w-full text-sm font-medium rounded-lg px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Sending…" : "Ask tutor"}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
