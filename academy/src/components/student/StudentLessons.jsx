import ComingSoon from "../layout/ComingSoon";

export default function StudentLessons() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Lessons</h1>
      <ComingSoon
        icon="📖"
        title="No lessons yet"
        description="Lessons will appear here once your instructor publishes course content."
      />
    </div>
  );
}
