import { useEffect, useState } from "react";
import {
  clearQuickCheckState,
  hasQuickCheckProgress,
  loadQuickCheckState,
  saveQuickCheckAnswer,
} from "../../utils/quickCheckStorage";

function optionClasses({ submitted, isSelected, isCorrect }) {
  if (!submitted) {
    return isSelected
      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-200"
      : "border-gray-200 bg-white hover:border-gray-300";
  }
  if (isCorrect) return "border-green-500 bg-green-50 ring-1 ring-green-200";
  if (isSelected && !isCorrect) return "border-red-400 bg-red-50 ring-1 ring-red-200";
  return "border-gray-200 bg-white opacity-70";
}

function QuickCheckQuestion({ storageKey, question, resetVersion, onAnswered }) {
  const saved = loadQuickCheckState(storageKey)[String(question.id)] ?? {};
  const [selected, setSelected] = useState(saved.selected ?? null);
  const [submitted, setSubmitted] = useState(Boolean(saved.submitted));

  useEffect(() => {
    const next = loadQuickCheckState(storageKey)[String(question.id)] ?? {};
    setSelected(next.selected ?? null);
    setSubmitted(Boolean(next.submitted));
  }, [storageKey, question.id, resetVersion]);

  const isCorrect = submitted && selected === question.answer;

  function handleSubmit() {
    if (!selected || submitted) return;
    saveQuickCheckAnswer(storageKey, question.id, selected);
    setSubmitted(true);
    onAnswered?.();
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <p className="text-sm font-medium text-gray-900 leading-relaxed">
        <span className="text-blue-600">Q{question.id}.</span> {question.prompt}
      </p>

      <fieldset className="space-y-2" disabled={submitted}>
        <legend className="sr-only">Answer choices for question {question.id}</legend>
        {question.options.map((option) => {
          const isSelected = selected === option.key;
          const isCorrectOption = option.key === question.answer;
          return (
            <label
              key={option.key}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${optionClasses({
                submitted,
                isSelected,
                isCorrect: submitted && isCorrectOption,
              })} ${submitted ? "cursor-default" : ""}`}
            >
              <input
                type="radio"
                name={`quick-check-${storageKey}-${question.id}-${resetVersion}`}
                value={option.key}
                checked={isSelected}
                onChange={() => setSelected(option.key)}
                className="mt-0.5 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-800 leading-relaxed">
                <span className="font-semibold text-gray-900">{option.key})</span>{" "}
                {option.text}
              </span>
            </label>
          );
        })}
      </fieldset>

      {!submitted ? (
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!selected}
          className="text-sm font-medium px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Check answer
        </button>
      ) : (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            isCorrect
              ? "border-green-200 bg-green-50 text-green-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          <div className="font-semibold mb-1">
            {isCorrect ? "Correct" : `Not quite — the answer is ${question.answer}`}
          </div>
          <p className="leading-relaxed text-gray-700">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}

export default function QuickCheckSection({ storageKey, questions }) {
  const [resetVersion, setResetVersion] = useState(0);
  const [showReset, setShowReset] = useState(() =>
    hasQuickCheckProgress(
      storageKey,
      questions.map((q) => q.id),
    ),
  );

  useEffect(() => {
    setShowReset(
      hasQuickCheckProgress(
        storageKey,
        questions.map((q) => q.id),
      ),
    );
  }, [storageKey, questions, resetVersion]);

  if (!questions?.length) return null;

  function handleReset() {
    clearQuickCheckState(storageKey);
    setResetVersion((v) => v + 1);
    setShowReset(false);
  }

  return (
    <section className="mt-8 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Quick Check</h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose an answer and check each question before viewing the explanation.
          </p>
        </div>
        {showReset && (
          <button
            type="button"
            onClick={handleReset}
            className="shrink-0 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Try again
          </button>
        )}
      </div>
      <div className="space-y-4">
        {questions.map((question) => (
          <QuickCheckQuestion
            key={question.id}
            storageKey={storageKey}
            question={question}
            resetVersion={resetVersion}
            onAnswered={() => setShowReset(true)}
          />
        ))}
      </div>
    </section>
  );
}
