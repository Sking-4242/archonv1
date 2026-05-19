import { useEffect, useState } from "react";
import { listAssignments } from "../../api/assignments";

export default function StudentGrades() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listAssignments()
      .then(setAssignments)
      .catch(() => setAssignments([]))
      .finally(() => setLoading(false));
  }, []);

  const graded = assignments.filter(
    (a) => a.status === "graded" && a.score !== undefined && a.score !== null
  );

  const totalEarned = graded.reduce((sum, a) => sum + (a.score ?? 0), 0);
  const totalPossible = graded.reduce((sum, a) => sum + (a.total_points ?? a.score ?? 0), 0);
  const pct = totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null;

  function letterGrade(p) {
    if (p === null) return "—";
    if (p >= 93) return "A";
    if (p >= 90) return "A-";
    if (p >= 87) return "B+";
    if (p >= 83) return "B";
    if (p >= 80) return "B-";
    if (p >= 77) return "C+";
    if (p >= 73) return "C";
    if (p >= 70) return "C-";
    return "D";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Grades</h1>

      {/* Summary card */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 flex items-center gap-8">
        <div className="text-center">
          <div className="text-4xl font-bold text-blue-600">{letterGrade(pct)}</div>
          <div className="text-xs text-gray-500 mt-1">Current Grade</div>
        </div>
        <div className="h-12 w-px bg-gray-200" />
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{pct !== null ? `${pct}%` : "—"}</div>
          <div className="text-xs text-gray-500 mt-1">Percentage</div>
        </div>
        <div className="h-12 w-px bg-gray-200" />
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalEarned}</div>
          <div className="text-xs text-gray-500 mt-1">Points Earned</div>
        </div>
      </div>

      {/* Grade table */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          Loading…
        </div>
      ) : graded.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-sm font-medium text-gray-600">No graded assignments yet</div>
          <div className="text-xs text-gray-400 mt-1">
            Grades will appear here once your instructor reviews your submissions.
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Assignment
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Score
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Grade
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {graded.map((a) => {
                const total = a.total_points ?? a.score ?? 0;
                const p = total > 0 ? Math.round((a.score / total) * 100) : null;
                return (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{a.title}</td>
                    <td className="px-6 py-4 text-right text-gray-700">
                      {a.score} / {total}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-semibold ${
                          (p ?? 0) >= 80 ? "text-green-600" : "text-red-500"
                        }`}
                      >
                        {letterGrade(p)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
