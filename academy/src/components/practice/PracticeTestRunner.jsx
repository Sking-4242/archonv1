import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  checkPracticeTestAnswer,
  fetchPracticeTestAttempt,
  savePracticeTestAnswer,
  submitPracticeTest,
} from "../../api/practiceTests";
import PracticeTestResults from "./PracticeTestResults";

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function OptionButton({ label, text, selected, onClick, disabled, resultTone }) {
  let className =
    "w-full text-left rounded-xl border px-4 py-3 text-sm transition-colors ";
  if (resultTone === "correct") {
    className += "border-green-500 bg-green-50 text-green-900";
  } else if (resultTone === "incorrect") {
    className += "border-red-400 bg-red-50 text-red-900";
  } else if (selected) {
    className += "border-blue-600 bg-blue-50 text-blue-900";
  } else {
    className += "border-gray-200 hover:border-blue-300 text-gray-800";
  }
  if (disabled) className += " cursor-default";

  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      <span className="font-semibold mr-2">{label}.</span>
      {text}
    </button>
  );
}

export default function PracticeTestRunner() {
  const { attemptId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [checkedQuestions, setCheckedQuestions] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [startedAt] = useState(() => Date.now());
  const [secondsLeft, setSecondsLeft] = useState(null);

  const isStudy = attempt?.mode === "study";
  const isLive = attempt?.mode === "live";
  const isComplete = attempt?.status === "completed" || !!results;
  const currentQuestion = questions[currentIndex];

  const selectedAnswer = currentQuestion ? answers[currentQuestion.id] : null;

  const loadAttempt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPracticeTestAttempt(Number(attemptId));
      setAttempt(data.attempt);
      setQuestions(data.questions ?? []);
      setAnswers(data.answers ?? {});
      if (data.attempt.status === "completed" && data.results) {
        setResults(data.results);
      }
      if (data.attempt.mode === "live" && data.attempt.status === "in_progress") {
        const elapsed = Math.floor(
          (Date.now() - new Date(data.attempt.started_at).getTime()) / 1000
        );
        const remaining = Math.max(0, (data.attempt.time_limit_seconds ?? 0) - elapsed);
        setSecondsLeft(remaining);
      }
    } catch (err) {
      setError(err.message || "Failed to load test");
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    loadAttempt();
  }, [loadAttempt]);

  const handleSubmit = useCallback(
    async (auto = false) => {
      if (submitting || isComplete) return;
      setSubmitting(true);
      setError(null);
      try {
        for (const [questionId, answer] of Object.entries(answers)) {
          await savePracticeTestAnswer(Number(attemptId), questionId, answer);
        }
        const timeSpentSeconds = Math.round((Date.now() - startedAt) / 1000);
        const data = await submitPracticeTest(Number(attemptId), {
          answers,
          timeSpentSeconds,
        });
        setAttempt(data.attempt);
        setResults(data.results);
        if (auto) {
          setError("Time is up — your test was submitted automatically.");
        }
      } catch (err) {
        setError(err.message || "Failed to submit test");
      } finally {
        setSubmitting(false);
      }
    },
    [submitting, isComplete, answers, attemptId, startedAt]
  );

  useEffect(() => {
    if (!isLive || isComplete || secondsLeft == null) return undefined;
    if (secondsLeft <= 0) {
      handleSubmit(true);
      return undefined;
    }
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev == null ? prev : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isLive, isComplete, secondsLeft, handleSubmit]);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] != null).length,
    [questions, answers]
  );

  function toggleSingle(optionKey) {
    if (!currentQuestion || isComplete) return;
    if (isStudy && checkedQuestions[currentQuestion.id]) return;
    setFeedback(null);
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: optionKey }));
  }

  function toggleMultiple(optionKey) {
    if (!currentQuestion || isComplete) return;
    if (isStudy && checkedQuestions[currentQuestion.id]) return;
    setFeedback(null);
    setAnswers((prev) => {
      const existing = Array.isArray(prev[currentQuestion.id]) ? [...prev[currentQuestion.id]] : [];
      const idx = existing.indexOf(optionKey);
      if (idx >= 0) existing.splice(idx, 1);
      else if (existing.length < 2) existing.push(optionKey);
      return { ...prev, [currentQuestion.id]: existing.sort() };
    });
  }

  async function persistAnswer(questionId, answer) {
    try {
      await savePracticeTestAnswer(Number(attemptId), questionId, answer);
    } catch {
      /* best-effort autosave */
    }
  }

  async function handleCheckAnswer() {
    if (!currentQuestion || selectedAnswer == null) return;
    try {
      const data = await checkPracticeTestAnswer(
        Number(attemptId),
        currentQuestion.id,
        selectedAnswer
      );
      setFeedback(data);
      setCheckedQuestions((prev) => ({ ...prev, [currentQuestion.id]: true }));
    } catch (err) {
      setError(err.message || "Could not check answer");
    }
  }

  function optionTone(optionKey) {
    if (!feedback) return null;
    const correct = feedback.correct_answer;
    if (Array.isArray(correct)) {
      if (correct.includes(optionKey)) return "correct";
      if (Array.isArray(selectedAnswer) && selectedAnswer.includes(optionKey)) return "incorrect";
      return null;
    }
    if (optionKey === correct) return "correct";
    if (optionKey === selectedAnswer) return "incorrect";
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        Loading practice test…
      </div>
    );
  }

  if (error && !attempt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={() => navigate("/practice-tests")}
          className="text-sm text-blue-600 hover:underline"
        >
          Back to practice tests
        </button>
      </div>
    );
  }

  if (isComplete && results) {
    return (
      <PracticeTestResults
        attempt={attempt}
        results={results}
        onRetake={() => navigate("/practice-tests")}
      />
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 text-sm">
        No questions in this test.
      </div>
    );
  }

  const optionKeys = Object.keys(currentQuestion.options ?? {}).sort();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 px-4 md:px-6 py-3">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-gray-900">
              {attempt.cert.toUpperCase()} · Test {attempt.test_number}
            </div>
            <div className="text-xs text-gray-500 capitalize">{attempt.mode} mode</div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              {answeredCount}/{questions.length} answered
            </span>
            {isLive && secondsLeft != null && (
              <span
                className={`font-mono font-semibold ${
                  secondsLeft < 300 ? "text-red-600" : "text-gray-900"
                }`}
              >
                {formatTime(secondsLeft)}
              </span>
            )}
            {isStudy && <span className="text-gray-500">Unlimited time</span>}
          </div>
          <button
            onClick={() => navigate("/practice-tests")}
            className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded px-2.5 py-1"
          >
            Exit
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full flex-1 flex flex-col md:flex-row gap-0 md:gap-6 px-4 md:px-6 py-6">
        <aside className="md:w-56 shrink-0 mb-4 md:mb-0">
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Questions
            </div>
            <div className="grid grid-cols-6 md:grid-cols-4 gap-1.5 max-h-48 md:max-h-[420px] overflow-y-auto">
              {questions.map((q, idx) => {
                const answered = answers[q.id] != null;
                const active = idx === currentIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => {
                      setCurrentIndex(idx);
                      setFeedback(null);
                    }}
                    className={`h-8 rounded text-xs font-medium ${
                      active
                        ? "bg-blue-600 text-white"
                        : answered
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "bg-gray-50 text-gray-600 border border-gray-200"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0">
          {error && (
            <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              {error}
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
            <div className="text-xs text-blue-600 font-medium mb-2">{currentQuestion.domain}</div>
            <h2 className="text-base md:text-lg font-medium text-gray-900 leading-relaxed mb-6">
              {currentQuestion.question}
            </h2>

            <div className="space-y-3">
              {optionKeys.map((key) => (
                <OptionButton
                  key={key}
                  label={key}
                  text={currentQuestion.options[key]}
                  selected={
                    currentQuestion.question_type === "multiple"
                      ? Array.isArray(selectedAnswer) && selectedAnswer.includes(key)
                      : selectedAnswer === key
                  }
                  onClick={() =>
                    currentQuestion.question_type === "multiple"
                      ? toggleMultiple(key)
                      : toggleSingle(key)
                  }
                  disabled={isStudy && !!checkedQuestions[currentQuestion.id]}
                  resultTone={isStudy ? optionTone(key) : null}
                />
              ))}
            </div>

            {isStudy && feedback && (
              <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3 text-sm">
                <div
                  className={`font-semibold ${
                    feedback.correct ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {feedback.correct ? "Correct" : "Incorrect"}
                </div>
                {feedback.explanation && (
                  <p className="text-gray-800 leading-relaxed">{feedback.explanation}</p>
                )}
                {!feedback.correct && feedback.distractors && selectedAnswer != null && (
                  <div className="space-y-2 pt-2 border-t border-gray-200">
                    {(Array.isArray(selectedAnswer) ? selectedAnswer : [selectedAnswer]).map(
                      (key) =>
                        feedback.distractors[key] ? (
                          <p key={key} className="text-gray-700">
                            <span className="font-semibold">{key}:</span> {feedback.distractors[key]}
                          </p>
                        ) : null
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6 border-t border-gray-100">
              <button
                type="button"
                disabled={currentIndex === 0}
                onClick={() => {
                  setCurrentIndex((i) => Math.max(0, i - 1));
                  setFeedback(null);
                }}
                className="text-sm text-gray-600 disabled:opacity-40 hover:text-gray-900"
              >
                ← Previous
              </button>

              <div className="flex flex-wrap gap-2">
                {isStudy && !checkedQuestions[currentQuestion.id] && (
                  <button
                    type="button"
                    disabled={selectedAnswer == null}
                    onClick={async () => {
                      await persistAnswer(currentQuestion.id, selectedAnswer);
                      await handleCheckAnswer();
                    }}
                    className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-medium hover:bg-blue-50 disabled:opacity-40"
                  >
                    Check answer
                  </button>
                )}
                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedAnswer != null) {
                        await persistAnswer(currentQuestion.id, selectedAnswer);
                      }
                      setCurrentIndex((i) => i + 1);
                      setFeedback(null);
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleSubmit(false)}
                    className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : "Finish test"}
                  </button>
                )}
              </div>
            </div>

            {isLive && (
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => handleSubmit(false)}
                  className="text-sm text-green-700 font-medium hover:underline disabled:opacity-50"
                >
                  Submit test early
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
