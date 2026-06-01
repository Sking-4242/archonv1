import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { joinClass, myAssignedContent } from "../../api/classes";

function DueBadge({ dueDate, completed, status }) {
  if (completed || status === "graded" || status === "submitted") {
    return (
      <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">Done</span>
    );
  }
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const overdue = due < new Date();
  return (
    <span
      className={`text-xs px-2 py-0.5 rounded-full ${
        overdue ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
      }`}
    >
      {overdue ? "Overdue" : `Due ${due.toLocaleDateString()}`}
    </span>
  );
}

export default function StudentClasses() {
  const navigate = useNavigate();
  const [content, setContent] = useState({ classes: [] });
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const data = await myAssignedContent();
      setContent(data);
    } catch (err) {
      setError(err.message ?? "Could not load classes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await joinClass(joinCode.trim());
      setJoinCode("");
      setMessage(`Joined ${result.name}.`);
      await load();
    } catch (err) {
      setError(err.message ?? "Could not join class");
    } finally {
      setBusy(false);
    }
  }

  const classes = content.classes ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">My classes</h1>
        <p className="text-sm text-gray-500 mt-1">
          Join with a code from your instructor to see assigned modules, labs, and practice tests.
        </p>
      </div>

      <form
        onSubmit={handleJoin}
        className="bg-white border border-gray-200 rounded-xl p-5 flex flex-col sm:flex-row gap-3"
      >
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="Enter class code"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
        />
        <button
          type="submit"
          disabled={busy || !joinCode.trim()}
          className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg"
        >
          Join class
        </button>
      </form>

      {message && (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          {message}
        </div>
      )}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
      )}

      {loading ? (
        <div className="text-sm text-gray-400 p-8 text-center">Loading…</div>
      ) : classes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <p className="text-sm text-gray-500">You are not enrolled in any classes yet.</p>
          <p className="text-xs text-gray-400 mt-2">Ask your instructor for a class code.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {classes.map((cls) => (
            <section key={cls.class_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">{cls.name}</h2>
                <p className="text-xs text-gray-500 mt-1">
                  {cls.instructor_name} · {cls.course?.toUpperCase()}
                </p>
              </div>

              <div className="p-5 grid md:grid-cols-3 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Modules</h3>
                  {cls.modules?.length ? (
                    <ul className="space-y-2">
                      {cls.modules.map((m) => (
                        <li key={m.module_id}>
                          <button
                            type="button"
                            onClick={() => navigate(`/modules/${m.module_id}`)}
                            className="w-full text-left text-sm text-blue-600 hover:text-blue-800"
                          >
                            {m.title}
                          </button>
                          {m.due_date && (
                            <div className="text-xs text-gray-400 mt-0.5">
                              Due {new Date(m.due_date).toLocaleDateString()}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">None assigned</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Labs</h3>
                  {cls.assignments?.length ? (
                    <ul className="space-y-2">
                      {cls.assignments.map((a) => (
                        <li key={a.assignment_id} className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/assignment/${a.assignment_id}`)}
                            className="text-left text-sm text-blue-600 hover:text-blue-800"
                          >
                            {a.title}
                          </button>
                          <DueBadge dueDate={a.due_date} status={a.status} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">None assigned</p>
                  )}
                </div>

                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Practice tests</h3>
                  {cls.practice_tests?.length ? (
                    <ul className="space-y-2">
                      {cls.practice_tests.map((t) => (
                        <li key={t.link_id} className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/practice-tests?cert=${encodeURIComponent(t.cert)}`)
                            }
                            className="text-left text-sm text-blue-600 hover:text-blue-800"
                          >
                            {t.title}
                          </button>
                          <DueBadge dueDate={t.due_date} completed={t.completed} />
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">None assigned</p>
                  )}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
