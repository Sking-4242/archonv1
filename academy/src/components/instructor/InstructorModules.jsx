import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useNavigate } from "react-router-dom";
import {
  listModules,
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  linkAssignment,
  unlinkAssignment,
  reorderLessons,
} from "../../api/modules";
import { deleteLesson, createLesson } from "../../api/lessons";
import {
  searchLibrary,
  linkLibraryLesson,
  unlinkLibraryLesson,
  updateLibraryLink,
} from "../../api/library";
import { listAssignments } from "../../api/assignments";

// ── Constants ─────────────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS = [
  { value: "beginner",     label: "Beginner",     color: "text-green-700 bg-green-50 border-green-200" },
  { value: "intermediate", label: "Intermediate", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { value: "advanced",     label: "Advanced",     color: "text-orange-700 bg-orange-50 border-orange-200" },
  { value: "expert",       label: "Expert",       color: "text-red-700 bg-red-50 border-red-200" },
];

const CERT_OPTIONS = [
  // AWS
  { value: "aws_ccp",  label: "AWS Cloud Practitioner" },
  { value: "aws_saa",  label: "AWS Solutions Architect – Associate" },
  { value: "aws_sap",  label: "AWS Solutions Architect – Professional" },
  { value: "aws_dva",  label: "AWS Developer – Associate" },
  { value: "aws_soa",  label: "AWS SysOps Administrator" },
  { value: "aws_dop",  label: "AWS DevOps Engineer – Professional" },
  { value: "aws_scs",  label: "AWS Security – Specialty" },
  { value: "aws_ans",  label: "AWS Advanced Networking – Specialty" },
  { value: "aws_dbs",  label: "AWS Database – Specialty" },
  { value: "aws_dea",  label: "AWS Data Engineer – Associate" },
  { value: "aws_mla",  label: "AWS Machine Learning – Associate" },
  { value: "aws_mls",  label: "AWS Machine Learning – Specialty" },
  // Azure
  { value: "az_900",   label: "Azure Fundamentals (AZ-900)" },
  { value: "az_104",   label: "Azure Administrator (AZ-104)" },
  { value: "az_204",   label: "Azure Developer (AZ-204)" },
  { value: "az_305",   label: "Azure Solutions Architect (AZ-305)" },
  { value: "az_400",   label: "Azure DevOps Engineer (AZ-400)" },
  { value: "az_500",   label: "Azure Security Engineer (AZ-500)" },
  { value: "az_700",   label: "Azure Network Engineer (AZ-700)" },
  { value: "dp_900",   label: "Azure Data Fundamentals (DP-900)" },
  { value: "dp_203",   label: "Azure Data Engineer (DP-203)" },
  { value: "dp_300",   label: "Azure Database Administrator (DP-300)" },
  // GCP
  { value: "gcp_cdl",  label: "GCP Cloud Digital Leader" },
  { value: "gcp_ace",  label: "GCP Associate Cloud Engineer" },
  { value: "gcp_pca",  label: "GCP Professional Cloud Architect" },
  { value: "gcp_pde",  label: "GCP Professional Data Engineer" },
  { value: "gcp_pdoe", label: "GCP Professional DevOps Engineer" },
  { value: "gcp_pne",  label: "GCP Professional Network Engineer" },
  { value: "gcp_pse",  label: "GCP Professional Security Engineer" },
  { value: "gcp_pmle", label: "GCP Professional ML Engineer" },
];

const EMPTY_MODULE = {
  title: "",
  description: "",
  difficulty_level: "beginner",
  certification_tags: [],
  is_published: false,
  order_index: 0,
};

// ── Difficulty badge ──────────────────────────────────────────────────────────

function DifficultyBadge({ level }) {
  const opt = DIFFICULTY_OPTIONS.find((o) => o.value === level) ?? DIFFICULTY_OPTIONS[0];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${opt.color}`}>
      {opt.label}
    </span>
  );
}

// ── Sortable module row ───────────────────────────────────────────────────────

function SortableModuleRow({ module, isActive, onClick, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: module.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 px-3 py-3 rounded-lg border transition-colors cursor-pointer group ${
        isActive
          ? "bg-blue-50 border-blue-200"
          : "bg-white border-gray-200 hover:border-gray-300"
      }`}
      onClick={() => onClick(module)}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0 p-0.5"
        onClick={(e) => e.stopPropagation()}
        aria-label="Drag to reorder"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5"  r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12"  r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19"  r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium truncate ${isActive ? "text-blue-700" : "text-gray-900"}`}>
            {module.title || "Untitled module"}
          </span>
          {!module.is_published && (
            <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-1.5 py-0.5 flex-shrink-0">
              Draft
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <DifficultyBadge level={module.difficulty_level} />
          <span className="text-xs text-gray-400">
            {module.lesson_count} lesson{module.lesson_count !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(module); }}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-1 rounded flex-shrink-0"
        aria-label="Delete module"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  );
}

// ── Sortable lesson row ───────────────────────────────────────────────────────

function SortableLessonRow({ lesson, onEdit, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lesson.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2.5 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing flex-shrink-0"
        aria-label="Drag to reorder lesson"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5"  r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12"  r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19"  r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </button>
      <span className="text-xs text-gray-400 flex-shrink-0">
        {lesson.lesson_type === "canvas" ? "🖼" : "📖"}
      </span>
      <span className="flex-1 text-sm text-gray-800 truncate">{lesson.title}</span>
      <span className="text-xs text-gray-400 flex-shrink-0">{lesson.estimated_minutes}m</span>
      <button
        onClick={() => onEdit(lesson)}
        className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-700 flex-shrink-0 px-1.5 py-0.5 rounded transition-all"
      >
        Edit
      </button>
      <button
        onClick={() => onDelete(lesson)}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5 rounded flex-shrink-0"
        aria-label="Delete lesson"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

// ── Module editor (right panel) ───────────────────────────────────────────────

function ModuleEditor({ module, allAssignments, onSaved, onClose }) {
  const navigate = useNavigate();
  const isNew = !module.id;

  const [form, setForm] = useState({
    title:             module.title             ?? "",
    description:       module.description       ?? "",
    difficulty_level:  module.difficulty_level  ?? "beginner",
    certification_tags: module.certification_tags ?? [],
    is_published:      module.is_published      ?? false,
    order_index:       module.order_index        ?? 0,
  });
  const [lessons,          setLessons]          = useState(module.lessons     ?? []);
  const [linkedAssignments, setLinkedAssignments] = useState(module.assignments ?? []);
  const [saving,           setSaving]           = useState(false);
  const [error,            setError]            = useState(null);
  const [activeLessonDragId, setActiveLessonDragId] = useState(null);
  const [linkingAssignment, setLinkingAssignment] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  // Library lesson linker state
  const [libraryLinks, setLibraryLinks] = useState(module.library_links ?? []);
  const [libQuery,     setLibQuery]     = useState("");
  const [libResults,   setLibResults]   = useState([]);
  const [libSearching, setLibSearching] = useState(false);
  const [libNoteEdits, setLibNoteEdits] = useState({});

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function toggleCert(value) {
    setForm((f) => ({
      ...f,
      certification_tags: f.certification_tags.includes(value)
        ? f.certification_tags.filter((c) => c !== value)
        : [...f.certification_tags, value],
    }));
  }

  async function handleSave() {
    if (!form.title.trim()) { setError("Title is required"); return; }
    setSaving(true);
    setError(null);
    try {
      const saved = isNew
        ? await createModule(form)
        : await updateModule(module.id, form);
      onSaved(saved);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleLessonDragEnd(event) {
    const { active, over } = event;
    setActiveLessonDragId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = lessons.findIndex((l) => l.id === active.id);
    const newIndex = lessons.findIndex((l) => l.id === over.id);
    const reordered = arrayMove(lessons, oldIndex, newIndex).map((l, i) => ({ ...l, order_index: i }));
    setLessons(reordered);
    await reorderLessons(module.id, reordered.map((l) => ({ id: l.id, order_index: l.order_index })));
  }

  async function handleDeleteLesson(lesson) {
    if (!confirm(`Delete lesson "${lesson.title}"?`)) return;
    await deleteLesson(lesson.id);
    setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
  }

  async function handleAddLesson() {
    if (!module.id) { setError("Save the module first before adding lessons"); return; }
    const title = prompt("Lesson title:");
    if (!title?.trim()) return;
    const newLesson = await createLesson({
      module_id: module.id,
      title: title.trim(),
      content: "",
      estimated_minutes: 10,
      order_index: lessons.length,
    });
    setLessons((prev) => [...prev, newLesson]);
  }

  async function handleLinkAssignment() {
    if (!selectedAssignmentId || !module.id) return;
    setLinkingAssignment(true);
    try {
      await linkAssignment(module.id, Number(selectedAssignmentId), linkedAssignments.length);
      const assignment = allAssignments.find((a) => a.id === Number(selectedAssignmentId));
      if (assignment) {
        setLinkedAssignments((prev) => [...prev, { id: assignment.id, title: assignment.title, order_index: prev.length }]);
      }
      setSelectedAssignmentId("");
    } finally {
      setLinkingAssignment(false);
    }
  }

  async function handleUnlinkAssignment(assignmentId) {
    await unlinkAssignment(module.id, assignmentId);
    setLinkedAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }

  // Library search — debounced 350ms
  useEffect(() => {
    if (!libQuery.trim()) { setLibResults([]); return; }
    const timer = setTimeout(async () => {
      setLibSearching(true);
      try {
        const results = await searchLibrary(libQuery);
        const linkedIds = new Set(libraryLinks.map((l) => l.library_lesson_id));
        setLibResults(results.filter((r) => !linkedIds.has(r.id)));
      } catch {
        setLibResults([]);
      } finally {
        setLibSearching(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [libQuery, libraryLinks]);

  async function handleLinkLibrary(lesson) {
    if (!module.id) return;
    try {
      const link = await linkLibraryLesson(module.id, lesson.id, libraryLinks.length);
      setLibraryLinks((prev) => [...prev, link]);
      setLibQuery("");
      setLibResults([]);
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleUnlinkLibrary(linkId) {
    await unlinkLibraryLesson(module.id, linkId);
    setLibraryLinks((prev) => prev.filter((l) => l.id !== linkId));
    setLibNoteEdits((prev) => { const n = { ...prev }; delete n[linkId]; return n; });
  }

  async function handleSaveLibraryNote(linkId) {
    const edits = libNoteEdits[linkId];
    if (!edits) return;
    try {
      const updated = await updateLibraryLink(module.id, linkId, {
        instructor_note: edits.note,
        instructor_note_visible: edits.visible,
      });
      setLibraryLinks((prev) => prev.map((l) => (l.id === linkId ? { ...l, ...updated } : l)));
      setLibNoteEdits((prev) => { const n = { ...prev }; delete n[linkId]; return n; });
    } catch (e) {
      setError(e.message);
    }
  }

  function initNoteEdit(link) {
    setLibNoteEdits((prev) => ({
      ...prev,
      [link.id]: {
        note:    link.instructor_note         ?? "",
        visible: link.instructor_note_visible ?? false,
      },
    }));
  }

  const unlinkedAssignments = allAssignments.filter(
    (a) => !linkedAssignments.find((la) => la.id === a.id)
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">
          {isNew ? "New Module" : "Edit Module"}
        </h2>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              type="button"
              onClick={() => navigate(`/instructor/assistant?module=${module.id}&task=lesson`)}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
            >
              Write lesson with AI
            </button>
          )}
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => update("title", e.target.value)}
            placeholder="e.g. VPC Fundamentals"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
            rows={3}
            placeholder="What will students learn in this module?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
          />
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Difficulty Level
          </label>
          <div className="flex gap-2 flex-wrap">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => update("difficulty_level", opt.value)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  form.difficulty_level === opt.value
                    ? opt.color
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Certification tags */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Certification Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {CERT_OPTIONS.map((cert) => {
              const active = form.certification_tags.includes(cert.value);
              return (
                <button
                  key={cert.value}
                  onClick={() => toggleCert(cert.value)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                >
                  {cert.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Published toggle */}
        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <div>
            <div className="text-sm font-medium text-gray-900">Published</div>
            <div className="text-xs text-gray-500">Students can see published modules</div>
          </div>
          <button
            onClick={() => update("is_published", !form.is_published)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              form.is_published ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                form.is_published ? "translate-x-4" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Lessons — only shown after module is saved */}
        {!isNew && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Lessons ({lessons.length})
              </label>
              <button
                onClick={handleAddLesson}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                + Add lesson
              </button>
            </div>
            {lessons.length === 0 ? (
              <div className="text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-3 text-center">
                No lessons yet — add one above
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={(e) => setActiveLessonDragId(e.active.id)}
                onDragEnd={handleLessonDragEnd}
              >
                <SortableContext items={lessons.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {lessons.map((lesson) => (
                      <SortableLessonRow
                        key={lesson.id}
                        lesson={lesson}
                        onEdit={(l) => navigate(`/instructor/lessons/${l.id}/edit`)}
                        onDelete={handleDeleteLesson}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}

        {/* Library Lessons — only shown after module is saved */}
        {!isNew && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Library Lessons ({libraryLinks.length})
              </label>
            </div>

            {/* Linked library lessons list */}
            {libraryLinks.map((link) => {
              const editing = libNoteEdits[link.id];
              return (
                <div key={link.id} className="bg-white border border-gray-200 rounded-lg px-3 py-2 mb-2 group">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {link.lesson_type === "canvas" ? "🖼" : "📚"}
                    </span>
                    <span className="flex-1 text-sm text-gray-800 truncate">{link.lesson_title}</span>
                    {link.estimated_minutes && (
                      <span className="text-xs text-gray-400 flex-shrink-0">{link.estimated_minutes}m</span>
                    )}
                    <button
                      onClick={() => initNoteEdit(link)}
                      className="opacity-0 group-hover:opacity-100 text-xs text-blue-600 hover:text-blue-700 flex-shrink-0 px-1.5 py-0.5 rounded transition-all"
                    >
                      Note
                    </button>
                    <button
                      onClick={() => handleUnlinkLibrary(link.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5 rounded flex-shrink-0"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Inline note editor */}
                  {editing && (
                    <div className="mt-2 space-y-2">
                      <textarea
                        value={editing.note}
                        onChange={(e) =>
                          setLibNoteEdits((prev) => ({
                            ...prev,
                            [link.id]: { ...prev[link.id], note: e.target.value },
                          }))
                        }
                        rows={3}
                        placeholder="Add a note for students about this lesson..."
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-400 resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editing.visible}
                            onChange={(e) =>
                              setLibNoteEdits((prev) => ({
                                ...prev,
                                [link.id]: { ...prev[link.id], visible: e.target.checked },
                              }))
                            }
                            className="rounded"
                          />
                          Visible to students
                        </label>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() =>
                              setLibNoteEdits((prev) => {
                                const n = { ...prev };
                                delete n[link.id];
                                return n;
                              })
                            }
                            className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveLibraryNote(link.id)}
                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded transition-colors"
                          >
                            Save note
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Saved note preview (when not editing) */}
                  {!editing && link.instructor_note && (
                    <div className={`mt-1.5 text-xs px-2 py-1 rounded ${
                      link.instructor_note_visible
                        ? "bg-amber-50 text-amber-800"
                        : "bg-gray-50 text-gray-500"
                    }`}>
                      {link.instructor_note_visible ? "📢 " : "🔒 "}{link.instructor_note}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Inline library search picker */}
            <div className="relative mt-1">
              <input
                type="text"
                value={libQuery}
                onChange={(e) => setLibQuery(e.target.value)}
                placeholder="Search library lessons to link..."
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:border-blue-400"
              />
              {libSearching && (
                <div className="absolute right-3 top-2 text-xs text-gray-400">Searching...</div>
              )}
              {libResults.length > 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                  {libResults.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => handleLinkLibrary(r)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center gap-2 border-b border-gray-50 last:border-0"
                    >
                      <span className="text-gray-400">{r.lesson_type === "canvas" ? "🖼" : "📚"}</span>
                      <span className="flex-1 truncate">{r.title}</span>
                      {r.module_title && (
                        <span className="text-xs text-gray-400 truncate max-w-[120px]">{r.module_title}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {libQuery.trim() && !libSearching && libResults.length === 0 && (
                <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow px-3 py-2 text-xs text-gray-400">
                  No results
                </div>
              )}
            </div>
          </div>
        )}

        {/* Linked assignments — only shown after save */}
        {!isNew && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Assignments ({linkedAssignments.length})
              </label>
            </div>
            {linkedAssignments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2 mb-1.5 group">
                <span className="text-xs text-gray-400">📋</span>
                <span className="flex-1 text-sm text-gray-800 truncate">{a.title}</span>
                <button
                  onClick={() => handleUnlinkAssignment(a.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all p-0.5"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {unlinkedAssignments.length > 0 && (
              <div className="flex gap-2 mt-2">
                <select
                  value={selectedAssignmentId}
                  onChange={(e) => setSelectedAssignmentId(e.target.value)}
                  className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:outline-none focus:border-blue-400"
                >
                  <option value="">Link an assignment...</option>
                  {unlinkedAssignments.map((a) => (
                    <option key={a.id} value={a.id}>{a.title}</option>
                  ))}
                </select>
                <button
                  onClick={handleLinkAssignment}
                  disabled={!selectedAssignmentId || linkingAssignment}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                >
                  Link
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 px-6 py-4 flex gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : isNew ? "Create Module" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InstructorModules() {
  const [modules,       setModules]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeModule,  setActiveModule]  = useState(null);
  const [allAssignments, setAllAssignments] = useState([]);
  const [activeDragId,  setActiveDragId]  = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    Promise.all([listModules(), listAssignments()])
      .then(([mods, assignments]) => {
        setModules(mods);
        setAllAssignments(assignments);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveDragId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = modules.findIndex((m) => m.id === active.id);
    const newIndex = modules.findIndex((m) => m.id === over.id);
    const reordered = arrayMove(modules, oldIndex, newIndex).map((m, i) => ({ ...m, order_index: i }));
    setModules(reordered);
    reorderModules(reordered.map((m) => ({ id: m.id, order_index: m.order_index })));
  }

  function handleModuleSaved(saved) {
    setModules((prev) => {
      const idx = prev.findIndex((m) => m.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      }
      return [...prev, saved];
    });
    setActiveModule((prev) => (prev ? { ...prev, ...saved } : saved));
  }

  async function handleDelete(module) {
    if (!confirm(`Delete module "${module.title}" and all its lessons?`)) return;
    await deleteModule(module.id);
    setModules((prev) => prev.filter((m) => m.id !== module.id));
    if (activeModule?.id === module.id) setActiveModule(null);
  }

  async function openModule(module) {
    try {
      const { getModule } = await import("../../api/modules");
      const { getModuleLibraryLinks } = await import("../../api/library");
      const [detail, libraryLinks] = await Promise.all([
        getModule(module.id),
        getModuleLibraryLinks(module.id),
      ]);
      setActiveModule({ ...detail, library_links: libraryLinks });
    } catch {
      setActiveModule(module);
    }
  }

  return (
    <div className="flex gap-5 h-[calc(100vh-8rem)]">
      {/* Left — module list */}
      <div className="w-72 flex-shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-semibold text-gray-900">Modules</h1>
          <button
            onClick={() => setActiveModule({ ...EMPTY_MODULE, order_index: modules.length })}
            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + New
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-400 text-center py-8">Loading...</div>
        ) : modules.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-6 text-center">
            <div className="text-2xl mb-2">📦</div>
            <div className="text-sm text-gray-500">No modules yet</div>
            <button
              onClick={() => setActiveModule({ ...EMPTY_MODULE })}
              className="mt-2 text-sm text-blue-600 hover:text-blue-700"
            >
              Create your first module
            </button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => setActiveDragId(e.active.id)}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={modules.map((m) => m.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-1.5 overflow-y-auto flex-1 pr-0.5">
                {modules.map((module) => (
                  <SortableModuleRow
                    key={module.id}
                    module={module}
                    isActive={activeModule?.id === module.id}
                    onClick={openModule}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Right — module editor */}
      {activeModule ? (
        <div className="flex-1 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col">
          <ModuleEditor
            key={activeModule.id ?? "new"}
            module={activeModule}
            allAssignments={allAssignments}
            onSaved={handleModuleSaved}
            onClose={() => setActiveModule(null)}
          />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-400">
          <div className="text-center">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-sm">Select a module to edit, or create a new one</div>
          </div>
        </div>
      )}
    </div>
  );
}
