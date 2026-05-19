import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { listAssignments } from "../../api/assignments";
import { listSubmissions } from "../../api/submissions";

const STATUS_STYLES = {
  submitted: { label: "Submitted", cls: "bg-yellow-50 text-yellow-700" },
  graded: { label: "Graded", cls: "bg-green-50 text-green-700" },
};

export default function InstructorGradebook() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const selectedId = searchParams.get("assignment")
    ? Number(searchParams.get("assignment"))
    : null;

  useEffect(() => {
    listAssignments()
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoadingAssignments(false));
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSubmissions([]);
      return;
    }
    setLoadingSubmissions(true);
    listSubmissions(selectedId)
      .then(setSubmissions)
      .catch(() => setSubmissions([]))
      .finally(() => setLoadingSubmissions(false));
  }, [selectedId]);

  const selected = assignments.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Gradebook</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        {/* Assignment picker */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Assignments
          </div>
          {loadingAssignments ? (
            <div className="p-6 text-center text-sm text-gray-400">Loading…</div>
          ) : assignments.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-400">No assignments</div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {assignments.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => setSearchParams({ assignment: a.id })}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${
                      selectedId === a.id
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {a.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submissions table */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          {!selectedId ? (
            <div className="p-12 text-center">
              <div className="text-2xl mb-2">←</div>
              <div className="text-sm text-gray-500">Select an assignment to view submissions</div>
            </div>
          ) : loadingSubmissions ? (
            <div className="p-12 text-center text-sm text-gray-400">Loading…</div>
          ) : (
            <>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 text-sm">{selected?.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{submissions.length} submissions</div>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-sm text-gray-400">No submissions yet</div>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Student
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Auto Score
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Final Score
                      </th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {submissions.map((s) => {
                      const statusStyle = s.instructor_score != null
                        ? STATUS_STYLES.graded
                        : STATUS_STYLES.submitted;
                      return (
                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 text-gray-900 font-medium">
                            {s.student_name ?? `Student #${s.student_id}`}
                          </td>
                          <td className="px-6 py-4 text-right text-gray-600">
                            {s.automated_score ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-right font-semibold text-gray-900">
                            {s.instructor_score ?? s.automated_score ?? "—"}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusStyle.cls}`}>
                              {statusStyle.label}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => navigate(`/instructor/submission/${s.id}`)}
                              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
