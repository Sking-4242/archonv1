import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { getSubmission, gradeSubmission } from "../../api/submissions";
import SubmissionFeedback from "../student/SubmissionFeedback";

export default function SubmissionReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const [submission, setSubmission] = useState(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    getSubmission(id, token)
      .then((s) => {
        setSubmission(s);
        if (s.instructor_score !== null && s.instructor_score !== undefined) {
          setScore(String(s.instructor_score));
        }
        if (s.instructor_feedback) setFeedback(s.instructor_feedback);
      })
      .catch(() => {});
  }, [id, token]);

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      const updated = await gradeSubmission(id, Number(score), feedback, token);
      setSubmission(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (!submission) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={() => navigate("/instructor")}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Back
        </button>
        <h1 className="text-sm font-semibold text-white">
          Review: {submission.student_name} — {submission.assignment_title}
        </h1>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 grid grid-cols-[1fr_320px] gap-8">
        {/* Canvas placeholder — read-only student diagram */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg flex items-center justify-center h-96">
          <p className="text-gray-600 text-sm">Student canvas will render here (read-only)</p>
        </div>

        {/* Grading panel */}
        <aside className="space-y-5">
          <SubmissionFeedback submission={submission} />

          <div className="border-t border-gray-800 pt-5 space-y-4">
            <h3 className="text-sm font-semibold text-white">Override Score</h3>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">
                Score (out of {submission.total_points})
              </label>
              <input
                type="number"
                min={0}
                max={submission.total_points}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder={String(submission.automated_score)}
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Instructor Feedback</label>
              <textarea
                rows={4}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional written feedback for the student..."
                className="w-full bg-gray-800 border border-gray-700 text-white text-sm rounded px-3 py-2 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              onClick={handleSave}
              disabled={saving || score === ""}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded px-4 py-2 transition-colors"
            >
              {saving ? "Saving..." : saved ? "Saved!" : "Save Grade"}
            </button>
          </div>
        </aside>
      </main>
    </div>
  );
}
