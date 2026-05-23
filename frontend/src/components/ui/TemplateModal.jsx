import { TEMPLATES_BY_PROVIDER } from "../../utils/templates";

const CATEGORY_COLOR = {
  Web:         "bg-blue-100 text-blue-700",
  Serverless:  "bg-purple-100 text-purple-700",
  Networking:  "bg-teal-100 text-teal-700",
  Data:        "bg-amber-100 text-amber-700",
  Containers:  "bg-cyan-100 text-cyan-700",
  "AI/ML":     "bg-pink-100 text-pink-700",
  DevOps:      "bg-orange-100 text-orange-700",
  Security:    "bg-red-100 text-red-700",
  Database:    "bg-yellow-100 text-yellow-700",
  Integration: "bg-violet-100 text-violet-700",
  Monitoring:  "bg-green-100 text-green-700",
  Storage:     "bg-sky-100 text-sky-700",
};

export default function TemplateModal({ onSelect, onClose, provider = "aws" }) {
  const list = TEMPLATES_BY_PROVIDER[provider] ?? TEMPLATES_BY_PROVIDER.aws;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-[720px] max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              Architecture Templates
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Start from a pre-built pattern — you can edit everything after
              loading.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 gap-4">
          {list.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className="text-left border border-gray-200 rounded-lg p-4 hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-sm font-semibold text-gray-800 group-hover:text-indigo-700">
                  {tpl.name}
                </span>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0 ${CATEGORY_COLOR[tpl.category] ?? "bg-gray-100 text-gray-600"}`}
                >
                  {tpl.category}
                </span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                {tpl.description}
              </p>
              <div className="mt-3 flex gap-3 text-xs text-gray-400">
                <span>{tpl.nodes.length} components</span>
                <span>{tpl.edges.length} connections</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
