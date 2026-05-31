import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { listAssignments } from "../../api/assignments";

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col gap-1">
      <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</span>
      <span className={`text-3xl font-bold ${color}`}>{value}</span>
    </div>
  );
}

export default function StudentHome() {
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

  const upcoming = assignments.filter(
    (a) => a.status === "not_started" || a.status === "in_progress"
  );
  const graded = assignments.filter((a) => a.status === "graded");
  const submitted = assignments.filter((a) => a.status === "submitted");

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-blue-600 rounded-2xl px-8 py-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(" ")[0] ?? "Student"}
          </h1>
          <p className="text-blue-100 mt-1 text-sm">
            {upcoming.length > 0
              ? `You have ${upcoming.length} assignment${upcoming.length !== 1 ? "s" : ""} in progress.`
              : "You're all caught up — great work!"}
          </p>
        </div>
        <div className="hidden md:block opacity-20">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <polygon points="40,5 75,22.5 75,57.5 40,75 5,57.5 5,22.5" stroke="white" strokeWidth="2" fill="none" />
            <circle cx="40" cy="40" r="14" stroke="white" strokeWidth="2" fill="none" />
          </svg>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Assignments" value={assignments.length} color="text-gray-900" />
        <StatCard label="In Progress" value={upcoming.length} color="text-blue-600" />
        <StatCard label="Submitted" value={submitted.length} color="text-yellow-600" />
        <StatCard label="Graded" value={graded.length} color="text-green-600" />
      </div>

      {/* Practice tests promo */}
      <section className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="font-medium text-gray-900 text-sm">AWS Cloud Practitioner practice tests</div>
          <p className="text-xs text-gray-500 mt-1">
            Study mode with explanations or timed live exams. Test 1 is free with your account.
          </p>
        </div>
        <button
          onClick={() => navigate("/practice-tests")}
          className="shrink-0 text-sm px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700"
        >
          Open practice tests
        </button>
      </section>

      {/* Upcoming assignments */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Upcoming Work</h2>
          <button
            onClick={() => navigate("/assignments")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all →
          </button>
        </div>

        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Loading assignments…
          </div>
        ) : upcoming.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="text-gray-400 text-sm">No upcoming assignments</div>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.slice(0, 3).map((a) => (
              <div
                key={a.id}
                className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer"
                onClick={() => navigate(`/assignment/${a.id}`)}
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">{a.title}</div>
                  {a.due_date && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      Due {new Date(a.due_date).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    a.status === "in_progress"
                      ? "bg-blue-50 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {a.status === "in_progress" ? "In Progress" : "Not Started"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
