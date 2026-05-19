import useAuthStore from "../../store/authStore";

export default function InstructorSettings() {
  const { user } = useAuthStore();

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
