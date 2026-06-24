import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";
import { listAssignments } from "../../api/assignments";
import { joinClass, myEnrolledClasses } from "../../api/classes";
import { listCerts, listLibrary } from "../../api/library";
import { fetchPracticeTestAttempts } from "../../api/practiceTests";

const COURSE = "aws";

const LEVEL_BADGE = {
  foundational: "bg-green-50 text-green-700 border-green-200",
  associate: "bg-blue-50 text-blue-700 border-blue-200",
  professional: "bg-purple-50 text-purple-700 border-purple-200",
  specialty: "bg-orange-50 text-orange-700 border-orange-200",
};

function ProgressBar({ pct, tone = "bg-blue-500" }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${tone} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function StudentHome() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  const [certs, setCerts] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [joinCode, setJoinCode] = useState("");
  const [joinMessage, setJoinMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      listCerts(COURSE),
      listLibrary(COURSE),
      fetchPracticeTestAttempts(),
      listAssignments(),
      myEnrolledClasses(),
    ])
      .then(([c, l, at, a, cl]) => {
        if (c.status === "fulfilled") setCerts(c.value ?? []);
        if (l.status === "fulfilled") setLessons(l.value ?? []);
        if (at.status === "fulfilled") setAttempts(at.value ?? []);
        if (a.status === "fulfilled") setAssignments(a.value ?? []);
        if (cl.status === "fulfilled") setClasses(cl.value ?? []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Per-cert lesson progress, computed from the library lessons' certification tags
  const certCards = useMemo(() => {
    const byCode = {};
    for (const lesson of lessons) {
      for (const code of lesson.certification_tags ?? []) {
        const b = (byCode[code] ??= { total: 0, done: 0 });
        b.total += 1;
        if (lesson.completed) b.done += 1;
      }
    }
    return certs
      .map((cert) => {
        const b = byCode[cert.code] ?? { total: 0, done: 0 };
        const pct = b.total === 0 ? 0 : Math.round((b.done / b.total) * 100);
        return { ...cert, total: b.total, done: b.done, pct };
      })
      .filter((c) => c.total > 0)
      .sort((a, b) => {
        const aInProg = a.pct > 0 && a.pct < 100 ? 0 : 1;
        const bInProg = b.pct > 0 && b.pct < 100 ? 0 : 1;
        if (aInProg !== bInProg) return aInProg - bInProg;
        return b.pct - a.pct;
      });
  }, [certs, lessons]);

  const activeCert = useMemo(() => {
    const inProgress = certCards.filter((c) => c.pct > 0 && c.pct < 100);
    if (inProgress.length) return inProgress[0];
    return certCards[0] ?? null;
  }, [certCards]);

  const recentAttempts = useMemo(
    () => attempts.filter((a) => a.status === "completed").slice(0, 3),
    [attempts]
  );

  const upcoming = assignments.filter(
    (a) => a.status === "not_started" || a.status === "in_progress"
  );

  function openCert(code) {
    navigate(`/course-library?provider=${COURSE}&cert=${encodeURIComponent(code)}`);
  }

  async function handleQuickJoin(e) {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoinMessage("");
    try {
      const result = await joinClass(joinCode.trim());
      setJoinCode("");
      setJoinMessage(`Joined ${result.name}.`);
      setClasses(await myEnrolledClasses());
    } catch (err) {
      setJoinMessage(err.message ?? "Could not join");
    }
  }

  return (
    <div className="space-y-8">
      {/* Continue-studying banner */}
      <div className="bg-blue-600 rounded-2xl px-8 py-7 flex items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-blue-100 text-sm">Welcome back, {user?.name?.split(" ")[0] ?? "Student"}</p>
          {activeCert ? (
            <>
              <h1 className="text-2xl font-bold text-white mt-1 truncate">
                Continue {activeCert.short_name || activeCert.name}
              </h1>
              <p className="text-blue-100 mt-1 text-sm">
                {activeCert.done}/{activeCert.total} lessons · {activeCert.pct}% complete
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-white mt-1">Pick a certification to start</h1>
              <p className="text-blue-100 mt-1 text-sm">
                Choose a cert path and follow its domain-weighted study plan.
              </p>
            </>
          )}
        </div>
        <button
          onClick={() => (activeCert ? openCert(activeCert.code) : navigate("/course-library"))}
          className="shrink-0 bg-white text-blue-700 text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-blue-50 transition-colors"
        >
          {activeCert ? "Resume" : "Browse cert paths"}
        </button>
      </div>

      {/* Cert paths */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">Your cert paths</h2>
          <button
            onClick={() => navigate("/course-library")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View all →
          </button>
        </div>
        {loading ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Loading…
          </div>
        ) : certCards.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            No cert progress yet — open a cert path to begin.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {certCards.map((cert) => (
              <button
                key={cert.code}
                onClick={() => openCert(cert.code)}
                className="text-left bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 transition-colors flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900 text-sm truncate">
                      {cert.short_name || cert.name}
                    </div>
                    <div className="text-xs text-gray-400 font-mono mt-0.5">{cert.code}</div>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full border font-medium capitalize shrink-0 ${
                      LEVEL_BADGE[cert.level] ?? "bg-gray-50 text-gray-600 border-gray-200"
                    }`}
                  >
                    {cert.level}
                  </span>
                </div>
                <div>
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{cert.done}/{cert.total} lessons</span>
                    <span className="font-medium text-gray-700">{cert.pct}%</span>
                  </div>
                  <ProgressBar pct={cert.pct} tone={cert.pct >= 80 ? "bg-green-500" : "bg-blue-500"} />
                </div>
                <span className="text-xs text-blue-600 font-medium">
                  {cert.pct === 0 ? "Start →" : cert.pct === 100 ? "Review →" : "Resume →"}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Two-column: up next + recent practice */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Up next (assignments) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Up next</h2>
            <button
              onClick={() => navigate("/assignments")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View all →
            </button>
          </div>
          {upcoming.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
              No upcoming assignments
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  onClick={() => navigate(`/assignment/${a.id}`)}
                  className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{a.title}</div>
                    {a.due_date && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        Due {new Date(a.due_date).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                      a.status === "in_progress" ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {a.status === "in_progress" ? "In progress" : "Not started"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Recent practice scores */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent practice</h2>
            <button
              onClick={() => navigate("/practice-tests")}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Practice tests →
            </button>
          </div>
          {recentAttempts.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
              No practice tests taken yet
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((a) => {
                const pct = a.percent ?? 0;
                const passed = pct >= 70;
                return (
                  <div
                    key={a.id ?? `${a.cert}-${a.test_number}`}
                    className="bg-white border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 text-sm truncate">
                        {a.cert} · Test {a.test_number}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 capitalize">{a.mode} mode</div>
                    </div>
                    <span
                      className={`text-sm font-semibold shrink-0 ${
                        passed ? "text-green-600" : "text-orange-600"
                      }`}
                    >
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Classes / quick join */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">My classes</h2>
            <p className="text-xs text-gray-500 mt-1">
              {classes.length > 0
                ? `Enrolled in ${classes.length} class${classes.length !== 1 ? "es" : ""}`
                : "Join with a code from your instructor"}
            </p>
          </div>
          <button
            onClick={() => navigate("/classes")}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium shrink-0"
          >
            View all →
          </button>
        </div>
        <form onSubmit={handleQuickJoin} className="flex gap-2">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            placeholder="Class code"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
          />
          <button
            type="submit"
            disabled={!joinCode.trim()}
            className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg disabled:opacity-50"
          >
            Join
          </button>
        </form>
        {joinMessage && <p className="text-xs text-green-700">{joinMessage}</p>}
      </section>
    </div>
  );
}
