import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listAssignments } from "../../api/assignments";
import { listModules } from "../../api/modules";
import {
  assignModuleToClass,
  assignToClass,
  bulkEnrollStudents,
  enrollStudent,
  getClass,
  getClassAssignments,
  getClassModules,
  getClassProgress,
  getClassRoster,
  getClassStudent,
  markGraduating,
  removeStudent,
  unassignFromClass,
  unassignModuleFromClass,
} from "../../api/classes";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "roster", label: "Roster" },
  { id: "content", label: "Content" },
  { id: "progress", label: "Progress" },
];

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${accent ?? "text-gray-900"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

function ProgressBar({ pct }) {
  const value = Math.min(100, Math.max(0, pct ?? 0));
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${value}%` }} />
    </div>
  );
}

export default function InstructorClassDetail() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const id = Number(classId);

  const [tab, setTab] = useState("overview");
  const [cls, setCls] = useState(null);
  const [roster, setRoster] = useState([]);
  const [progress, setProgress] = useState(null);
  const [classAssignments, setClassAssignments] = useState([]);
  const [classModules, setClassModules] = useState([]);
  const [allAssignments, setAllAssignments] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetail, setStudentDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [enrollEmail, setEnrollEmail] = useState("");
  const [bulkEmails, setBulkEmails] = useState("");
  const [assignId, setAssignId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [assignDue, setAssignDue] = useState("");
  const [moduleDue, setModuleDue] = useState("");
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [classData, rosterData, progressData, ca, cm] = await Promise.all([
        getClass(id),
        getClassRoster(id),
        getClassProgress(id),
        getClassAssignments(id),
        getClassModules(id),
      ]);
      setCls(classData);
      setRoster(rosterData);
      setProgress(progressData);
      setClassAssignments(ca);
      setClassModules(cm);
    } catch (e) {
      setError(e.message ?? "Failed to load class");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (tab === "content") {
      Promise.all([listAssignments(), listModules()])
        .then(([a, m]) => {
          setAllAssignments(a);
          setAllModules(m);
        })
        .catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    if (!selectedStudentId) {
      setStudentDetail(null);
      return;
    }
    getClassStudent(id, selectedStudentId)
      .then(setStudentDetail)
      .catch(() => setStudentDetail(null));
  }, [id, selectedStudentId]);

  async function handleEnroll(e) {
    e.preventDefault();
    if (!enrollEmail.trim()) return;
    setSaving(true);
    try {
      await enrollStudent(id, enrollEmail.trim());
      setEnrollEmail("");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleBulkEnroll(e) {
    e.preventDefault();
    const emails = bulkEmails
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!emails.length) return;
    setSaving(true);
    try {
      await bulkEnrollStudents(id, emails);
      setBulkEmails("");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignAssignment(e) {
    e.preventDefault();
    if (!assignId) return;
    setSaving(true);
    try {
      await assignToClass(id, Number(assignId), assignDue ? `${assignDue}T23:59:59Z` : null);
      setAssignId("");
      setAssignDue("");
      const ca = await getClassAssignments(id);
      setClassAssignments(ca);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAssignModule(e) {
    e.preventDefault();
    if (!moduleId) return;
    setSaving(true);
    try {
      await assignModuleToClass(id, Number(moduleId), moduleDue ? `${moduleDue}T23:59:59Z` : null);
      setModuleId("");
      setModuleDue("");
      const cm = await getClassModules(id);
      setClassModules(cm);
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !cls) {
    return <div className="text-sm text-gray-400 p-8">Loading class…</div>;
  }

  if (!cls) {
    return (
      <div className="space-y-4">
        <button onClick={() => navigate("/instructor/classes")} className="text-sm text-blue-600">
          ← Back to classes
        </button>
        <div className="text-sm text-red-600">{error || "Class not found"}</div>
      </div>
    );
  }

  const linkedAssignmentIds = new Set(classAssignments.map((a) => a.assignment_id));
  const linkedModuleIds = new Set(classModules.map((m) => m.module_id));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/instructor/classes")}
            className="text-xs text-blue-600 hover:text-blue-700 mb-2"
          >
            ← All classes
          </button>
          <h1 className="text-xl font-semibold text-gray-900">{cls.name}</h1>
          {cls.description && <p className="text-sm text-gray-500 mt-1 max-w-2xl">{cls.description}</p>}
          <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
            <span className="bg-gray-100 rounded-full px-3 py-1 font-mono">Code: {cls.class_code}</span>
            <span className="bg-blue-50 text-blue-700 rounded-full px-3 py-1 uppercase">{cls.course}</span>
            <span>{cls.student_count} students</span>
            <button
              type="button"
              onClick={() => navigate(`/instructor/assistant?class=${id}&task=at_risk`)}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Ask teaching assistant →
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === t.id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Students" value={cls.student_count} />
          <StatCard label="At risk" value={cls.at_risk_count} accent="text-orange-600" />
          <StatCard label="Pending review" value={cls.pending_review} accent="text-blue-600" />
          <StatCard
            label="Avg score"
            value={progress?.avg_score_pct != null ? `${progress.avg_score_pct}%` : "—"}
          />
        </div>
      )}

      {tab === "roster" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
              Enrolled students ({roster.length})
            </div>
            {roster.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">No students yet — enroll using the form.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {roster.map((s) => (
                  <li key={s.student_id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setSelectedStudentId(s.student_id);
                        setTab("progress");
                      }}
                      className="text-left flex-1 min-w-0"
                    >
                      <div className="text-sm font-medium text-gray-900 truncate">{s.student_name}</div>
                      <div className="text-xs text-gray-400 truncate">{s.student_email}</div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.is_graduating && (
                        <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Graduating</span>
                      )}
                      <button
                        onClick={() =>
                          markGraduating(id, s.student_id, !s.is_graduating).then(refresh)
                        }
                        className="text-xs text-gray-500 hover:text-blue-600"
                      >
                        {s.is_graduating ? "Unmark" : "Mark graduating"}
                      </button>
                      <button
                        onClick={() => removeStudent(id, s.student_id).then(refresh)}
                        className="text-xs text-gray-400 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-4">
            <form onSubmit={handleEnroll} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Add student</h3>
              <input
                type="email"
                required
                value={enrollEmail}
                onChange={(e) => setEnrollEmail(e.target.value)}
                placeholder="student@school.edu"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-lg"
              >
                Enroll
              </button>
            </form>

            <form onSubmit={handleBulkEnroll} className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Bulk import</h3>
              <textarea
                rows={4}
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="One email per line"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
              <button
                type="submit"
                disabled={saving}
                className="w-full border border-gray-200 hover:border-gray-300 text-sm font-medium py-2 rounded-lg"
              >
                Import list
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === "content" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Assigned modules</h3>
            {classModules.length === 0 ? (
              <p className="text-sm text-gray-400">No modules assigned yet.</p>
            ) : (
              <ul className="space-y-2">
                {classModules.map((m) => (
                  <li key={m.link_id} className="flex items-center justify-between text-sm">
                    <span>{m.title}</span>
                    <button
                      onClick={() => unassignModuleFromClass(id, m.module_id).then(refresh)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAssignModule} className="pt-2 border-t border-gray-100 space-y-2">
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select module…</option>
                {allModules
                  .filter((m) => !linkedModuleIds.has(m.id))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.title}
                    </option>
                  ))}
              </select>
              <input
                type="date"
                value={moduleDue}
                onChange={(e) => setModuleDue(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button type="submit" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg">
                Assign module
              </button>
            </form>
          </section>

          <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Assigned labs</h3>
            {classAssignments.length === 0 ? (
              <p className="text-sm text-gray-400">No assignments linked yet.</p>
            ) : (
              <ul className="space-y-2">
                {classAssignments.map((a) => (
                  <li key={a.link_id} className="flex items-center justify-between text-sm">
                    <div>
                      <div>{a.title}</div>
                      {a.due_date && (
                        <div className="text-xs text-gray-400">
                          Due {new Date(a.due_date).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => unassignFromClass(id, a.assignment_id).then(refresh)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <form onSubmit={handleAssignAssignment} className="pt-2 border-t border-gray-100 space-y-2">
              <select
                value={assignId}
                onChange={(e) => setAssignId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select assignment…</option>
                {allAssignments
                  .filter((a) => !linkedAssignmentIds.has(a.id))
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title}
                    </option>
                  ))}
              </select>
              <input
                type="date"
                value={assignDue}
                onChange={(e) => setAssignDue(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <button type="submit" className="text-sm bg-blue-600 text-white px-4 py-2 rounded-lg">
                Assign lab
              </button>
            </form>
          </section>
        </div>
      )}

      {tab === "progress" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
              Class progress
            </div>
            {!progress?.students?.length ? (
              <div className="p-8 text-center text-sm text-gray-400">Enroll students to track progress.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {progress.students.map((s) => (
                  <li key={s.student_id}>
                    <button
                      onClick={() => setSelectedStudentId(s.student_id)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                        selectedStudentId === s.student_id ? "bg-blue-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-sm font-medium text-gray-900">{s.student_name}</span>
                        {s.at_risk ? (
                          <span className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                            At risk
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">{s.lesson_completion_pct}% lessons</span>
                        )}
                      </div>
                      <ProgressBar pct={s.lesson_completion_pct} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Student detail</h3>
            {!studentDetail ? (
              <p className="text-sm text-gray-400">Select a student to view details.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <div>
                  <div className="font-medium text-gray-900">{studentDetail.student_name}</div>
                  <div className="text-xs text-gray-400">{studentDetail.student_email}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500">Lessons</div>
                    <div className="font-semibold">
                      {studentDetail.lessons_completed}/{studentDetail.lessons_total}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500">Labs submitted</div>
                    <div className="font-semibold">
                      {studentDetail.assignments_submitted}/{studentDetail.assignments_total}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500">Avg score</div>
                    <div className="font-semibold">
                      {studentDetail.avg_score_pct != null ? `${studentDetail.avg_score_pct}%` : "—"}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-2">
                    <div className="text-gray-500">Overdue</div>
                    <div className="font-semibold">{studentDetail.overdue_assignments}</div>
                  </div>
                </div>
                {studentDetail.recent_practice_tests?.length > 0 && (
                  <div>
                    <div className="text-xs font-medium text-gray-500 mb-1">Recent practice tests</div>
                    <ul className="space-y-1 text-xs text-gray-600">
                      {studentDetail.recent_practice_tests.map((t, i) => (
                        <li key={i}>
                          {t.cert} #{t.test_number}: {t.percent}% {t.passed ? "✓" : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
