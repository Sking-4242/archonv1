import ComingSoon from "../layout/ComingSoon";

export default function StudentTeams() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold text-gray-900">Teams & Shared with Me</h1>
      <ComingSoon
        icon="👥"
        title="No teams yet"
        description="Collaborative workspaces and files shared with you by teammates or your instructor will appear here."
      />
    </div>
  );
}
