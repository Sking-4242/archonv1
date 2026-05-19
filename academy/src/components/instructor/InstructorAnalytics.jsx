import ComingSoon from "../layout/ComingSoon";

export default function InstructorAnalytics() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Analytics</h1>
      <ComingSoon
        icon="📊"
        title="Analytics dashboard coming soon"
        description="Track student progress, submission rates, average scores, and common architecture mistakes across your course."
      />
    </div>
  );
}
