import { useNavigate } from "react-router-dom";
import DomainBreakdownChart from "./DomainBreakdownChart";

export default function PracticeTestResults({ attempt, results, onRetake, onBack }) {
  const navigate = useNavigate();
  const goBack = onBack ?? (() => navigate("/practice-tests"));

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Test Results</h1>
            <p className="text-sm text-gray-500">
              {attempt.cert.toUpperCase()} · Test {attempt.test_number} · {attempt.mode} mode
            </p>
          </div>
          <button
            onClick={goBack}
            className="text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg px-3 py-1.5"
          >
            Back to tests
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div
            className={`text-5xl font-bold ${attempt.passed ? "text-green-600" : "text-amber-600"}`}
          >
            {attempt.percent}%
          </div>
          <div className="text-sm text-gray-600 mt-2">
            {attempt.score} of {attempt.total} correct
          </div>
          <div
            className={`inline-flex mt-4 text-sm font-medium px-3 py-1 rounded-full ${
              attempt.passed
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            {attempt.passed ? "Passing score" : "Keep studying — review weak domains below"}
          </div>
          {attempt.time_spent_seconds != null && (
            <div className="text-xs text-gray-400 mt-3">
              Time: {Math.floor(attempt.time_spent_seconds / 60)}m {attempt.time_spent_seconds % 60}s
            </div>
          )}
        </div>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Performance by domain</h2>
          <DomainBreakdownChart breakdown={results?.domain_breakdown ?? attempt.domain_breakdown} />
        </section>

        {(results?.recommendations?.length ?? attempt.recommendations?.length) > 0 && (
          <section className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Recommended study areas</h2>
            <ul className="space-y-3">
              {(results?.recommendations ?? attempt.recommendations).map((rec, idx) => (
                <li
                  key={`${rec.module_ref}-${idx}`}
                  className="border border-gray-100 rounded-xl px-4 py-3 text-sm"
                >
                  <div className="font-medium text-gray-900">{rec.domain}</div>
                  <div className="text-gray-600 mt-1">{rec.reason}</div>
                  <div className="text-xs text-blue-600 mt-2 font-mono">{rec.module_ref}</div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Question review</h2>
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {(results?.per_question ?? []).map((item, index) => (
              <div
                key={item.question_id}
                className={`rounded-xl border px-4 py-3 text-sm ${
                  item.correct
                    ? "border-green-200 bg-green-50/50"
                    : "border-red-200 bg-red-50/50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-gray-900">
                    Q{index + 1} · {item.domain}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      item.correct ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {item.correct ? "Correct" : "Incorrect"}
                  </span>
                </div>
                {!item.correct && (
                  <p className="text-gray-600 mt-2">
                    Your answer:{" "}
                    <span className="font-mono">
                      {Array.isArray(item.your_answer)
                        ? item.your_answer.join(", ")
                        : item.your_answer ?? "—"}
                    </span>
                    {" · "}
                    Correct:{" "}
                    <span className="font-mono">
                      {Array.isArray(item.correct_answer)
                        ? item.correct_answer.join(", ")
                        : item.correct_answer}
                    </span>
                  </p>
                )}
                {item.explanation && (
                  <p className="text-gray-700 mt-2 leading-relaxed">{item.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="flex flex-wrap gap-3 justify-center pb-8">
          {onRetake && (
            <button
              onClick={onRetake}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Retake test
            </button>
          )}
          <button
            onClick={goBack}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Practice tests home
          </button>
        </div>
      </main>
    </div>
  );
}
