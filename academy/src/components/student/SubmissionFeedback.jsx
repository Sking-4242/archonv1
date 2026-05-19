const ICONS = {
  pass: (
    <svg className="w-4 h-4 text-green-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  fail: (
    <svg className="w-4 h-4 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
};

function CriterionRow({ criterion }) {
  const passed = criterion.passed;
  return (
    <div className={`flex gap-3 p-3 rounded border ${passed ? "border-green-800/50 bg-green-950/30" : "border-red-800/50 bg-red-950/30"}`}>
      {passed ? ICONS.pass : ICONS.fail}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{criterion.label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{criterion.message}</p>
      </div>
      <span className={`shrink-0 text-xs font-medium self-start ${passed ? "text-green-400" : "text-red-400"}`}>
        {passed ? `+${criterion.points}` : "0"} / {criterion.points} pts
      </span>
    </div>
  );
}

export default function SubmissionFeedback({ submission }) {
  if (!submission) return null;

  const { automated_score, total_points, criteria_results, instructor_feedback, instructor_score } = submission;
  const finalScore = instructor_score !== null && instructor_score !== undefined ? instructor_score : automated_score;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">Submission Feedback</h3>
        <div className="text-right">
          <span className="text-lg font-bold text-white">{finalScore}</span>
          <span className="text-gray-500 text-sm"> / {total_points} pts</span>
          {instructor_score !== null && instructor_score !== undefined && (
            <p className="text-xs text-blue-400">Instructor adjusted</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {(criteria_results || []).map((c, i) => (
          <CriterionRow key={i} criterion={c} />
        ))}
      </div>

      {instructor_feedback && (
        <div className="bg-blue-950/30 border border-blue-800/50 rounded p-3">
          <p className="text-xs font-medium text-blue-400 mb-1">Instructor feedback</p>
          <p className="text-sm text-gray-300">{instructor_feedback}</p>
        </div>
      )}
    </div>
  );
}
