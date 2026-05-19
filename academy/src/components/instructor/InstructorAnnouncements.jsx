import ComingSoon from "../layout/ComingSoon";

export default function InstructorAnnouncements() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Announcements</h1>
      <ComingSoon
        icon="📣"
        title="Announcements coming soon"
        description="Broadcast updates to all students in your course. Students will see them on their Announcements tab."
      />
    </div>
  );
}
