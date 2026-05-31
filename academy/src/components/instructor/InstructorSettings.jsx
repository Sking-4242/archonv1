import { useNavigate } from "react-router-dom";
import useAuthStore from "../../store/authStore";

const MORE_LINKS = [
  { label: "Teaching Assistant", path: "/instructor/assistant", desc: "AI copilot for labs, lessons, and class support" },
  { label: "Lesson Plans", path: "/instructor/lesson-plans", desc: "Author and edit lesson content" },
  { label: "Rubric Bank", path: "/instructor/rubric-bank", desc: "Reference rubric patterns" },
  { label: "Announcements", path: "/instructor/announcements", desc: "Class announcements" },
  { label: "Teams", path: "/instructor/teams", desc: "Student team groupings" },
];

export default function InstructorSettings() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Course Settings</h1>

      {/* Account info */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">Account</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
            <div className="mt-1 text-sm text-gray-900">{user?.name}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Email</label>
            <div className="mt-1 text-sm text-gray-900">{user?.email}</div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
            <div className="mt-1">
              <span className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2 py-0.5 font-medium capitalize">
                {user?.role}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* More tools moved from primary nav */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-gray-800">More tools</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {MORE_LINKS.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className="text-left border border-gray-200 rounded-lg px-4 py-3 hover:border-blue-300 transition-colors"
            >
              <div className="text-sm font-medium text-gray-900">{link.label}</div>
              <div className="text-xs text-gray-400 mt-0.5">{link.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Placeholder settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h2 className="text-sm font-semibold text-gray-800">Course Configuration</h2>
        <p className="text-sm text-gray-500">
          Course-level settings (enrollment, grading policy, LMS integration) will be configurable here in a future update.
        </p>
        <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-xs text-gray-500">
          🚧 Coming in a future release
        </div>
      </div>
    </div>
  );
}
