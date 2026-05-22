import { useEffect, useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  listLibrary,
  getLibraryLesson,
  markLibraryComplete,
  unmarkLibraryComplete,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
} from "../../api/library";

const CANVAS_URL = import.meta.env.VITE_CANVAS_URL ?? "http://localhost:3000";

const PROSE_CLASSES =
  "prose prose-sm max-w-none " +
  "prose-headings:font-semibold prose-headings:text-gray-900 " +
  "prose-p:text-gray-700 prose-p:leading-relaxed " +
  "prose-a:text-blue-600 prose-li:text-gray-700 " +
  "prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:py-0.5 " +
  "prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-4 " +
  "prose-blockquote:border-l-blue-400 prose-blockquote:text-gray-600";

const DIFFICULTY_COLORS = {
  beginner:     "bg-green-100 text-green-700",
  intermediate: "bg-blue-100 text-blue-700",
  advanced:     "bg-orange-100 text-orange-700",
  expert:       "bg-red-100 text-red-700",
};

const PROVIDERS = [
  {
    id: "aws",
    label: "AWS",
    icon: "☁️",
    color: "bg-orange-500 text-white border-orange-500",
    colorInactive: "bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600",
    emptyLabel: "25 modules",
  },
  {
    id: "azure",
    label: "Azure",
    icon: "🔷",
    color: "bg-blue-600 text-white border-blue-600",
    colorInactive: "bg-white text-gray-600 border-gray-200 hover:border-blue-400 hover:text-blue-600",
    emptyLabel: "12 modules",
  },
  {
    id: "gcp",
    label: "GCP",
    icon: "🔴",
    color: "bg-red-500 text-white border-red-500",
    colorInactive: "bg-white text-gray-600 border-gray-200 hover:border-red-400 hover:text-red-500",
    emptyLabel: "10 modules",
  },
];

// ── Notes panel ───────────────────────────────────────────────────────────────

function NotesPanel({ libraryLessonId, currentUserRole }) {
  const [notes, setNotes] = useState([]);
  const [myNote, setMyNote] = useState(null);
  const [draft, setDraft] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef(null);

  useEffect(() => {
    if (!libraryLessonId) return;
    getNotes({ libraryLessonId })
      .then((data) => {
        setNotes(data);
        const raw = localStorage.getItem("archon-academy-auth");
        const userId = raw ? JSON.parse(raw)?.state?.user?.id : null;
        const mine = data.find((n) => n.user_id === userId);
        if (mine) {
          setMyNote(mine);
          setDraft(mine.content);
          setIsVisible(mine.is_visible);
        } else {
          setMyNote(null);
          setDraft("");
          setIsVisible(false);
        }
      })
      .catch(() => {});
  }, [libraryLessonId]);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(handleSave, 1500);
    return () => clearTimeout(saveTimer.current);
  }, [draft, isVisible]);

  async function handleSave() {
    if (!draft.trim()) return;
    setSaving(true);
    try {
      if (myNote) {
        const updated = await updateNote(myNote.id, { content: draft, is_visible: isVisible });
        setMyNote(updated);
      } else {
        const created = await createNote({ libraryLessonId, content: draft, is_visible: isVisible });
        setMyNote(created);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!myNote) return;
    await deleteNote(myNote.id);
    setMyNote(null);
    setDraft("");
    setNotes((n) => n.filter((x) => x.id !== myNote.id));
  }

  const instructorNotes = notes.filter(
    (n) => n.author_role === "instructor" && n.is_visible
  );

  return (
    <div className="border-t border-gray-100 mt-6 pt-5">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Notes</div>

      {instructorNotes.map((n) => (
        <div key={n.id} className="mb-3 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <div className="text-xs font-semibold text-amber-700 mb-1">
            📌 Instructor Note — {n.author_name}
          </div>
          <div className="text-sm text-amber-900 whitespace-pre-wrap">{n.content}</div>
        </div>
      ))}

      <div className="rounded-lg border border-gray-200 overflow-hidden">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add your private notes here…"
          rows={4}
          className="w-full text-sm text-gray-800 p-3 resize-none focus:outline-none focus:ring-1 focus:ring-blue-200"
        />
        <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-100">
          <div className="flex items-center gap-2">
            {currentUserRole === "instructor" && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isVisible}
                  onChange={(e) => setIsVisible(e.target.checked)}
                  className="accent-blue-600"
                />
                Visible to students
              </label>
            )}
          </div>
          <div className="flex items-center gap-2">
            {myNote && (
              <button
                onClick={handleDelete}
                className="text-xs text-red-400 hover:text-red-600"
              >
                Delete
              </button>
            )}
            <span className="text-xs text-gray-400">
              {saving ? "Saving…" : myNote ? "✓ Saved" : ""}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Lesson reader ─────────────────────────────────────────────────────────────

function LibraryLessonReader({ lesson: summary, onComplete, onClose, currentUserRole }) {
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    getLibraryLesson(summary.id)
      .then(setLesson)
      .catch(() => setLesson(null))
      .finally(() => setLoading(false));
  }, [summary.id]);

  async function handleToggleComplete() {
    if (!lesson) return;
    setCompleting(true);
    try {
      if (lesson.completed) {
        await unmarkLibraryComplete(lesson.id);
        setLesson((l) => ({ ...l, completed: false }));
        onComplete(lesson.id, false);
      } else {
        await markLibraryComplete(lesson.id);
        setLesson((l) => ({ ...l, completed: true }));
        onComplete(lesson.id, true);
      }
    } finally {
      setCompleting(false);
    }
  }

  function openCanvas() {
    if (!lesson) return;
    if (lesson.canvas_template) {
      const encoded = btoa(JSON.stringify(lesson.canvas_template));
      window.open(`${CANVAS_URL}?seed=${encoded}`, "_blank", "noopener,noreferrer");
    } else {
      window.open(CANVAS_URL, "_blank", "noopener,noreferrer");
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Loading…
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Lesson not found.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{lesson.module_title}</span>
            <span>·</span>
            <span>{lesson.lesson_type === "canvas" ? "🖼 Canvas Lab" : `📖 ${lesson.estimated_minutes} min`}</span>
            {lesson.completed && (
              <>
                <span>·</span>
                <span className="text-green-600">✓ Completed</span>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕ Close
          </button>
        </div>
        <h1 className="text-xl font-bold text-gray-900">{lesson.title}</h1>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {lesson.lesson_type === "canvas" ? (
          <div className="flex flex-col gap-6">
            {lesson.content && (
              <div className={PROSE_CLASSES}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
              </div>
            )}
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center text-3xl">🖼</div>
              <div>
                <div className="font-semibold text-gray-900">Open Archon Canvas</div>
                <div className="text-sm text-gray-500 mt-1 max-w-sm">
                  {lesson.canvas_template
                    ? "A starter architecture will be pre-loaded for this lab."
                    : "Start from a blank canvas and build the architecture described above."}
                </div>
              </div>
              <button
                onClick={openCanvas}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Open in Archon
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </button>
              <div className="text-xs text-gray-400">Opens in a new tab.</div>
            </div>
          </div>
        ) : (
          <div className={PROSE_CLASSES}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{lesson.content}</ReactMarkdown>
          </div>
        )}

        <NotesPanel libraryLessonId={lesson.id} currentUserRole={currentUserRole} />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-8 py-4 flex-shrink-0">
        <button
          onClick={handleToggleComplete}
          disabled={completing}
          className={`w-full text-sm font-medium py-2 rounded-lg transition-colors ${
            lesson.completed
              ? "bg-green-50 text-green-700 border border-green-200 hover:bg-green-100"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {completing ? "…" : lesson.completed ? "✓ Mark as Incomplete" : "Mark as Complete"}
        </button>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudentLibraryBrowser() {
  const [provider, setProvider] = useState("aws");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterCert, setFilterCert] = useState("all");

  const [currentUserRole, setCurrentUserRole] = useState("student");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("archon-academy-auth");
      const role = JSON.parse(raw)?.state?.user?.role ?? "student";
      setCurrentUserRole(role);
    } catch {}
  }, []);

  // Reload lessons whenever provider changes
  useEffect(() => {
    setLoading(true);
    setSelected(null);
    setSearch("");
    setFilterDifficulty("all");
    setFilterCert("all");
    listLibrary(provider)
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, [provider]);

  function handleComplete(lessonId, completed) {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, completed } : l))
    );
  }

  const allCerts = [...new Set(lessons.flatMap((l) => l.certification_tags))].sort();
  const difficulties = ["beginner", "intermediate", "advanced", "expert"];

  const filtered = lessons.filter((l) => {
    const matchSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.module_title.toLowerCase().includes(search.toLowerCase());
    const matchDiff = filterDifficulty === "all" || l.difficulty_level === filterDifficulty;
    const matchCert = filterCert === "all" || l.certification_tags.includes(filterCert);
    return matchSearch && matchDiff && matchCert;
  });

  // Group by module
  const grouped = filtered.reduce((acc, l) => {
    const key = `${l.module_order}|${l.module_slug}`;
    if (!acc[key]) acc[key] = { title: l.module_title, order: l.module_order, lessons: [] };
    acc[key].lessons.push(l);
    return acc;
  }, {});
  const groups = Object.values(grouped).sort((a, b) => a.order - b.order);

  const completedCount = lessons.filter((l) => l.completed).length;
  const activeProvider = PROVIDERS.find((p) => p.id === provider);

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-6 -my-4">
      {/* Sidebar */}
      <div className="w-72 xl:w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">

        {/* Provider selector */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cloud Provider</div>
          <div className="flex gap-1.5">
            {PROVIDERS.map((p) => (
              <button
                key={p.id}
                onClick={() => setProvider(p.id)}
                className={`flex-1 flex items-center justify-center gap-1 text-xs font-semibold px-2 py-1.5 rounded-lg border transition-all ${
                  provider === p.id ? p.color : p.colorInactive
                }`}
              >
                <span>{p.icon}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Progress header */}
        <div className="px-4 pt-3 pb-3 border-b border-gray-100">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-bold text-gray-900 text-base">
              {activeProvider?.label} Library
            </h2>
            <span className="text-xs text-gray-400">{completedCount}/{lessons.length} done</span>
          </div>
          <div className="h-1 bg-gray-100 rounded-full mb-3">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{ width: `${lessons.length === 0 ? 0 : Math.round((completedCount / lessons.length) * 100)}%` }}
            />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search lessons…"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
          />
        </div>

        {/* Filters */}
        <div className="px-4 py-2 border-b border-gray-100 flex gap-2 overflow-x-auto">
          <select
            value={filterDifficulty}
            onChange={(e) => setFilterDifficulty(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none flex-shrink-0"
          >
            <option value="all">All levels</option>
            {difficulties.map((d) => (
              <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
            ))}
          </select>
          <select
            value={filterCert}
            onChange={(e) => setFilterCert(e.target.value)}
            className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none flex-shrink-0"
          >
            <option value="all">All certs</option>
            {allCerts.map((c) => (
              <option key={c} value={c}>{c.toUpperCase().replace("_", " ")}</option>
            ))}
          </select>
        </div>

        {/* Lesson list */}
        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="text-xs text-gray-400 text-center py-8">Loading…</div>
          ) : groups.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-8">No lessons match your filters.</div>
          ) : (
            groups.map((group) => (
              <div key={group.title} className="mb-1">
                <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide sticky top-0 bg-white">
                  {group.title}
                </div>
                {group.lessons.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelected(l)}
                    className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors ${
                      selected?.id === l.id
                        ? "bg-blue-50 border-l-2 border-blue-500"
                        : "hover:bg-gray-50 border-l-2 border-transparent"
                    }`}
                  >
                    <span className="text-sm flex-shrink-0 mt-0.5">
                      {l.completed ? "✅" : l.lesson_type === "canvas" ? "🖼" : "📖"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm truncate ${selected?.id === l.id ? "font-medium text-blue-700" : "text-gray-800"}`}>
                        {l.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[l.difficulty_level] ?? "bg-gray-100 text-gray-500"}`}>
                          {l.difficulty_level}
                        </span>
                        <span className="text-xs text-gray-400">
                          {l.lesson_type === "canvas" ? "Lab" : `${l.estimated_minutes}m`}
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reader pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selected ? (
          <LibraryLessonReader
            lesson={selected}
            onComplete={handleComplete}
            onClose={() => setSelected(null)}
            currentUserRole={currentUserRole}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="text-4xl">{activeProvider?.icon ?? "📚"}</div>
            <div className="font-semibold text-gray-900">{activeProvider?.label} Library</div>
            <div className="text-sm text-gray-500 max-w-sm">
              {lessons.length} lessons across {activeProvider?.emptyLabel}.
              Select a lesson from the sidebar to start reading.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
