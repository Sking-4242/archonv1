import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchPracticeTestAttempts,
  fetchPracticeTestCatalog,
  startPracticeTest,
} from "../../api/practiceTests";
import useAccessStore from "../../store/accessStore";
import UpgradePrompt from "../ui/UpgradePrompt";
import { difficultyLabel, modeLabel } from "../../utils/tierGates";

function ModePicker({ test, onStart, starting }) {
  const [mode, setMode] = useState("study");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        value={mode}
        onChange={(e) => setMode(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
      >
        <option value="study">Study mode</option>
        <option value="live">Live mode</option>
      </select>
      <button
        type="button"
        disabled={starting}
        onClick={() => onStart(test, mode)}
        className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {starting ? "Starting…" : "Start"}
      </button>
    </div>
  );
}

export default function StudentPracticeTests() {
  const navigate = useNavigate();
  const canUse = useAccessStore((s) => s.canUse);
  const loaded = useAccessStore((s) => s.loaded);

  const [catalog, setCatalog] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [startingKey, setStartingKey] = useState(null);

  useEffect(() => {
    Promise.all([fetchPracticeTestCatalog(), fetchPracticeTestAttempts("aws-cp")])
      .then(([catalogData, historyData]) => {
        setCatalog(catalogData.certs ?? []);
        setHistory(historyData ?? []);
      })
      .catch((err) => setError(err.message || "Failed to load practice tests"))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart(testMeta, cert, mode) {
    const key = `${cert}-${testMeta.test_number}-${mode}`;
    setStartingKey(key);
    setError(null);
    try {
      const data = await startPracticeTest({
        cert,
        testNumber: testMeta.test_number,
        mode,
      });
      navigate(`/practice-tests/run/${data.attempt.id}`);
    } catch (err) {
      setError(err.message || "Could not start test");
    } finally {
      setStartingKey(null);
    }
  }

  if (!loaded) {
    return <div className="text-sm text-gray-500">Loading access…</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Practice Tests</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          Timed live exams simulate test day. Study mode gives unlimited time with explanations
          after each question. Free accounts include AWS Cloud Practitioner Test 1.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-gray-500">Loading catalog…</div>
      ) : (
        catalog.map((certEntry) => (
          <section key={certEntry.cert} className="space-y-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">{certEntry.title}</h2>
              <p className="text-xs text-gray-500 uppercase tracking-wide mt-0.5">
                {certEntry.cert}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {certEntry.available_tests.map((test) => (
                <div
                  key={test.test_number}
                  className={`bg-white border rounded-xl p-5 flex flex-col gap-4 ${
                    test.accessible ? "border-gray-200" : "border-gray-100 opacity-90"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-gray-900">Test {test.test_number}</span>
                      {!test.accessible && (
                        <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
                          License required
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{difficultyLabel(test.difficulty)}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      {test.question_count} questions · {test.time_limit_minutes} min (live)
                    </p>
                  </div>

                  {test.accessible ? (
                    <ModePicker
                      test={test}
                      starting={startingKey === `${certEntry.cert}-${test.test_number}-study` ||
                        startingKey === `${certEntry.cert}-${test.test_number}-live`}
                      onStart={(t, mode) => handleStart(t, certEntry.cert, mode)}
                    />
                  ) : (
                    <UpgradePrompt
                      feature="academy_all_practice_tests"
                      compact
                      message="Tests 2–6 require an Academy license."
                    />
                  )}

                  <div className="text-xs text-gray-400">
                    {modeLabel("study")} · {modeLabel("live")}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))
      )}

      {history.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-3">Recent attempts</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Test</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {history.slice(0, 10).map((row) => (
                  <tr key={row.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      {row.cert} #{row.test_number}
                    </td>
                    <td className="px-4 py-3 capitalize">{row.mode}</td>
                    <td className="px-4 py-3">
                      {row.status === "completed"
                        ? `${row.percent}% (${row.score}/${row.total})`
                        : "In progress"}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(row.started_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => navigate(`/practice-tests/run/${row.id}`)}
                        className="text-blue-600 hover:underline text-xs font-medium"
                      >
                        {row.status === "completed" ? "Review" : "Resume"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!canUse("academy_all_practice_tests") && (
        <UpgradePrompt feature="academy_all_practice_tests" />
      )}
    </div>
  );
}
