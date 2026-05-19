import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useAssignmentStore } from "../../store/assignmentStore";
import { listAssignments } from "../../api/assignments";
import AssignmentCard from "./AssignmentCard";

export default function StudentDashboard() {
  const { user, token, logout } = useAuthStore();
  const { assignments, setAssignments } = useAssignmentStore();

  useEffect(() => {
    listAssignments(token)
      .then(setAssignments)
      .catch(() => {});
  }, [token, setAssignments]);

  const active = assignments.filter((a) => a.status !== "graded");
  const completed = assignments.filter((a) => a.status === "graded");

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-blue-500 font-bold text-lg">Archon Academy</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user?.name}</span>
          <button
            onClick={logout}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <h2 className="text-xl font-semibold mb-6">Your Assignments</h2>

        {active.length === 0 && completed.length === 0 && (
          <p className="text-gray-500 text-sm">No assignments yet. Check back soon.</p>
        )}

        {active.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Active</h3>
            <div className="space-y-3">
              {active.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
            </div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Completed</h3>
            <div className="space-y-3">
              {completed.map((a) => <AssignmentCard key={a.id} assignment={a} />)}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
