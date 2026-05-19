import { useNavigate } from "react-router-dom";

const STATUS_STYLES = {
  not_started: { label: "Not started", classes: "bg-gray-800 text-gray-400" },
  in_progress: { label: "In progress", classes: "bg-yellow-900/40 text-yellow-400 border border-yellow-700/50" },
  submitted:   { label: "Submitted",   classes: "bg-blue-900/40 text-blue-400 border border-blue-700/50" },
  graded:      { label: "Graded",      classes: "bg-green-900/40 text-green-400 border border-green-700/50" },
};

export default function AssignmentCard({ assignment }) {
  const navigate = useNavigate();
  const status = STATUS_STYLES[assignment.status] || STATUS_STYLES.not_started;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-5 hover:border-gray-700 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-medium text-sm truncate">{assignment.title}</h3>
          <p className="text-gray-400 text-xs mt-1 line-clamp-2">{assignment.brief}</p>
        </div>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded font-medium ${status.classes}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between mt-4">
        <span className="text-gray-500 text-xs">
          Due {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "—"}
        </span>
        {assignment.score !== null && assignment.score !== undefined && (
          <span className="text-green-400 text-xs font-medium">
            {assignment.score} / {assignment.total_points} pts
          </span>
        )}
        <button
          onClick={() => navigate(`/assignment/${assignment.id}`)}
          className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded transition-colors"
        >
          {assignment.status === "not_started" ? "Start" : "Open"}
        </button>
      </div>
    </div>
  );
}
