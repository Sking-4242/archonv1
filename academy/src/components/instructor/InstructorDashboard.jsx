import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useAssignmentStore } from "../../store/assignmentStore";
import { listAssignments } from "../../api/assignments";
import { listSubmissions } from "../../api/submissions";

function AssignmentRow({ assignment, onSelect, selected }) {
  return (
    <button
      onClick={() => onSelect(assignment)}
      className={`w-full text-left px-4 py-3 rounded border transition-colors ${
        selected
          ? "border-blue-600 bg-blue-950/40"
          : "border-gray-800 bg-gray-900 hover:border-gray-700"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-white">{assignment.title}</span>
        <span className="text-xs text-gray-500">
          {assignment.submission_count ?? 0} submission{assignment.submission_count !== 1 ? "s" : ""}
        </span>
      </div>
      <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{assignment.brief}</p>
    </button>
  );
}

function SubmissionRow({ submission }) {
  const navigate = useNavigate();
  const graded = submission.instructor_score !== null && submission.instructor_score !== undefined;
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded">
      <div>
        <p className="text-sm text-white">{submission.student_name}</p>
        <p className="text-xs text-gray-500">
          Submitted {new Date(submission.submitted_at).toLocaleDateString()}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={`text-xs font-medium ${graded ? "text-green-400" : "text-yellow-400"}`}>
          {graded
            ? `${submission.instructor_score} / ${submission.total_points} pts`
            : `Auto: ${submission.automated_score} / ${submission.total_points}`}
        </span>
        <button
          onClick={() => navigate(`/instructor/submission/${submission.id}`)}
          className="text-xs bg-gray-800 hover:bg-gray-700 text-white px-3 py-1.5 rounded transition-colors"
        >
          Review
        </button>
      </div>
    </div>
  );
}

export default function InstructorDashboard() {
  const { user, token, logout } = useAuthStore();
  const { assignments, setAssignments } = useAssignmentStore();
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    listAssignments(token).then(setAssignments).catch(() => {});
  }, [token, setAssignments]);

  useEffect(() => {
    if (!selectedAssignment) return;
    listSubmissions(selectedAssignment.id, token).then(setSubmissions).catch(() => {});
  }, [selectedAssignment, token]);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <span className="text-blue-500 font-bold text-lg">Archon Academy</span>
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm">{user?.name}</span>
          <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-[280px_1fr] gap-6">
        {/* Assignment list */}
        <aside>
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Assignments</h3>
          <div className="space-y-2">
            {assignments.length === 0 && (
              <p className="text-gray-600 text-sm">No assignments yet.</p>
            )}
            {assignments.map((a) => (
              <AssignmentRow
                key={a.id}
                assignment={a}
                onSelect={setSelectedAssignment}
                selected={selectedAssignment?.id === a.id}
              />
            ))}
          </div>
        </aside>

        {/* Submissions panel */}
        <section>
          {!selectedAssignment ? (
            <div className="flex items-center justify-center h-48 text-gray-600 text-sm">
              Select an assignment to view submissions
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">{selectedAssignment.title}</h2>
                <span className="text-xs text-gray-500">{submissions.length} submissions</span>
              </div>
              <div className="space-y-2">
                {submissions.length === 0 && (
                  <p className="text-gray-600 text-sm">No submissions yet.</p>
                )}
                {submissions.map((s) => <SubmissionRow key={s.id} submission={s} />)}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
