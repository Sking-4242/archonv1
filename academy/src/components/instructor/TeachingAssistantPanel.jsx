import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createAssignment } from "../../api/assignments";
import { listClasses } from "../../api/classes";
import { createLesson } from "../../api/lessons";
import { getModule, listModules } from "../../api/modules";
import { sendTeachingAssistantMessage } from "../../api/teachingAssistant";
import useAccessStore from "../../store/accessStore";
import UpgradePrompt from "../ui/UpgradePrompt";

const QUICK_TASKS = [
  {
    id: "assignment",
    label: "Design a lab",
    prompt: "Design a canvas architecture lab for my class with title, student brief, and auto-grade rubric.",
  },
  {
    id: "lesson",
    label: "Write a lesson",
    prompt: "Draft a lesson outline with learning objectives, key content, and a short check-for-understanding.",
  },
  {
    id: "announcement",
    label: "Announcement",
    prompt: "Draft a concise class announcement for this week.",
  },
  {
    id: "at_risk",
    label: "At-risk help",
    prompt: "Review my class progress and suggest interventions for at-risk students.",
  },
  {
    id: "rubric",
    label: "Build rubric",
    prompt: "Create an auto-gradable rubric for a 3-tier web architecture lab.",
  },
  {
    id: "feedback",
    label: "Grading feedback",
    prompt: "Help me write constructive feedback for a student who missed key security requirements.",
  },
  {
    id: "exam_prep",
    label: "Exam alignment",
    prompt: "Suggest how to align my upcoming modules with AWS Cloud Practitioner exam domains.",
  },
  {
    id: "discussion",
    label: "Discussion prompts",
    prompt: "Generate 5 discussion questions for a lesson on VPC networking.",
  },
];

function ArtifactCard({ artifact, onApplied, moduleId, modules, onApplyFeedback, isDark }) {
  const navigate = useNavigate();
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [pickModule, setPickModule] = useState(moduleId ? String(moduleId) : "");

  useEffect(() => {
    if (moduleId) setPickModule(String(moduleId));
  }, [moduleId]);

  async function applyAssignment() {
    setApplying(true);
    setError(null);
    try {
      const created = await createAssignment({
        title: artifact.title || "Untitled lab",
        brief: artifact.brief || "",
        rubric: artifact.rubric || [],
        due_date: null,
      });
      onApplied?.();
      navigate(`/instructor/assignments?highlight=${created.id}`);
    } catch (err) {
      setError(err.message || "Could not create assignment");
    } finally {
      setApplying(false);
    }
  }

  async function applyLesson() {
    const targetId = pickModule || moduleId;
    if (!targetId) {
      setError("Select a module to add this lesson to.");
      return;
    }
    setApplying(true);
    setError(null);
    try {
      const mod = await getModule(Number(targetId));
      const orderIndex = mod.lessons?.length ?? mod.lesson_count ?? 0;
      const created = await createLesson({
        module_id: Number(targetId),
        title: artifact.title || "Untitled lesson",
        content: artifact.content || "",
        lesson_type: artifact.lesson_type || "content",
        estimated_minutes: artifact.estimated_minutes || 10,
        order_index: orderIndex,
      });
      onApplied?.();
      navigate(`/instructor/lessons/${created.id}/edit`);
    } catch (err) {
      setError(err.message || "Could not create lesson");
    } finally {
      setApplying(false);
    }
  }

  function copyText(text) {
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const card = isDark
    ? "border border-gray-700 bg-gray-900"
    : "border border-emerald-200 bg-emerald-50";

  if (artifact.type === "assignment_draft") {
    return (
      <div className={`${card} rounded-xl p-4 space-y-2`}>
        <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-emerald-400" : "text-emerald-800"}`}>
          Lab draft
        </div>
        <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{artifact.title}</div>
        <p className={`text-xs line-clamp-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>{artifact.brief}</p>
        {error && <div className="text-xs text-red-400">{error}</div>}
        <div className="flex gap-2 pt-1 flex-wrap">
          <button
            type="button"
            onClick={applyAssignment}
            disabled={applying}
            className="text-xs bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {applying ? "Creating…" : "Create assignment"}
          </button>
          <button
            type="button"
            onClick={() =>
              copyText(
                `${artifact.title}\n\n${artifact.brief}\n\nRubric:\n${JSON.stringify(artifact.rubric || [], null, 2)}`
              )
            }
            className={`text-xs px-3 py-1.5 rounded-lg border ${isDark ? "border-gray-600 text-gray-300" : "border-emerald-300 text-emerald-800"}`}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  if (artifact.type === "lesson_draft") {
    const body = artifact.content || "";
    return (
      <div className={`${isDark ? "border border-gray-700 bg-gray-900" : "border border-blue-200 bg-blue-50"} rounded-xl p-4 space-y-2`}>
        <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-blue-400" : "text-blue-800"}`}>
          Lesson draft
        </div>
        <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
          {artifact.title || "Untitled lesson"}
        </div>
        {!moduleId && modules?.length > 0 && (
          <select
            value={pickModule}
            onChange={(e) => setPickModule(e.target.value)}
            className={`w-full text-xs rounded-lg px-2 py-1.5 border ${
              isDark ? "bg-gray-800 border-gray-700 text-white" : "border-gray-200"
            }`}
          >
            <option value="">Select module…</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.title}
              </option>
            ))}
          </select>
        )}
        {error && <div className="text-xs text-red-400">{error}</div>}
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={applyLesson}
            disabled={applying}
            className="text-xs bg-blue-700 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
          >
            {applying ? "Creating…" : "Create lesson"}
          </button>
          <button
            type="button"
            onClick={() => copyText(body)}
            className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "border border-gray-600 text-gray-300" : "bg-blue-700 text-white"}`}
          >
            {copied ? "Copied" : "Copy content"}
          </button>
        </div>
      </div>
    );
  }

  if (artifact.type === "feedback_draft") {
    return (
      <div className={`${isDark ? "border border-gray-700 bg-gray-900" : "border border-indigo-200 bg-indigo-50"} rounded-xl p-4 space-y-2`}>
        <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-indigo-400" : "text-indigo-800"}`}>
          Suggested feedback
        </div>
        <p className={`text-xs whitespace-pre-wrap ${isDark ? "text-gray-300" : "text-gray-700"}`}>{artifact.feedback}</p>
        {artifact.suggested_score != null && (
          <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
            Suggested score: {artifact.suggested_score}
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          {onApplyFeedback && (
            <button
              type="button"
              onClick={() =>
                onApplyFeedback(artifact.feedback || "", artifact.suggested_score ?? null)
              }
              className="text-xs bg-indigo-700 hover:bg-indigo-800 text-white px-3 py-1.5 rounded-lg"
            >
              Use as feedback
            </button>
          )}
          <button
            type="button"
            onClick={() => copyText(artifact.feedback || "")}
            className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? "border border-gray-600 text-gray-300" : "border border-indigo-300 text-indigo-800"}`}
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    );
  }

  if (artifact.type === "announcement_draft") {
    const text = `${artifact.title || "Announcement"}\n\n${artifact.body || ""}`;
    return (
      <div className={`${isDark ? "border border-gray-700 bg-gray-900" : "border border-purple-200 bg-purple-50"} rounded-xl p-4 space-y-2`}>
        <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-purple-400" : "text-purple-800"}`}>
          Announcement
        </div>
        <div className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{artifact.title}</div>
        <button
          type="button"
          onClick={() => copyText(text)}
          className="text-xs bg-purple-700 text-white px-3 py-1.5 rounded-lg"
        >
          {copied ? "Copied" : "Copy announcement"}
        </button>
      </div>
    );
  }

  if (artifact.type === "rubric_draft") {
    const criteria = artifact.criteria || artifact.rubric || [];
    return (
      <div className={`${isDark ? "border border-gray-700 bg-gray-900" : "border border-amber-200 bg-amber-50"} rounded-xl p-4 space-y-2`}>
        <div className={`text-xs font-semibold uppercase tracking-wide ${isDark ? "text-amber-400" : "text-amber-800"}`}>
          Rubric
        </div>
        <button
          type="button"
          onClick={() => copyText(JSON.stringify(criteria, null, 2))}
          className="text-xs bg-amber-700 text-white px-3 py-1.5 rounded-lg"
        >
          {copied ? "Copied" : "Copy rubric JSON"}
        </button>
      </div>
    );
  }

  return null;
}

export default function TeachingAssistantPanel({
  embedded = false,
  variant = "light",
  submissionId = null,
  assignmentId = null,
  initialTask = null,
  hideSidebar = false,
  onApplyFeedback = null,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const canUse = useAccessStore((s) => s.canUse);
  const loaded = useAccessStore((s) => s.loaded);
  const allowed = loaded && canUse("academy_teaching_assistant");
  const isDark = variant === "dark";
  const syncUrl = !submissionId;

  const [classes, setClasses] = useState([]);
  const [modules, setModules] = useState([]);
  const [classId, setClassId] = useState(searchParams.get("class") || "");
  const [moduleId, setModuleId] = useState(searchParams.get("module") || "");
  const [task, setTask] = useState(
    initialTask || searchParams.get("task") || (submissionId ? "feedback" : "general")
  );
  const [messages, setMessages] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!allowed || hideSidebar) return;
    listClasses().then(setClasses).catch(() => setClasses([]));
    listModules().then(setModules).catch(() => setModules([]));
  }, [allowed, hideSidebar]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, artifacts]);

  useEffect(() => {
    if (!syncUrl) return;
    const params = {};
    if (classId) params.class = classId;
    if (moduleId) params.module = moduleId;
    if (task && task !== "general") params.task = task;
    setSearchParams(params, { replace: true });
  }, [classId, moduleId, task, setSearchParams, syncUrl]);

  async function sendChat(nextMessages, activeTask = task) {
    setLoading(true);
    setError(null);
    setArtifacts([]);
    try {
      const payload = {
        messages: nextMessages,
        task: activeTask,
        class_id: classId ? Number(classId) : null,
        module_id: moduleId ? Number(moduleId) : null,
        assignment_id: assignmentId ? Number(assignmentId) : null,
        submission_id: submissionId ? Number(submissionId) : null,
      };
      const { reply, artifacts: found } = await sendTeachingAssistantMessage(payload);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      setArtifacts(found || []);
    } catch (err) {
      setError(err.message || "Assistant request failed");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading || !allowed) return;
    const nextMessages = [...messages, { role: "user", content: text }];
    setInput("");
    setMessages(nextMessages);
    await sendChat(nextMessages);
  }

  async function suggestFeedback() {
    if (loading || !allowed) return;
    const prompt =
      "Draft student-facing grading feedback based on this submission's rubric results and canvas. " +
      "Include a feedback_draft artifact I can paste into the grade form.";
    const nextMessages = [...messages, { role: "user", content: prompt }];
    setMessages(nextMessages);
    setTask("feedback");
    await sendChat(nextMessages, "feedback");
  }

  function handleQuickTask(quick) {
    setTask(quick.id);
    setInput(quick.prompt);
    inputRef.current?.focus();
  }

  function handleKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }

  function clearChat() {
    setMessages([]);
    setArtifacts([]);
    setError(null);
  }

  if (!loaded) {
    return null;
  }

  if (!allowed) {
    return (
      <div className={embedded ? "" : "max-w-3xl mx-auto"}>
        <UpgradePrompt feature="academy_teaching_assistant" compact={embedded} />
      </div>
    );
  }

  const shellBorder = isDark ? "border-gray-800 bg-gray-950" : "border-gray-200 bg-white";
  const muted = isDark ? "text-gray-400" : "text-gray-500";
  const userBubble = isDark ? "bg-blue-900/60 text-blue-100" : "bg-blue-600 text-white";
  const assistantBubble = isDark
    ? "bg-gray-900 border border-gray-800 text-gray-200"
    : "bg-gray-50 border border-gray-200 text-gray-800";

  return (
    <div
      className={`flex flex-col lg:flex-row gap-5 ${
        embedded && hideSidebar
          ? "h-[28rem]"
          : embedded
            ? "h-[calc(100vh-10rem)]"
            : "h-[calc(100vh-8rem)] min-h-[32rem]"
      }`}
    >
      {!hideSidebar && (
        <aside className="w-full lg:w-72 shrink-0 flex flex-col gap-4 overflow-y-auto">
          {!embedded && (
            <div>
              <h1 className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>
                Teaching Assistant
              </h1>
              <p className={`text-sm mt-1 ${muted}`}>
                AI copilot for labs, lessons, announcements, and student support.
              </p>
            </div>
          )}

          <div className={`${shellBorder} border rounded-xl p-4 space-y-3`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Context</div>
            <div className="space-y-2">
              <label className={`text-xs block ${muted}`}>Class (optional)</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className={`w-full border rounded-lg px-2 py-1.5 text-sm ${
                  isDark ? "bg-gray-900 border-gray-700 text-white" : "border-gray-200"
                }`}
              >
                <option value="">No class selected</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className={`text-xs block ${muted}`}>Module (optional)</label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className={`w-full border rounded-lg px-2 py-1.5 text-sm ${
                  isDark ? "bg-gray-900 border-gray-700 text-white" : "border-gray-200"
                }`}
              >
                <option value="">No module selected</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            </div>
            <p className={`text-xs ${muted}`}>
              Select a module to enable one-click lesson creation from drafts.
            </p>
          </div>

          <div className={`${shellBorder} border rounded-xl p-4 space-y-2`}>
            <div className={`text-xs font-semibold uppercase tracking-wide ${muted}`}>Quick actions</div>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_TASKS.map((q) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleQuickTask(q)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    task === q.id
                      ? "bg-blue-600 text-white border-blue-600"
                      : isDark
                        ? "border-gray-700 text-gray-400 hover:border-blue-500 hover:text-blue-300"
                        : "border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-700"
                  }`}
                >
                  {q.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      )}

      <div className={`flex-1 flex flex-col border rounded-xl overflow-hidden min-h-0 ${shellBorder}`}>
        <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? "border-gray-800" : "border-gray-100"}`}>
          <div className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-800"}`}>
            {submissionId ? "Grading assistant" : "Conversation"}
          </div>
          <div className="flex items-center gap-2">
            {submissionId && messages.length === 0 && (
              <button
                type="button"
                onClick={suggestFeedback}
                disabled={loading}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                Suggest feedback
              </button>
            )}
            <button
              type="button"
              onClick={clearChat}
              className={`text-xs ${muted} hover:opacity-80`}
            >
              Clear
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className={`text-sm leading-relaxed max-w-lg ${muted}`}>
              {submissionId
                ? "Ask for help writing feedback, interpreting rubric results, or explaining what the student should fix."
                : "Ask for help designing labs, writing lessons, drafting announcements, or supporting at-risk students."}
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`rounded-xl px-3 py-2 text-sm whitespace-pre-wrap max-w-[90%] ${
                message.role === "user" ? `${userBubble} ml-auto` : assistantBubble
              }`}
            >
              {message.content}
            </div>
          ))}
          {loading && <div className={`text-xs ${muted}`}>Assistant is thinking…</div>}
          {error && <div className="text-xs text-red-400">{error}</div>}
          {artifacts.length > 0 && (
            <div className="space-y-2 pt-2">
              {artifacts.map((artifact, i) => (
                <ArtifactCard
                  key={i}
                  artifact={artifact}
                  moduleId={moduleId}
                  modules={modules}
                  onApplied={clearChat}
                  onApplyFeedback={onApplyFeedback}
                  isDark={isDark}
                />
              ))}
            </div>
          )}
        </div>

        <div className={`px-4 py-3 border-t ${isDark ? "border-gray-800" : "border-gray-100"}`}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={submissionId ? 2 : 3}
            placeholder={submissionId ? "Ask about this submission…" : "Describe what you need help with…"}
            className={`w-full text-sm rounded-lg px-3 py-2 resize-none focus:outline-none ${
              isDark
                ? "bg-gray-900 border border-gray-700 text-white placeholder:text-gray-500 focus:border-blue-500"
                : "border border-gray-200 focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            }`}
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="mt-2 w-full text-sm font-medium rounded-lg px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
}
