import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { listAssignments } from "../../api/assignments";

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</div>
      <div className={`text-3xl font-bold mt-1 ${color ?? "text-gray-900"}`}>{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function InstructorHome() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAssignments()
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, []);

  const totalSubmissions = assignments.reduce(
    (sum, a) => sum + (a.submission_count ?? 0),
    0
  );

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl px-8 py-7">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name?.split(" ")[0] ?? "Instructor"}
        </h1>
        <p className="text-blue-100 mt-1 text-sm">
          {assignments.length} assignment{assignments.length !== 1 ? "s" : ""} published · {totalSubmissions} submission{totalSubmissions !== 1 ? "s" : ""} to review
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Assignments" value={assignments.length} />
        <StatCard label="Total Submissions" value={totalSubmissions} color="text-blue-600" />
        <StatCard label="Pending Review" value="—" sub="Grading coming soon" />
        <StatCard label="Avg Score" value="—" sub="Grading coming soon" />
      </div>

      {/* Recent assignments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Your Assignments</h2>
          <button
            onClick={() => navigate("/instructor/assignments")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Manage all →
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Loading…
          </div>
        ) : assignments.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="text-gray-400 text-sm">No assignments yet</div>
            <button
              onClick={() => navigate("/instructor/assignments")}
              className="mt-3 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Create your first assignment
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {assignments.slice(0, 5).map((a) => (
              <div
                key={a.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => navigate("/instructor/assignments")}
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">{a.title}</div>
                  {a.due_date && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Due {new Date(a.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  {a.submission_count ?? 0} submissions
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
