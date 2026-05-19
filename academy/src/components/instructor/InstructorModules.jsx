import ComingSoon from "../layout/ComingSoon";

export default function InstructorModules() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Modules</h1>
      <ComingSoon
        icon="📦"
        title="Module builder coming soon"
        description="Create and organize course modules that students can work through sequentially."
      />
    </div>
  );
}
