import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import { useAssignmentStore } from "../../store/assignmentStore";
import { getAssignment } from "../../api/assignments";
import { submitAssignment } from "../../api/submissions";
import AssignmentPanel from "./AssignmentPanel";
import SubmissionFeedback from "../student/SubmissionFeedback";

/**
 * AssignmentCanvas is the student's primary work area.
 *
 * The canvas itself is rendered by the shared Archon Professional canvas
 * components. For the MVP, this component provides the shell: assignment
 * context loaded from the API, the AssignmentPanel sidebar, and submission
 * handling. The React Flow canvas will be integrated here once the shared
 * canvas components are available from the Professional frontend.
 *
 * Canvas integration path:
 *   The academy/ and frontend/ directories share a backend but have separate
 *   node_modules. During development, canvas components can be imported via
 *   a relative path alias configured in vite.config.js. For production Docker
 *   builds, set the build context to the repo root and copy the relevant
 *   frontend/src/components/canvas/* files into the academy image.
 */
export default function AssignmentCanvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token } = useAuthStore();
  const { setActiveAssignment, activeAssignment, setSubmission, submission } = useAssignmentStore();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    getAssignment(id, token)
      .then(setActiveAssignment)
      .catch(() => navigate("/dashboard"));
  }, [id, token, setActiveAssignment, navigate]);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      // TODO: replace with serialized canvas graph from graphStore
      const graphJson = { nodes: [], edges: [] };
      const result = await submitAssignment(id, graphJson, token);
      setSubmission(result);
      setShowFeedback(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!activeAssignment) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-500 text-sm">Loading assignment...</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-4 py-3 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Dashboard
        </button>
        <span className="text-sm font-medium text-white">{activeAssignment.title}</span>
        {error && <span className="text-red-400 text-xs ml-auto">{error}</span>}
      </header>

      {/* Main area */}
      <div className="flex flex-1 min-h-0">
        {/* Canvas area */}
        <div className="flex-1 relative bg-gray-900">
          {/* Canvas will mount here — see comment in component header */}
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-600 text-sm">
              Archon canvas loads here
            </p>
          </div>
        </div>

        {/* Assignment sidebar */}
        <AssignmentPanel onSubmit={handleSubmit} submitting={submitting} />
      </div>

      {/* Feedback overlay */}
      {showFeedback && submission && (
        <div className="absolute inset-0 bg-gray-950/90 flex items-center justify-center z-50 p-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 w-full max-w-lg">
            <SubmissionFeedback submission={submission} />
            <button
              onClick={() => setShowFeedback(false)}
              className="mt-5 w-full bg-gray-800 hover:bg-gray-700 text-white text-sm rounded px-4 py-2 transition-colors"
            >
              Continue working
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
