import { useNavigate } from "react-router-dom";

export default function StudentSandbox() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Sandbox</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-8 flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-2xl">
          🛠️
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-800">Free Practice Environment</h2>
          <p className="text-sm text-gray-500 mt-1 max-w-sm">
            Use the Sandbox to experiment with AWS architecture diagrams without submitting for a grade.
            Great for practicing before your real assignments.
          </p>
        </div>
        <button
          onClick={() => navigate("/sandbox/canvas")}
          className="mt-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          Open Sandbox Canvas
        </button>
      </div>
    </div>
  );
}
