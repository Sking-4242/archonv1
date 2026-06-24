import { useEffect, useMemo, useState } from "react";
import { listLibrary } from "../../api/library";
import { LibraryLessonReader } from "./StudentLibraryBrowser";

// Browsable, standalone reference of the shared service-reference lessons
// (slug "<course>/services/<name>"). These same lessons are linked from the
// cert paths, but here they form an A–Z catalog you can read directly.

const LEVEL_BADGE = {
  "CLF-C02": "bg-gray-100 text-gray-600",
  "AIF-C01": "bg-gray-100 text-gray-600",
  "SAA-C03": "bg-blue-100 text-blue-700",
  "SOA-C03": "bg-blue-100 text-blue-700",
  "DVA-C02": "bg-blue-100 text-blue-700",
  "SCS-C03": "bg-purple-100 text-purple-700",
};

const COURSE = "aws";

export default function StudentServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [currentUserRole, setCurrentUserRole] = useState("student");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("archon-academy-auth");
      setCurrentUserRole(JSON.parse(raw)?.state?.user?.role ?? "student");
    } catch {}
  }, []);

  useEffect(() => {
    setLoading(true);
    listLibrary(COURSE)
      .then((all) =>
        setServices(
          all
            .filter((l) => l.slug.startsWith(`${COURSE}/services/`))
            .sort((a, b) => a.title.localeCompare(b.title))
        )
      )
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  function handleComplete(lessonId, completed) {
    setServices((prev) =>
      prev.map((l) => (l.id === lessonId ? { ...l, completed } : l))
    );
  }

  const filtered = useMemo(() => {
    if (!search) return services;
    const q = search.toLowerCase();
    return services.filter((l) => l.title.toLowerCase().includes(q));
  }, [services, search]);

  return (
    <div className="flex h-[calc(100vh-8rem)] -mx-6 -my-4">
      {/* Sidebar */}
      <div className="w-72 xl:w-80 flex-shrink-0 border-r border-gray-200 flex flex-col bg-white overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <h2 className="font-bold text-gray-900 text-base">Service Reference</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Deep-dive lessons on individual AWS services, reused across cert paths.
          </p>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search services…"
            className="mt-3 w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400"
          />
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="text-xs text-gray-400 text-center py-8">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-xs text-gray-400 text-center py-8">
              No services match your search.
            </div>
          ) : (
            filtered.map((l) => (
              <button
                key={l.id}
                onClick={() => setSelected(l)}
                className={`w-full flex items-start gap-2.5 px-4 py-2.5 text-left transition-colors ${
                  selected?.id === l.id
                    ? "bg-blue-50 border-l-2 border-blue-500"
                    : "hover:bg-gray-50 border-l-2 border-transparent"
                }`}
              >
                <span className="text-sm flex-shrink-0 mt-0.5">
                  {l.completed ? "✅" : "🧩"}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm truncate ${
                      selected?.id === l.id ? "font-medium text-blue-700" : "text-gray-800"
                    }`}
                  >
                    {l.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 mt-1">
                    {(l.certification_tags || []).slice(0, 4).map((t) => (
                      <span
                        key={t}
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                          LEVEL_BADGE[t] ?? "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Reader pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {selected ? (
          <LibraryLessonReader
            lesson={selected}
            onComplete={handleComplete}
            onClose={() => setSelected(null)}
            currentUserRole={currentUserRole}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
            <div className="text-4xl">🧩</div>
            <div className="font-semibold text-gray-900">AWS Service Reference</div>
            <div className="text-sm text-gray-500 max-w-sm">
              {services.length} service deep-dives. Pick a service to read its full
              reference, or follow the links from any cert lesson that uses it.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
