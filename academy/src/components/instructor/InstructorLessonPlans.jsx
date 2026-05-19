import ComingSoon from "../layout/ComingSoon";

export default function InstructorLessonPlans() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Lesson Plans</h1>
      <ComingSoon
        icon="📝"
        title="Lesson plan editor coming soon"
        description="Build structured lesson plans with learning objectives, activities, and materials tied to your assignments."
      />
    </div>
  );
}
