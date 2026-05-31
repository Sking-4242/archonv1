import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getInstructorDashboard } from "../../api/classes";

export default function InstructorAnalytics() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInstructorDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-sm text-gray-400">Loading analytics…</div>;
  }

  const classes = dashboard?.classes ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Cross-class progress and at-risk students. Open a class for detailed drill-down.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total students", value: dashboard?.student_count ?? 0 },
          { label: "At risk", value: dashboard?.at_risk_count ?? 0, accent: "text-orange-600" },
          { label: "Pending review", value: dashboard?.pending_review ?? 0, accent: "text-blue-600" },
          {
            label: "Avg score",
            value: dashboard?.avg_score_pct != null ? `${dashboard.avg_score_pct}%` : "—",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</div>
            <div className={`text-2xl font-bold mt-1 ${s.accent ?? "text-gray-900"}`}>{s.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase">
          By class
        </div>
        {classes.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-400">Create a class to see analytics.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="px-4 py-2 font-medium">Class</th>
                <th className="px-4 py-2 font-medium">Students</th>
                <th className="px-4 py-2 font-medium">At risk</th>
                <th className="px-4 py-2 font-medium">Pending</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((c) => (
                <tr
                  key={c.id}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/instructor/classes/${c.id}`)}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.student_count}</td>
                  <td className="px-4 py-3 text-orange-600">{c.at_risk_count}</td>
                  <td className="px-4 py-3 text-gray-600">{c.pending_review}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
