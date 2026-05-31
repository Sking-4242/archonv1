import { useAssignmentStore } from "../../store/assignmentStore";
import TutorPanel from "../tutor/TutorPanel";

function RubricItem({ criterion }) {
  return (
    <li className="text-xs text-gray-300 flex gap-2">
      <span className="text-gray-600 shrink-0">•</span>
      <span>
        {criterion.label}
        <span className="text-gray-500 ml-1">({criterion.points} pts)</span>
      </span>
    </li>
  );
}

function SelectedNodePanel({ selectedNode }) {
  if (!selectedNode) {
    return (
      <div className="p-4 border-b border-gray-800">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
          Selected Component
        </p>
        <p className="text-xs text-gray-600 italic">
          Click a component on the canvas to see details.
        </p>
      </div>
    );
  }

  const { nodeType, nodeData } = selectedNode;

  return (
    <div className="p-4 border-b border-gray-800">
      <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-2">
        Selected Component
      </p>
      <div className="flex items-center gap-2 mb-2">
        {nodeData.icon && <span className="text-xl">{nodeData.icon}</span>}
        <div>
          <p className="text-xs font-semibold text-white">{nodeData.label ?? nodeType}</p>
          {nodeData.awsType && (
            <p className="text-[10px] text-gray-500">{nodeData.awsType}</p>
          )}
        </div>
      </div>
      {nodeData.category && (
        <p className="text-[10px] text-gray-500 capitalize">
          Category: {nodeData.category.replace(/_/g, " ")}
        </p>
      )}
    </div>
  );
}

export default function AssignmentPanel({ onSubmit, submitting, selectedNode, canvasGraph }) {
  const { activeAssignment, learningMode, toggleLearningMode } = useAssignmentStore();

  if (!activeAssignment) return null;

  return (
    <div className="w-80 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Assignment brief */}
      <div className="p-4 border-b border-gray-800">
        <p className="text-xs font-medium text-blue-400 uppercase tracking-wider mb-1">Assignment</p>
        <h2 className="text-sm font-semibold text-white mb-2">{activeAssignment.title}</h2>
        <p className="text-xs text-gray-400 leading-relaxed">{activeAssignment.brief}</p>
      </div>

      {/* Rubric */}
      {activeAssignment.rubric?.length > 0 && (
        <div className="p-4 border-b border-gray-800">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Rubric</p>
          <ul className="space-y-2">
            {activeAssignment.rubric.map((c, i) => (
              <RubricItem key={i} criterion={c} />
            ))}
          </ul>
        </div>
      )}

      {/* Learning mode toggle */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-white">Learning Mode</p>
          <p className="text-xs text-gray-500 mt-0.5">Hover nodes for guidance</p>
        </div>
        <button
          onClick={toggleLearningMode}
          className={`w-10 h-5 rounded-full transition-colors relative ${
            learningMode ? "bg-blue-600" : "bg-gray-700"
          }`}
        >
          <span
            className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
              learningMode ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Selected component info (shown when learning mode is on) */}
      {learningMode && <SelectedNodePanel selectedNode={selectedNode} />}

      <div className="flex-1 min-h-0 flex flex-col border-t border-gray-800">
        <TutorPanel
          variant="dark"
          contextType="assignment"
          lessonTitle={activeAssignment.title}
          assignmentBrief={activeAssignment.brief}
          rubric={activeAssignment.rubric}
          graph={canvasGraph}
          className="w-full border-l-0 flex-1 min-h-0"
        />
      </div>

      {/* Submit */}
      <div className="p-4 mt-auto">
        <button
          onClick={onSubmit}
          disabled={submitting}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded px-4 py-2.5 transition-colors"
        >
          {submitting ? "Submitting..." : "Submit Assignment"}
        </button>
        <p className="text-xs text-gray-600 text-center mt-2">
          You can re-submit before the due date.
        </p>
      </div>
    </div>
  );
}
