import ComingSoon from "../layout/ComingSoon";

export default function StudentModules() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Modules</h1>
      <ComingSoon
        icon="📦"
        title="No modules yet"
        description="Your instructor hasn't published any modules for this course. Check back soon."
      />
    </div>
  );
}
