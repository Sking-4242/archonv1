import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAssignments, listLibraryAssignments, createAssignment } from "../../api/assignments";

function totalPoints(rubric) {
  return (rubric ?? []).reduce((sum, c) => sum + (c.points ?? 0), 0);
}

export default function InstructorAssignments() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("mine");
  const [assignments, setAssignments] = useState([]);
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", brief: "", due_date: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([listAssignments(), listLibraryAssignments()])
      .then(([mine, lib]) => {
        setAssignments(mine);
        setLibrary(lib);
      })
      .catch(() => {
        setAssignments([]);
        setLibrary([]);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const created = await createAssignment({
        title: form.title,
        brief: form.brief,
        due_date: form.due_date || null,
        rubric: [],
      });
      setAssignments((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ title: "", brief: "", due_date: "" });
      setTab("mine");
    } catch (err) {
      setError(err.message ?? "Failed to create assignment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Assignments</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create custom labs or assign pre-built library labs to your classes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate("/instructor/assistant?task=assignment")}
            className="border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Design with AI
          </button>
          {tab === "mine" && (
            <button
              onClick={() => setShowForm((v) => !v)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {showForm ? "Cancel" : "+ New Assignment"}
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        <button
          onClick={() => setTab("mine")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "mine"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          My assignments
        </button>
        <button
          onClick={() => setTab("library")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            tab === "library"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
        >
          Lab library ({library.length})
        </button>
      </div>

      {tab === "mine" && showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white border border-blue-200 rounded-xl p-6 space-y-4"
        >
          <h2 className="text-sm font-semibold text-gray-800">New Assignment</h2>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Title</label>
            <input
              required
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
              placeholder="e.g. 3-Tier AWS Architecture"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Brief / Instructions</label>
            <textarea
              rows={3}
              value={form.brief}
              onChange={(e) => setForm((f) => ({ ...f, brief: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 resize-none"
              placeholder="What should students build?"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Due Date (optional)</label>
            <input
              type="date"
              value={form.due_date}
              onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? "Creating…" : "Create Assignment"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : tab === "mine" ? (
        assignments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <div className="text-sm font-medium text-gray-600">No custom assignments yet</div>
            <div className="text-xs text-gray-400 mt-1">
              Create your own or assign labs from the library tab to a class.
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.map((a) => (
              <div
                key={a.id}
                className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer group"
                onClick={() => navigate(`/instructor/gradebook?assignment=${a.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors text-sm">
                    {a.title}
                  </div>
                  {a.brief && (
                    <div className="text-xs text-gray-400 mt-1 truncate max-w-lg">{a.brief}</div>
                  )}
                </div>
                <div className="ml-4 flex items-center gap-4">
                  <span className="text-xs text-gray-500">
                    {a.submission_count ?? 0} submissions
                  </span>
                  <svg
                    className="text-gray-300 group-hover:text-blue-400 transition-colors"
                    width="16" height="16" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </div>
            ))}
          </div>
        )
      ) : library.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-sm font-medium text-gray-600">Lab library is empty</div>
          <div className="text-xs text-gray-400 mt-1">
            Run <code className="text-gray-600">python seed_assignments.py</code> in the backend container.
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">
            These labs are always available to students. Assign them from a class Content tab.
          </p>
          {library.map((a) => (
            <div
              key={a.id}
              className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex items-center justify-between"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 text-sm">{a.title}</div>
                {a.brief && (
                  <div className="text-xs text-gray-400 mt-1 line-clamp-2 max-w-2xl">{a.brief}</div>
                )}
              </div>
              <div className="ml-4 shrink-0 text-right">
                <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                  {totalPoints(a.rubric)} pts
                </span>
                <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">Library</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
