import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const STUDENT_TABS = [
  { label: "Home", path: "/dashboard" },
  { label: "Assignments", path: "/assignments" },
  { label: "Modules", path: "/modules" },
  { label: "Lessons", path: "/lessons" },
  { label: "Components", path: "/library" },
  { label: "Course Library", path: "/course-library" },
  { label: "Sandbox", path: "/sandbox" },
  { label: "Grades", path: "/grades" },
  { label: "Practice Tests", path: "/practice-tests" },
  { label: "Tools", path: "/tools" },
  { label: "Teams", path: "/teams" },
  { label: "Announcements", path: "/announcements" },
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

export default function AppShell({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();

  const tabs = user?.role === "instructor" ? INSTRUCTOR_TABS : STUDENT_TABS;

  function handleLogout() {
    logout();
    navigate("/login");
  }

  function isActive(tab) {
    if (tab.path === "/dashboard" || tab.path === "/instructor") {
      return location.pathname === tab.path;
    }
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
            {user?.role === "instructor" && (
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium">
                Instructor
              </span>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-4">
            {/* Notification bell */}
            <button className="text-gray-400 hover:text-gray-600 transition-colors relative">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </button>

            {/* User avatar + name */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">
                {initials}
              </div>
              <span className="text-sm text-gray-700 font-medium hidden sm:block">{user?.name}</span>
            </div>

            {/* Sign out */}
            <button
              onClick={handleLogout}
              className="text-xs text-gray-500 hover:text-gray-800 transition-colors border border-gray-200 rounded px-2.5 py-1 hover:border-gray-300"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-screen-2xl mx-auto px-6">
          <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`
                  whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors
                  ${
                    isActive(tab)
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300"
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-screen-2xl mx-auto w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
