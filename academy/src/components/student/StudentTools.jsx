const TOOLS = [
  {
    name: "AWS Architecture Canvas",
    description: "Drag-and-drop diagram builder with graded submission support.",
    icon: "🏗️",
    status: "available",
  },
  {
    name: "Cost Estimator",
    description: "Estimate the monthly cost of your AWS architecture before you build.",
    icon: "💰",
    status: "coming_soon",
  },
  {
    name: "Security Analyzer",
    description: "Scan your architecture diagram for common security misconfigurations.",
    icon: "🔐",
    status: "coming_soon",
  },
  {
    name: "Terraform Generator",
    description: "Export your architecture as production-ready Terraform HCL.",
    icon: "⚙️",
    status: "coming_soon",
  },
];

export default function StudentTools() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Tools</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {TOOLS.map((tool) => (
          <div
            key={tool.name}
            className={`bg-white border rounded-xl p-5 flex gap-4 ${
              tool.status === "available"
                ? "border-gray-200 hover:border-blue-300 cursor-pointer transition-colors"
                : "border-gray-100 opacity-60"
            }`}
          >
            <div className="text-2xl mt-0.5">{tool.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{tool.name}</span>
                {tool.status === "coming_soon" && (
                  <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                    Coming Soon
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">{tool.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
