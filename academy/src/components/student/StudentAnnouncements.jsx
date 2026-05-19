import ComingSoon from "../layout/ComingSoon";

export default function StudentAnnouncements() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Announcements</h1>
      <ComingSoon
        icon="📣"
        title="No announcements"
        description="Course announcements from your instructor will appear here."
      />
    </div>
  );
}
