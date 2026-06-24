import { useEffect, useState, useRef, useMemo } from "react";
import LessonContent from "../lesson/LessonContent";
import {
  listLibrary,
  getLibraryLesson,
  markLibraryComplete,
  unmarkLibraryComplete,
  getNotes,
  createNote,
  updateNote,
  deleteNote,
  listCerts,
  getCert,
} from "../../api/library";

const CANVAS_URL = import.meta.env.VITE_CANVAS_URL ?? "http://localhost:3000";

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

const LEVEL_LABELS = {
  foundational: "Foundational",
  associate:    "Associate",
  professional: "Professional",
  specialty:    "Specialty",
};
const LEVEL_ORDER = ["foundational", "associate", "professional", "specialty"];

const EMPHASIS = {
  core:       { label: "Core",       cls: "bg-blue-100 text-blue-700" },
  supporting: { label: "Supporting", cls: "bg-slate-100 text-slate-600" },
  skim:       { label: "Skim",       cls: "bg-gray-100 text-gray-400" },
};

// Resolve a manifest lesson ref ("module-04-iam/03-policies.md") to a loaded
// library lesson via its slug ("<course>/module-04-iam/03-policies").
function lessonSlugForRef(course, ref) {
  return `${course}/${ref.replace(/\.md$/, "")}`;
}

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

export function LibraryLessonReader({
  lesson: summary,
  onComplete,
  onClose,
  currentUserRole,
  relatedLessons = [],
  onSelectRelated,
}) {
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
              <LessonContent
                content={lesson.content}
                storageKey={`library-${lesson.id}`}
              />
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
          <LessonContent
            content={lesson.content}
            storageKey={`library-${lesson.id}`}
          />
        )}

        {relatedLessons.length > 0 && onSelectRelated && (
          <div className="border-t border-gray-100 mt-6 pt-5">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Related service lessons
            </div>
            <div className="flex flex-wrap gap-2">
              {relatedLessons.map((s) => (
                <button
                  key={s.id}
                  onClick={() => onSelectRelated(s)}
                  className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                >
                  <span>🧩</span>
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">
              Deep-dive references for the AWS services covered in this lesson.
            </p>
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

// ── Cert track sidebar ────────────────────────────────────────────────────────

/**
 * Renders a certification as a domain-weighted study plan: domains ordered by
 * the official blueprint, each showing its exam weight and per-domain progress,
 * lessons tagged with core/supporting/skim emphasis, plus a gaps section for
 * cert-specific content that isn't authored yet.
 */
function CertTrackView({ manifest, course, lessonsBySlug, selected, onSelect }) {
  const { cert, exam, domains = [], cert_specific_lessons = [], coverage } = manifest;

  // Resolve every domain's lesson refs to loaded lessons (skipping unresolved,
  // e.g. cert-specific refs that aren't seeded yet), and compute progress.
  const resolvedDomains = useMemo(() => {
    return domains.map((d) => {
      const tasks = (d.tasks || []).map((t) => {
        const lessons = (t.lessons || [])
          .map((ref) => {
            const lesson = lessonsBySlug.get(lessonSlugForRef(course, ref.ref));
            return lesson ? { ...lesson, emphasis: ref.emphasis, note: ref.note } : null;
          })
          .filter(Boolean);
        return { ...t, lessons };
      });
      const all = tasks.flatMap((t) => t.lessons);
      const total = all.length;
      const done = all.filter((l) => l.completed).length;
      return { ...d, tasks, total, done };
    });
  }, [domains, lessonsBySlug, course]);

  const totals = resolvedDomains.reduce(
    (acc, d) => ({ total: acc.total + d.total, done: acc.done + d.done }),
    { total: 0, done: 0 }
  );
  const pct = totals.total === 0 ? 0 : Math.round((totals.done / totals.total) * 100);
  const gaps = cert_specific_lessons.filter((g) => g.status !== "published");

  // Published cert-specific lessons that aren't placed under a specific domain
  // (cross-domain capstones, e.g. scenario drills, exam strategy).
  const capstone = useMemo(() => {
    const referenced = new Set();
    for (const d of domains)
      for (const t of d.tasks || [])
        for (const ls of t.lessons || []) referenced.add(ls.ref);
    return cert_specific_lessons
      .filter((g) => g.status === "published" && !referenced.has(g.file))
      .map((g) => lessonsBySlug.get(lessonSlugForRef(course, g.file)))
      .filter(Boolean);
  }, [domains, cert_specific_lessons, lessonsBySlug, course]);

  // Placeholder certs have no authored blueprint yet.
  if (!resolvedDomains.length) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-3 pb-4 border-b border-gray-100">
          <div className="flex items-baseline justify-between mb-1">
            <h2 className="font-bold text-gray-900 text-sm leading-tight">
              {cert.short_name || cert.name}
            </h2>
            <span className="text-[11px] font-mono text-gray-400">{cert.code}</span>
          </div>
          {exam && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400 mt-1">
              {exam.duration_minutes != null && <span>{exam.duration_minutes} min</span>}
              {exam.passing_score != null && <span>pass ≥ {exam.passing_score}</span>}
              {exam.cost_usd != null && <span>${exam.cost_usd}</span>}
            </div>
          )}
        </div>
        <div className="px-4 py-10 text-center">
          <div className="text-3xl mb-2">🚧</div>
          <div className="text-sm font-medium text-gray-600">Curriculum coming soon</div>
          <div className="text-xs text-gray-400 mt-1 max-w-[15rem] mx-auto">
            This certification track is mapped to the {cert.level} blueprint next.
            Meanwhile, the Full Learning Path covers the foundational material.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Exam header */}
      <div className="px-4 pt-3 pb-4 border-b border-gray-100">
        <div className="flex items-baseline justify-between mb-1">
          <h2 className="font-bold text-gray-900 text-sm leading-tight">
            {cert.short_name || cert.name}
          </h2>
          <span className="text-[11px] font-mono text-gray-400">{cert.code}</span>
        </div>

        {/* Exam-readiness bar */}
        <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
          <span>Exam readiness</span>
          <span>{totals.done}/{totals.total} lessons · {pct}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full mb-3">
          <div
            className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : "bg-blue-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Exam facts */}
        {exam && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-400">
            {exam.scored_questions != null && <span>{exam.scored_questions} scored Qs</span>}
            {exam.duration_minutes != null && <span>{exam.duration_minutes} min</span>}
            {exam.passing_score != null && <span>pass ≥ {exam.passing_score}</span>}
          </div>
        )}
        {cert.status === "retiring" && cert.retires_on && (
          <div className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
            Retiring — last test day {cert.retires_on}
          </div>
        )}
      </div>

      {/* Domains */}
      {resolvedDomains.map((d) => {
        const dpct = d.total === 0 ? 0 : Math.round((d.done / d.total) * 100);
        return (
          <div key={d.id} className="border-b border-gray-50">
            <div className="px-4 pt-3 pb-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">{d.title}</span>
                <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded px-1.5 py-0.5">
                  {d.weight}%
                </span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full">
                <div
                  className="h-full bg-indigo-400 rounded-full transition-all"
                  style={{ width: `${dpct}%` }}
                />
              </div>
            </div>

            {d.tasks.map((t) => (
              <div key={t.id} className="pb-1">
                <div className="px-4 py-1 text-[11px] text-gray-400">
                  {t.id} · {t.title}
                </div>
                {t.lessons.map((l) => {
                  const emp = EMPHASIS[l.emphasis] || EMPHASIS.supporting;
                  return (
                    <button
                      key={`${t.id}-${l.id}`}
                      onClick={() => onSelect(l)}
                      title={l.note || ""}
                      className={`w-full flex items-start gap-2.5 pl-5 pr-4 py-2 text-left transition-colors ${
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
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${emp.cls}`}>
                            {emp.label}
                          </span>
                          <span className="text-[11px] text-gray-400">
                            {l.lesson_type === "canvas" ? "Lab" : `${l.estimated_minutes}m`}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}

      {/* Capstone / cross-domain lessons */}
      {capstone.length > 0 && (
        <div className="border-b border-gray-50">
          <div className="px-4 pt-3 pb-2 text-xs font-semibold text-gray-700">
            Capstone & Exam Prep
          </div>
          {capstone.map((l) => (
            <button
              key={l.id}
              onClick={() => onSelect(l)}
              className={`w-full flex items-start gap-2.5 pl-5 pr-4 py-2 text-left transition-colors ${
                selected?.id === l.id
                  ? "bg-blue-50 border-l-2 border-blue-500"
                  : "hover:bg-gray-50 border-l-2 border-transparent"
              }`}
            >
              <span className="text-sm flex-shrink-0 mt-0.5">
                {l.completed ? "✅" : "🎯"}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm truncate ${selected?.id === l.id ? "font-medium text-blue-700" : "text-gray-800"}`}>
                  {l.title}
                </div>
                <div className="text-[11px] text-gray-400 mt-0.5">
                  {l.lesson_type === "canvas" ? "Lab" : `${l.estimated_minutes}m`}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Gaps / coming-soon cert-specific content */}
      {gaps.length > 0 && (
        <div className="px-4 py-3">
          <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Cert-specific content (coming soon)
          </div>
          {gaps.map((g) => (
            <div key={g.file} className="mb-2 rounded-lg border border-dashed border-gray-200 px-3 py-2">
              <div className="text-sm text-gray-500">{g.title}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                covers {g.covers_tasks?.join(", ")} · {g.status}
              </div>
            </div>
          ))}
        </div>
      )}

      {coverage?.gaps?.length > 0 && (
        <div className="px-4 pb-5 text-[11px] text-gray-400">
          {coverage.gaps.length} known coverage gap{coverage.gaps.length === 1 ? "" : "s"} tracked for this exam.
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function StudentLibraryBrowser() {
  // Optional deep-link: /course-library?provider=aws&cert=SAA-C03
  const initialParams =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const firstProviderRun = useRef(true);

  const [provider, setProvider] = useState(initialParams?.get("provider") || "aws");
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [filterDifficulty, setFilterDifficulty] = useState("all");

  // Track = "general" (full learning path) or a cert code (e.g. "SAA-C03").
  const [track, setTrack] = useState(initialParams?.get("cert") || "general");
  const [certs, setCerts] = useState([]);
  const [manifest, setManifest] = useState(null);
  const [loadingManifest, setLoadingManifest] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState("student");
  useEffect(() => {
    try {
      const raw = localStorage.getItem("archon-academy-auth");
      const role = JSON.parse(raw)?.state?.user?.role ?? "student";
      setCurrentUserRole(role);
    } catch {}
  }, []);

  // Reload lessons + available cert tracks whenever provider changes.
  useEffect(() => {
    setLoading(true);
    setSelected(null);
    setSearch("");
    setFilterDifficulty("all");
    // Preserve a deep-linked cert on first mount; reset to general on later provider switches.
    if (firstProviderRun.current) {
      firstProviderRun.current = false;
    } else {
      setTrack("general");
    }
    setManifest(null);
    listLibrary(provider)
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
    listCerts(provider)
      .then(setCerts)
      .catch(() => setCerts([]));
  }, [provider]);

  // Load the manifest when a cert track is selected.
  useEffect(() => {
    if (track === "general") {
      setManifest(null);
      return;
    }
    setLoadingManifest(true);
    setSelected(null);
    getCert(provider, track)
      .then(setManifest)
      .catch(() => setManifest(null))
      .finally(() => setLoadingManifest(false));
  }, [track, provider]);

  function handleComplete(lessonId, completed) {
    setLessons((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, completed } : l))
    );
  }

  // Slug -> lesson map for resolving manifest refs (cert track view).
  const lessonsBySlug = useMemo(() => {
    const m = new Map();
    for (const l of lessons) m.set(l.slug, l);
    return m;
  }, [lessons]);

  const certsByLevel = useMemo(() => {
    const groups = {};
    for (const c of certs) (groups[c.level] ||= []).push(c);
    return groups;
  }, [certs]);

  const difficulties = ["beginner", "intermediate", "advanced", "expert"];

  // Cert-specific lessons (slug "<course>/certs/...") and shared service-reference
  // lessons (slug "<course>/services/...") belong to cert tracks / the Services
  // view, not the general Full Learning Path.
  const certPrefix = `${provider}/certs/`;
  const servicePrefix = `${provider}/services/`;
  const generalLessons = lessons.filter(
    (l) => !l.slug.startsWith(certPrefix) && !l.slug.startsWith(servicePrefix)
  );

  // Map a selected cert lesson (by slug) to its resolved related service lessons,
  // from the manifest's related_service_lessons. Drives the reader's panel.
  const relatedBySlug = useMemo(() => {
    const m = new Map();
    const rel = manifest?.related_service_lessons || {};
    for (const [certRef, svcRefs] of Object.entries(rel)) {
      const certSlug = lessonSlugForRef(provider, certRef);
      const svc = (svcRefs || [])
        .map((r) => lessonsBySlug.get(lessonSlugForRef(provider, r)))
        .filter(Boolean);
      if (svc.length) m.set(certSlug, svc);
    }
    return m;
  }, [manifest, lessonsBySlug, provider]);
  const relatedForSelected = selected ? relatedBySlug.get(selected.slug) || [] : [];

  const filtered = generalLessons.filter((l) => {
    const matchSearch =
      !search ||
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.module_title.toLowerCase().includes(search.toLowerCase());
    const matchDiff = filterDifficulty === "all" || l.difficulty_level === filterDifficulty;
    return matchSearch && matchDiff;
  });

  // Group by module
  const grouped = filtered.reduce((acc, l) => {
    const key = `${l.module_order}|${l.module_slug}`;
    if (!acc[key]) acc[key] = { title: l.module_title, order: l.module_order, lessons: [] };
    acc[key].lessons.push(l);
    return acc;
  }, {});
  const groups = Object.values(grouped).sort((a, b) => a.order - b.order);

  const completedCount = generalLessons.filter((l) => l.completed).length;
  const generalCount = generalLessons.length;
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

        {/* Track selector: Full Path vs. a certification */}
        <div className="px-4 pt-3 pb-3 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Track</div>
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-blue-400"
          >
            <option value="general">📚 Full Learning Path</option>
            {LEVEL_ORDER.filter((lvl) => certsByLevel[lvl]?.length).map((lvl) => (
              <optgroup key={lvl} label={LEVEL_LABELS[lvl]}>
                {certsByLevel[lvl].map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.short_name || c.name} ({c.code})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {track === "general" && certs.length === 0 && (
            <div className="mt-2 text-[11px] text-gray-400">
              Certification tracks coming soon for {activeProvider?.label}.
            </div>
          )}
        </div>

        {track === "general" ? (
          <>
            {/* Progress header */}
            <div className="px-4 pt-3 pb-3 border-b border-gray-100">
              <div className="flex items-baseline justify-between mb-1">
                <h2 className="font-bold text-gray-900 text-base">
                  {activeProvider?.label} Library
                </h2>
                <span className="text-xs text-gray-400">{completedCount}/{generalCount} done</span>
              </div>
              <div className="h-1 bg-gray-100 rounded-full mb-3">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${generalCount === 0 ? 0 : Math.round((completedCount / generalCount) * 100)}%` }}
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
            </div>

            {/* Lesson list (module-grouped) */}
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
          </>
        ) : loadingManifest ? (
          <div className="flex-1 text-xs text-gray-400 text-center py-8">Loading exam plan…</div>
        ) : manifest ? (
          <CertTrackView
            manifest={manifest}
            course={provider}
            lessonsBySlug={lessonsBySlug}
            selected={selected}
            onSelect={setSelected}
          />
        ) : (
          <div className="flex-1 text-xs text-gray-400 text-center py-8">
            Couldn’t load this exam plan.
          </div>
        )}
      </div>

      {/* Reader pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selected ? (
          <LibraryLessonReader
            lesson={selected}
            onComplete={handleComplete}
            onClose={() => setSelected(null)}
            currentUserRole={currentUserRole}
            relatedLessons={relatedForSelected}
            onSelectRelated={setSelected}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="text-4xl">{activeProvider?.icon ?? "📚"}</div>
            <div className="font-semibold text-gray-900">{activeProvider?.label} Library</div>
            <div className="text-sm text-gray-500 max-w-sm">
              {generalCount} lessons across {activeProvider?.emptyLabel}.
              Select a lesson from the sidebar to start reading.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
