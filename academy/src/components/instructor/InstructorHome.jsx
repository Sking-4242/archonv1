import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { getInstructorDashboard } from "../../api/classes";
import InstructorOrganization from "./InstructorOrganization";

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
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInstructorDashboard()
      .then(setDashboard)
      .catch(() => setDashboard(null))
      .finally(() => setLoading(false));
  }, []);

  const classes = dashboard?.classes ?? [];

  return (
    <div className="space-y-8">
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl px-8 py-7">
        <h1 className="text-2xl font-bold text-white">
          Welcome back, {user?.name?.split(" ")[0] ?? "Instructor"}
        </h1>
        <p className="text-blue-100 mt-1 text-sm">
          {dashboard?.class_count ?? 0} class{(dashboard?.class_count ?? 0) !== 1 ? "es" : ""} ·{" "}
          {dashboard?.student_count ?? 0} students · {dashboard?.pending_review ?? 0} submissions awaiting review
        </p>
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            onClick={() => navigate("/instructor/assistant")}
            className="bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Teaching assistant
          </button>
          <button
            onClick={() => navigate("/instructor/classes")}
            className="bg-white/15 hover:bg-white/25 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Manage classes
          </button>
          <button
            onClick={() => navigate("/instructor/gradebook")}
            className="bg-white text-blue-700 hover:bg-blue-50 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            Open gradebook
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Classes" value={dashboard?.class_count ?? "—"} />
        <StatCard label="Students" value={dashboard?.student_count ?? "—"} color="text-blue-600" />
        <StatCard
          label="Pending review"
          value={dashboard?.pending_review ?? "—"}
          color="text-orange-600"
        />
        <StatCard
          label="At risk"
          value={dashboard?.at_risk_count ?? "—"}
          sub={
            dashboard?.avg_score_pct != null ? `Avg score ${dashboard.avg_score_pct}%` : undefined
          }
        />
      </div>

      <InstructorOrganization />

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Your classes</h2>
          <button
            onClick={() => navigate("/instructor/classes")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Loading…
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="text-gray-400 text-sm">No classes yet</div>
            <button
              onClick={() => navigate("/instructor/classes")}
              className="mt-3 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Create your first class
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {classes.slice(0, 6).map((c) => (
              <div
                key={c.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => navigate(`/instructor/classes/${c.id}`)}
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 font-mono">Code: {c.class_code}</div>
                </div>
                <div className="text-xs text-gray-500 text-right">
                  <div>{c.student_count} students</div>
                  {c.at_risk_count > 0 && (
                    <div className="text-orange-600 mt-0.5">{c.at_risk_count} at risk</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
