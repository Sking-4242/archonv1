import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createClass, listClasses } from "../../api/classes";

export default function InstructorClasses() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", course: "aws" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    listClasses()
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const created = await createClass(form);
      setClasses((prev) => [created, ...prev]);
      setShowForm(false);
      setForm({ name: "", description: "", course: "aws" });
      navigate(`/instructor/classes/${created.id}`);
    } catch (err) {
      setError(err.message ?? "Failed to create class");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Classes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage cohorts, rosters, and assigned content.
          </p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {showForm ? "Cancel" : "+ New class"}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border border-blue-200 rounded-xl p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-800">Create class</h2>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Class name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
              placeholder="AWS Cloud Practitioner — Spring 2026"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Course track</label>
            <select
              value={form.course}
              onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="aws">AWS</option>
              <option value="azure">Azure</option>
              <option value="gcp">GCP</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg"
          >
            {saving ? "Creating…" : "Create class"}
          </button>
        </form>
      )}

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : classes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">🎓</div>
          <div className="text-sm font-medium text-gray-600">No classes yet</div>
          <div className="text-xs text-gray-400 mt-1">
            Create a class to enroll students and assign modules and labs.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/instructor/classes/${c.id}`)}
              className="bg-white border border-gray-200 rounded-xl p-5 text-left hover:border-blue-300 transition-colors group"
            >
              <div className="font-medium text-gray-900 group-hover:text-blue-600 text-sm">{c.name}</div>
              <div className="text-xs text-gray-400 mt-1 font-mono">Code: {c.class_code}</div>
              <div className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500">
                <span>{c.student_count} students</span>
                <span>{c.module_count} modules</span>
                <span>{c.assignment_count} labs</span>
                {c.at_risk_count > 0 && (
                  <span className="text-orange-600">{c.at_risk_count} at risk</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
