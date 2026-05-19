import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listAssignments } from "../../api/assignments";

const STATUS_STYLES = {
  not_started: { label: "Not Started", cls: "bg-gray-100 text-gray-600" },
  in_progress: { label: "In Progress", cls: "bg-blue-50 text-blue-700" },
  submitted: { label: "Submitted", cls: "bg-yellow-50 text-yellow-700" },
  graded: { label: "Graded", cls: "bg-green-50 text-green-700" },
};

const FILTERS = ["All", "Not Started", "In Progress", "Submitted", "Graded"];

export default function StudentAssignments() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    listAssignments()
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = assignments.filter((a) => {
    if (filter === "All") return true;
    const s = STATUS_STYLES[a.status];
    return s?.label === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Assignments</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              filter === f
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-gray-400 text-sm">No assignments found</div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const s = STATUS_STYLES[a.status] ?? STATUS_STYLES.not_started;
            return (
              <div
                key={a.id}
                className="bg-white border border-gray-200 rounded-xl px-6 py-5 flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer group"
                onClick={() => navigate(`/assignment/${a.id}`)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {a.title}
                  </div>
                  {a.due_date && (
                    <div className="text-xs text-gray-400 mt-1">
                      Due {new Date(a.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 ml-4">
                  {a.score !== undefined && a.score !== null && (
                    <span className="text-sm font-semibold text-gray-700">
                      {a.score} pts
                    </span>
                  )}
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${s.cls}`}>
                    {s.label}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
