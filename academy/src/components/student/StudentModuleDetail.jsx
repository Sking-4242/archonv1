import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { getModule } from "../../api/modules";
import { getLesson, markLessonComplete, unmarkLessonComplete } from "../../api/lessons";
import {
  getModuleLibraryLinks,
  getLibraryLesson,
  markLibraryComplete,
  unmarkLibraryComplete,
  getNotes,
  createNote,
  updateNote,
} from "../../api/library";
import useAccessStore from "../../store/accessStore";
import UpgradePrompt from "../ui/UpgradePrompt";
import TutorPanel from "../tutor/TutorPanel";
import { canAccessModule } from "../../utils/tierGates";

const CANVAS_URL = import.meta.env.VITE_CANVAS_URL ?? "http://localhost:3000";

// ── Markdown prose styles ─────────────────────────────────────────────────────

const PROSE_CLASSES =
  "prose prose-sm max-w-none " +
  "prose-headings:font-semibold prose-headings:text-gray-900 " +
  "prose-p:text-gray-700 prose-p:leading-relaxed " +
  "prose-a:text-blue-600 prose-li:text-gray-700 " +
  "prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 " +
  "prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 " +
  "prose-blockquote:border-l-blue-400 prose-blockquote:text-gray-600";

function LessonWithTutor({ children, contextType, lessonTitle, lessonContent, moduleTitle }) {
  return (
    <div className="flex-1 flex min-h-0">
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">{children}</div>
      <TutorPanel
        contextType={contextType}
        lessonTitle={lessonTitle}
        lessonContent={lessonContent}
        moduleTitle={moduleTitle}
      />
    </div>
  );
}

// ── Sidebar item ──────────────────────────────────────────────────────────────

function SidebarItem({ item, isActive, onClick }) {
  let icon = "📋";
  let subtitle = "Assignment";

  if (item.type === "lesson") {
    if (item.completed) icon = "✅";
    else if (item.lesson_type === "canvas") icon = "🖼";
    else icon = "📖";
    subtitle = item.lesson_type === "canvas" ? "Canvas Lab" : `${item.estimated_minutes} min read`;
  } else if (item.type === "library") {
    if (item.completed) icon = "✅";
    else if (item.lesson_type === "canvas") icon = "🖼";
    else icon = "📚";
    subtitle = `Library · ${item.lesson_type === "canvas" ? "Canvas Lab" : `${item.estimated_minutes} min`}`;
  }

  return (
    <button
      onClick={() => onClick(item)}
      className={`w-full flex items-start gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors ${
        isActive
          ? "bg-blue-50 border border-blue-200"
          : "hover:bg-gray-50 border border-transparent"
      }`}
    >
      <span className="text-sm flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${isActive ? "font-medium text-blue-700" : "text-gray-800"}`}>
          {item.type === "library" ? item.lesson_title : item.title}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">{subtitle}</div>
      </div>
    </button>
  );
}

// ── Student notes panel ───────────────────────────────────────────────────────

function NotesPanel({ libraryLessonId }) {
  const [notes, setNotes]       = useState([]);
  const [instrNote, setInstrNote] = useState(null);
  const [draft, setDraft]       = useState("");
  const [saving, setSaving]     = useState(false);
  const [editId, setEditId]     = useState(null);
  const [editText, setEditText] = useState("");
  const saveTimer = useRef(null);

  useEffect(() => {
    getNotes({ libraryLessonId })
      .then((data) => {
        const mine  = data.filter((n) => !n.is_instructor_note);
        const instr = data.find((n) => n.is_instructor_note) ?? null;
        setNotes(mine);
        setInstrNote(instr);
      })
      .catch(() => {});
  }, [libraryLessonId]);

  async function handleCreate() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      const note = await createNote({ libraryLessonId, content: draft.trim() });
      setNotes((prev) => [...prev, note]);
      setDraft("");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(note) {
    setEditId(note.id);
    setEditText(note.content);
  }

  async function saveEdit() {
    if (!editId) return;
    setSaving(true);
    try {
      const updated = await updateNote(editId, { content: editText });
      setNotes((prev) => prev.map((n) => (n.id === editId ? updated : n)));
      setEditId(null);
      setEditText("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {/* Instructor note */}
      {instrNote && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
            Instructor Note
          </div>
          <p className="text-sm text-amber-900 whitespace-pre-wrap">{instrNote.content}</p>
        </div>
      )}

      {/* Private student notes */}
      <div>
        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
          My Notes (private)
        </div>
        {notes.map((note) =>
          editId === note.id ? (
            <div key={note.id} className="mb-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-blue-400 resize-none"
              />
              <div className="flex gap-2 mt-1">
                <button
                  onClick={saveEdit}
                  disabled={saving}
                  className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditId(null); setEditText(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div key={note.id} className="group bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 mb-2 flex gap-2">
              <p className="flex-1 text-sm text-gray-700 whitespace-pre-wrap">{note.content}</p>
              <button
                onClick={() => startEdit(note)}
                className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:text-blue-700 flex-shrink-0 transition-all"
              >
                Edit
              </button>
            </div>
          )
        )}

        <div className="mt-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            placeholder="Add a private note..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none"
          />
          <button
            onClick={handleCreate}
            disabled={!draft.trim() || saving}
            className="mt-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded transition-colors disabled:opacity-40"
          >
            {saving ? "Saving..." : "Add Note"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Library lesson pane ───────────────────────────────────────────────────────

function LibraryLessonPane({ link, onComplete, moduleTitle }) {
  const [lesson,     setLesson]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [completing, setCompleting] = useState(false);
  const [completed,  setCompleted]  = useState(link.completed ?? false);

  useEffect(() => {
    setLoading(true);
    setCompleted(link.completed ?? false);
    getLibraryLesson(link.library_lesson_id)
      .then(setLesson)
      .catch(() => setLesson(null))
      .finally(() => setLoading(false));
  }, [link.id, link.library_lesson_id]);

  function openInCanvas() {
    if (!lesson) return;
    if (lesson.canvas_template) {
      const encoded = btoa(JSON.stringify(lesson.canvas_template));
      window.open(`${CANVAS_URL}?seed=${encoded}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(CANVAS_URL, "_blank", "noopener,noreferrer");
    }
  }

  async function handleToggleComplete() {
    setCompleting(true);
    try {
      if (completed) {
        await unmarkLibraryComplete(link.library_lesson_id);
        setCompleted(false);
        onComplete(link.id, false);
      } else {
        await markLibraryComplete(link.library_lesson_id);
        setCompleted(true);
        onComplete(link.id, true);
      }
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Library lesson not found.
      </div>
    );
  }

  const isCanvas = lesson.lesson_type === "canvas";

  return (
    <LessonWithTutor
      contextType={isCanvas ? "lab" : "lesson"}
      lessonTitle={lesson.title}
      lessonContent={lesson.content}
      moduleTitle={moduleTitle || lesson.module_title}
    >
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>{isCanvas ? "🖼 Canvas Lab" : "📚 Library Lesson"}</span>
          <span>·</span>
          <span>{lesson.estimated_minutes} min</span>
          {completed && (
            <>
              <span>·</span>
              <span className="text-green-600">✓ Completed</span>
            </>
          )}
          <span>·</span>
          <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-xs">Archon Library</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
        {lesson.module_title && (
          <div className="text-sm text-gray-400 mt-0.5">from {lesson.module_title}</div>
        )}
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* Instructor module-specific note */}
        {link.instructor_note_visible && link.instructor_note && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">
              Instructor Note
            </div>
            <p className="text-sm text-amber-900 whitespace-pre-wrap">{link.instructor_note}</p>
          </div>
        )}

        {/* Content or canvas */}
        {isCanvas ? (
          <div className="flex flex-col gap-6">
            {lesson.content && (
              <div className={PROSE_CLASSES}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
              </div>
            )}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-3xl">
                🖼
              </div>
              <div>
                <div className="font-semibold text-gray-900 text-base">Open Archon Canvas</div>
                <div className="text-sm text-gray-500 mt-1 max-w-sm">
                  {lesson.canvas_template
                    ? "A starter architecture will be pre-loaded. Build on top of it to complete the lab."
                    : "Start from a blank canvas and build the architecture described above."}
                </div>
              </div>
              <button
                onClick={openInCanvas}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Open in Archon
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
              <div className="text-xs text-gray-400">Opens in a new tab — keep this page open to track progress.</div>
            </div>
          </div>
        ) : lesson.content ? (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic">This lesson has no content yet.</div>
        )}

        {/* Notes */}
        <NotesPanel libraryLessonId={link.library_lesson_id} />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-8 py-4 flex-shrink-0">
        <button
          onClick={handleToggleComplete}
          disabled={completing}
          className={`w-full text-sm font-medium py-2 rounded-lg transition-colors ${
            completed
              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {completing ? "..." : completed ? "✓ Mark as Incomplete" : "Mark as Complete"}
        </button>
      </div>
    </div>
    </LessonWithTutor>
  );
}

// ── Canvas lab viewer ─────────────────────────────────────────────────────────

function CanvasLessonViewer({ lessonSummary, moduleId, allItems, onComplete, moduleTitle }) {
  const navigate = useNavigate();
  const [lesson,     setLesson]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLesson(lessonSummary.id)
      .then(setLesson)
      .catch(() => setLesson(null))
      .finally(() => setLoading(false));
  }, [lessonSummary.id]);

  const lessonItems = allItems.filter((i) => i.type === "lesson");
  const currentIdx  = lessonItems.findIndex((i) => i.id === lessonSummary.id);
  const prevLesson  = currentIdx > 0 ? lessonItems[currentIdx - 1] : null;
  const nextLesson  = currentIdx < lessonItems.length - 1 ? lessonItems[currentIdx + 1] : null;

  function openInCanvas() {
    if (!lesson) return;
    if (lesson.canvas_template) {
      const encoded = btoa(JSON.stringify(lesson.canvas_template));
      window.open(`${CANVAS_URL}?seed=${encoded}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(CANVAS_URL, "_blank", "noopener,noreferrer");
    }
  }

  async function handleToggleComplete() {
    if (!lesson) return;
    setCompleting(true);
    try {
      if (lesson.completed) {
        await unmarkLessonComplete(lesson.id);
        setLesson((l) => ({ ...l, completed: false }));
        onComplete(lesson.id, false);
      } else {
        await markLessonComplete(lesson.id);
        setLesson((l) => ({ ...l, completed: true }));
        onComplete(lesson.id, true);
      }
    } finally {
      setCompleting(false);
    }
  }

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading...</div>;
  }
  if (!lesson) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Lesson not found.</div>;
  }

  return (
    <LessonWithTutor
      contextType="lab"
      lessonTitle={lesson.title}
      lessonContent={lesson.content}
      moduleTitle={moduleTitle}
    >
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>🖼 Canvas Lab {currentIdx + 1} of {lessonItems.length}</span>
          <span>·</span>
          <span>{lesson.estimated_minutes} min</span>
          {lesson.completed && <><span>·</span><span className="text-green-600">✓ Completed</span></>}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
        {lesson.content ? (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic">No challenge description yet.</div>
        )}

        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-3xl">🖼</div>
          <div>
            <div className="font-semibold text-gray-900 text-base">Open Archon Canvas</div>
            <div className="text-sm text-gray-500 mt-1 max-w-sm">
              {lesson.canvas_template
                ? "A starter architecture will be pre-loaded for you. Build on top of it to complete the lab."
                : "Start from a blank canvas and build the architecture described above."}
            </div>
          </div>
          <button
            onClick={openInCanvas}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
          >
            Open in Archon
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
              <polyline points="15 3 21 3 21 9" />
              <line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </button>
          <div className="text-xs text-gray-400">Opens in a new tab — keep this page open to track progress.</div>
        </div>
      </div>

      <div className="border-t border-gray-100 px-8 py-4 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => prevLesson && navigate(`/modules/${moduleId}?lesson=${prevLesson.id}`)}
          disabled={!prevLesson}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Previous
        </button>
        <button
          onClick={handleToggleComplete}
          disabled={completing}
          className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
            lesson.completed
              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {completing ? "..." : lesson.completed ? "✓ Mark as Incomplete" : "Mark as Complete"}
        </button>
        <button
          onClick={() => nextLesson && navigate(`/modules/${moduleId}?lesson=${nextLesson.id}`)}
          disabled={!nextLesson}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
    </LessonWithTutor>
  );
}

// ── Content lesson viewer ─────────────────────────────────────────────────────

function LessonViewer({ lessonSummary, moduleId, allItems, onComplete, moduleTitle }) {
  const navigate = useNavigate();
  const [lesson,     setLesson]     = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLesson(lessonSummary.id)
      .then(setLesson)
      .catch(() => setLesson(null))
      .finally(() => setLoading(false));
  }, [lessonSummary.id]);

  async function handleToggleComplete() {
    if (!lesson) return;
    setCompleting(true);
    try {
      if (lesson.completed) {
        await unmarkLessonComplete(lesson.id);
        setLesson((l) => ({ ...l, completed: false }));
        onComplete(lesson.id, false);
      } else {
        await markLessonComplete(lesson.id);
        setLesson((l) => ({ ...l, completed: true }));
        onComplete(lesson.id, true);
      }
    } finally {
      setCompleting(false);
    }
  }

  const lessonItems = allItems.filter((i) => i.type === "lesson");
  const currentIdx  = lessonItems.findIndex((i) => i.id === lessonSummary.id);
  const prevLesson  = currentIdx > 0 ? lessonItems[currentIdx - 1] : null;
  const nextLesson  = currentIdx < lessonItems.length - 1 ? lessonItems[currentIdx + 1] : null;

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Loading lesson...</div>;
  }
  if (!lesson) {
    return <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Lesson not found.</div>;
  }

  return (
    <LessonWithTutor
      contextType="lesson"
      lessonTitle={lesson.title}
      lessonContent={lesson.content}
      moduleTitle={moduleTitle}
    >
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
          <span>📖 Lesson {currentIdx + 1} of {lessonItems.length}</span>
          <span>·</span>
          <span>{lesson.estimated_minutes} min read</span>
          {lesson.completed && <><span>·</span><span className="text-green-600">✓ Completed</span></>}
        </div>
        <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {lesson.content ? (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
          </div>
        ) : (
          <div className="text-gray-400 text-sm italic">This lesson has no content yet.</div>
        )}
      </div>

      <div className="border-t border-gray-100 px-8 py-4 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={() => prevLesson && navigate(`/modules/${moduleId}?lesson=${prevLesson.id}`)}
          disabled={!prevLesson}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Previous
        </button>
        <button
          onClick={handleToggleComplete}
          disabled={completing}
          className={`flex-1 text-sm font-medium py-2 rounded-lg transition-colors ${
            lesson.completed
              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {completing ? "..." : lesson.completed ? "✓ Mark as Incomplete" : "Mark as Complete"}
        </button>
        <button
          onClick={() => nextLesson && navigate(`/modules/${moduleId}?lesson=${nextLesson.id}`)}
          disabled={!nextLesson}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
    </LessonWithTutor>
  );
}

// ── Assignment pane ───────────────────────────────────────────────────────────

function AssignmentPane({ item }) {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center text-3xl">📋</div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{item.title}</h2>
        <p className="text-sm text-gray-500 mt-1">This is an assignment linked to this module.</p>
      </div>
      <button
        onClick={() => navigate(`/assignment/${item.id}`)}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
      >
        Open Assignment
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudentModuleDetail() {
  const { moduleId } = useParams();
  const navigate     = useNavigate();
  const canUse = useAccessStore((s) => s.canUse);

  const [module,      setModule]      = useState(null);
  const [libLinks,    setLibLinks]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [activeItem,  setActiveItem]  = useState(null);

  const searchParams = new URLSearchParams(window.location.search);
  const urlLessonId  = searchParams.get("lesson") ? Number(searchParams.get("lesson")) : null;

  useEffect(() => {
    setLoading(true);
    Promise.all([getModule(moduleId), getModuleLibraryLinks(moduleId)])
      .then(([m, links]) => {
        setModule(m);
        setLibLinks(links);

        const lessonItems     = (m.lessons     || []).map((l) => ({ ...l, type: "lesson" }));
        const assignmentItems = (m.assignments || []).map((a) => ({ ...a, type: "assignment" }));
        const libraryItems    = links.map((lk) => ({ ...lk, type: "library" }));

        const combined = [
          ...lessonItems,
          ...libraryItems,
          ...assignmentItems,
        ].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

        const target = urlLessonId
          ? combined.find((i) => i.type === "lesson" && i.id === urlLessonId)
          : combined.find((i) => i.type === "lesson") ?? combined[0];

        setActiveItem(target ?? null);
      })
      .catch(() => setModule(null))
      .finally(() => setLoading(false));
  }, [moduleId]);

  function handleComplete(lessonId, completed) {
    setModule((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        lessons: prev.lessons.map((l) =>
          l.id === lessonId ? { ...l, completed } : l
        ),
        completed_lesson_count: prev.completed_lesson_count + (completed ? 1 : -1),
      };
    });
    // Refresh active item so the sidebar icon updates
    setActiveItem((prev) =>
      prev && prev.type === "lesson" && prev.id === lessonId
        ? { ...prev, completed }
        : prev
    );
  }

  function handleLibraryComplete(linkId, completed) {
    setLibLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, completed } : l)));
    setActiveItem((prev) =>
      prev && prev.type === "library" && prev.id === linkId
        ? { ...prev, completed }
        : prev
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
        Loading...
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center py-16">
        <div className="text-2xl mb-2">❌</div>
        <div className="text-sm text-gray-600">Module not found</div>
        <button onClick={() => navigate("/modules")} className="mt-3 text-sm text-blue-600">
          Back to Modules
        </button>
      </div>
    );
  }

  if (!canAccessModule(module, canUse)) {
    return (
      <div className="py-16">
        <UpgradePrompt feature="academy_all_certs" />
        <div className="text-center mt-4">
          <button onClick={() => navigate("/modules")} className="text-sm text-blue-600">
            Back to Modules
          </button>
        </div>
      </div>
    );
  }

  const lessonItems     = (module.lessons     || []).map((l) => ({ ...l, type: "lesson" }));
  const assignmentItems = (module.assignments || []).map((a) => ({ ...a, type: "assignment" }));
  const libraryItems    = libLinks.map((lk) => ({ ...lk, type: "library" }));
  const allItems        = [...lessonItems, ...libraryItems, ...assignmentItems].sort(
    (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)
  );

  const completedCount = (module.lessons || []).filter((l) => l.completed).length;
  const totalLessons   = (module.lessons || []).length;
  const pct            = totalLessons === 0 ? 0 : Math.round((completedCount / totalLessons) * 100);

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-6 -my-4">
      {/* Sidebar */}
      <div className="w-64 xl:w-72 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
        <div className="px-4 pt-5 pb-4 border-b border-gray-100">
          <button
            onClick={() => navigate("/modules")}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            All Modules
          </button>
          <h2 className="font-semibold text-gray-900 text-sm leading-snug">{module.title}</h2>
          {totalLessons > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{completedCount}/{totalLessons} lessons</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2">
          {allItems.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-6">No content yet</div>
          ) : (
            allItems.map((item) => (
              <SidebarItem
                key={`${item.type}-${item.id}`}
                item={item}
                isActive={activeItem?.type === item.type && activeItem?.id === item.id}
                onClick={setActiveItem}
              />
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {!activeItem ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a lesson or assignment from the sidebar
          </div>
        ) : activeItem.type === "library" ? (
          <LibraryLessonPane
            key={activeItem.id}
            link={activeItem}
            onComplete={handleLibraryComplete}
            moduleTitle={module.title}
          />
        ) : activeItem.type === "assignment" ? (
          <AssignmentPane item={activeItem} />
        ) : activeItem.lesson_type === "canvas" ? (
          <CanvasLessonViewer
            lessonSummary={activeItem}
            moduleId={moduleId}
            allItems={allItems}
            onComplete={handleComplete}
            moduleTitle={module.title}
          />
        ) : (
          <LessonViewer
            lessonSummary={activeItem}
            moduleId={moduleId}
            allItems={allItems}
            onComplete={handleComplete}
            moduleTitle={module.title}
          />
        )}
      </div>
    </div>
  );
}
