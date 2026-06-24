import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";

// ── Student navigation: 4 hubs, each with in-hub sub-tabs ──────────────────────
const STUDENT_HUBS = [
  {
    label: "Home",
    default: "/dashboard",
    paths: ["/dashboard"],
    subTabs: [],
  },
  {
    label: "Learn",
    default: "/course-library",
    paths: ["/course-library", "/services", "/modules", "/lessons"],
    subTabs: [
      { label: "Cert Paths", path: "/course-library" },
      { label: "Services", path: "/services" },
      { label: "Modules", path: "/modules" },
      { label: "Lessons", path: "/lessons" },
    ],
  },
  {
    label: "Practice",
    default: "/practice-tests",
    paths: ["/practice-tests", "/sandbox", "/library", "/tools"],
    subTabs: [
      { label: "Practice Exams", path: "/practice-tests" },
      { label: "Sandbox", path: "/sandbox" },
      { label: "Components", path: "/library" },
      { label: "Tools", path: "/tools" },
    ],
  },
  {
    label: "Classes",
    default: "/classes",
    paths: ["/classes", "/assignments", "/grades"],
    subTabs: [
      { label: "My Classes", path: "/classes" },
      { label: "Assignments", path: "/assignments" },
      { label: "Grades", path: "/grades" },
    ],
  },
];

// Secondary items moved out of the tab bar into the account menu
const STUDENT_MENU = [
  { label: "Announcements", path: "/announcements" },
  { label: "Teams", path: "/teams" },
];

const INSTRUCTOR_TABS = [
  { label: "Dashboard", path: "/instructor" },
  { label: "Classes", path: "/instructor/classes" },
  { label: "Assignments", path: "/instructor/assignments" },
  { label: "Modules", path: "/instructor/modules" },
  { label: "Gradebook", path: "/instructor/gradebook" },
  { label: "Assistant", path: "/instructor/assistant" },
  { label: "Analytics", path: "/instructor/analytics" },
  { label: "Settings", path: "/instructor/settings" },
];

function pathMatches(pathname, p) {
  return pathname === p || pathname.startsWith(p + "/");
}

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const isInstructor = user?.role === "instructor";

  function handleLogout() {
    logout();
    navigate("/login");
  }

  // Determine the active student hub from the current route
  const activeHub =
    !isInstructor &&
    STUDENT_HUBS.find((h) => h.paths.some((p) => pathMatches(location.pathname, p)));
  const subTabs = activeHub ? activeHub.subTabs : [];

  function isInstructorTabActive(tab) {
    if (tab.path === "/instructor") return location.pathname === tab.path;
    return location.pathname.startsWith(tab.path);
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top nav bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Branding */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 2L14 5.5V10.5L8 14L2 10.5V5.5L8 2Z" stroke="white" strokeWidth="1.5" fill="none" />
                  <circle cx="8" cy="8" r="2" fill="white" />
                </svg>
              </div>
              <span className="font-semibold text-gray-900 text-sm tracking-tight">
                Archon <span className="text-blue-600">Academy</span>
              </span>
            </div>
            {isInstructor && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
                Instructor
              </span>
            )}
          </div>

          {/* Account dropdown */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-gray-50 transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                {initials}
              </div>
              <span className="text-sm text-gray-700 font-medium hidden sm:block">{user?.name}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 py-1.5">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="text-sm font-medium text-gray-900 truncate">{user?.name}</div>
                    <div className="text-xs text-gray-400 capitalize">{user?.role}</div>
                  </div>
                  {!isInstructor &&
                    STUDENT_MENU.map((item) => (
                      <button
                        key={item.path}
                        onClick={() => {
                          setMenuOpen(false);
                          navigate(item.path);
                        }}
                        className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      >
                        {item.label}
                      </button>
                    ))}
                  {isInstructor && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/instructor/settings");
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      Settings
                    </button>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Primary navigation */}
        <div className="max-w-screen-2xl mx-auto px-6">
          {isInstructor ? (
            <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
              {INSTRUCTOR_TABS.map((tab) => (
                <button
                  key={tab.path}
                  onClick={() => navigate(tab.path)}
                  className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    isInstructorTabActive(tab)
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          ) : (
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
              {STUDENT_HUBS.map((hub) => {
                const active = activeHub && activeHub.label === hub.label;
                return (
                  <button
                    key={hub.label}
                    onClick={() => navigate(hub.default)}
                    className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                      active
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                    }`}
                  >
                    {hub.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Secondary (in-hub) sub-tabs */}
        {subTabs.length > 0 && (
          <div className="bg-gray-50/80 border-t border-gray-100">
            <div className="max-w-screen-2xl mx-auto px-6">
              <nav className="flex gap-4 overflow-x-auto scrollbar-hide">
                {subTabs.map((st) => {
                  const active = pathMatches(location.pathname, st.path);
                  return (
                    <button
                      key={st.path}
                      onClick={() => navigate(st.path)}
                      className={`whitespace-nowrap py-2 text-sm transition-colors border-b-2 ${
                        active
                          ? "border-blue-500 text-blue-600 font-medium"
                          : "border-transparent text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      {st.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8">{children}</main>
    </div>
  );
}
