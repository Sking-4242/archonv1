const SAMPLE_CRITERIA = [
  {
    type: "component_present",
    description: "Requires a specific AWS component to be present on the canvas",
    example: '{ "type": "component_present", "component": "vpc", "points": 10 }',
  },
  {
    type: "component_absent",
    description: "Checks that a disallowed component is NOT used",
    example: '{ "type": "component_absent", "component": "lambda_function", "points": 5 }',
  },
  {
    type: "min_count",
    description: "Requires a minimum number of a component type",
    example: '{ "type": "min_count", "component": "subnet", "count": 2, "points": 10 }',
  },
  {
    type: "edge_exists",
    description: "Requires a direct connection between two component types",
    example: '{ "type": "edge_exists", "from": "ec2_instance", "to": "rds_instance", "points": 15 }',
  },
  {
    type: "security_port_restricted",
    description: "Validates that a security group restricts access to a specific port",
    example: '{ "type": "security_port_restricted", "port": 22, "points": 10 }',
  },
];

export default function InstructorRubricBank() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Rubric Bank</h1>

      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
        Rubrics are defined as JSON arrays of criteria attached to each assignment. The grader evaluates each criterion automatically when a student submits.
      </div>

      <div className="space-y-3">
        {SAMPLE_CRITERIA.map((c) => (
          <div key={c.type} className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                {c.type}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-3">{c.description}</p>
            <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-600 overflow-x-auto">
              {c.example}
            </pre>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="text-sm font-semibold text-gray-800 mb-2">Full rubric example</div>
        <pre className="text-xs bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-600 overflow-x-auto whitespace-pre">
{`[
  { "type": "component_present", "component": "vpc",             "points": 10 },
  { "type": "component_present", "component": "internet_gateway","points": 10 },
  { "type": "min_count",         "component": "subnet",          "count": 2, "points": 10 },
  { "type": "edge_exists",       "from": "ec2_instance",         "to": "rds_instance", "points": 20 },
  { "type": "security_port_restricted", "port": 22,              "points": 10 }
]`}
        </pre>
      </div>
    </div>
  );
}
