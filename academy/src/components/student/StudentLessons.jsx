import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { listLessons } from "../../api/lessons";

export default function StudentLessons() {
  const navigate = useNavigate();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "incomplete" | "complete"
  const [search, setSearch] = useState("");

  useEffect(() => {
    listLessons()
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return lessons.filter((l) => {
      const matchesFilter =
        filter === "all" ||
        (filter === "complete" && l.completed) ||
        (filter === "incomplete" && !l.completed);
      const matchesSearch =
        !q ||
        l.title.toLowerCase().includes(q) ||
        l.module_title.toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [lessons, filter, search]);

  // Group by module
  const grouped = useMemo(() => {
    const map = {};
    for (const l of filtered) {
      if (!map[l.module_id]) map[l.module_id] = { module_title: l.module_title, items: [] };
      map[l.module_id].items.push(l);
    }
    return Object.entries(map).map(([id, group]) => ({ moduleId: id, ...group }));
  }, [filtered]);

  const completedCount = lessons.filter((l) => l.completed).length;
  const totalMinutes = lessons.reduce((sum, l) => sum + l.estimated_minutes, 0);
  const completedMinutes = lessons
    .filter((l) => l.completed)
    .reduce((sum, l) => sum + l.estimated_minutes, 0);

  function handleClick(lesson) {
    navigate(`/modules/${lesson.module_id}?lesson=${lesson.id}`);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Lessons</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {completedCount} of {lessons.length} completed · {completedMinutes} / {totalMinutes} min
          </p>
        </div>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="15" height="15" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search lessons…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex gap-2">
          {[
            { id: "all", label: "All" },
            { id: "incomplete", label: "To Do" },
            { id: "complete", label: "Done" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
              }`}
            >
              {f.label}
              {f.id === "all" && ` (${lessons.length})`}
              {f.id === "incomplete" && ` (${lessons.length - completedCount})`}
              {f.id === "complete" && ` (${completedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Lesson list */}
      {loading ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400 text-sm">
          Loading lessons…
        </div>
      ) : lessons.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <div className="text-2xl mb-2">📖</div>
          <div className="text-sm font-medium text-gray-600">No lessons published yet</div>
          <div className="text-xs text-gray-400 mt-1">
            Lessons will appear here once your instructor publishes course content.
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
          <div className="text-sm text-gray-500">No lessons match</div>
          <button
            onClick={() => { setFilter("all"); setSearch(""); }}
            className="mt-2 text-sm text-blue-600"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <section key={group.moduleId}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-semibold text-gray-700">{group.module_title}</span>
                <span className="text-xs text-gray-400">
                  {group.items.filter((l) => l.completed).length}/{group.items.length} done
                </span>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {group.items.map((lesson) => (
                  <button
                    key={lesson.id}
                    onClick={() => handleClick(lesson)}
                    className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-base flex-shrink-0">
                      {lesson.completed ? "✅" : "📖"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${lesson.completed ? "text-gray-400 line-through" : "text-gray-900"}`}>
                        {lesson.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className="text-xs text-gray-400">
                        {lesson.estimated_minutes} min
                      </span>
                      {lesson.completed && (
                        <span className="text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2 py-0.5">
                          Done
                        </span>
                      )}
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
