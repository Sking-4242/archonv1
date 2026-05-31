import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AdminUsagePanel() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/portal/admin/usage")
      .then(setData)
      .catch((err) => setError(err.message ?? "Could not load usage"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <p className="text-sm text-gray-500">Loading institutional usage…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-white border border-red-200 rounded-xl p-6 shadow-sm">
        <p className="text-sm text-red-600">{error}</p>
      </section>
    );
  }

  const rows = data?.organizations ?? [];

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Institutional usage</h2>
        <p className="text-sm text-gray-500 mt-1">
          Voluntary instructor affiliations — no billing attached.
          {data?.instructors_without_org != null && (
            <> {data.instructors_without_org} instructor(s) not linked yet.</>
          )}
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">No affiliations recorded yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-gray-100">
                <th className="py-2 pr-4 font-medium">Institution</th>
                <th className="py-2 pr-4 font-medium">Code</th>
                <th className="py-2 pr-4 font-medium">Instructors</th>
                <th className="py-2 pr-4 font-medium">Classes</th>
                <th className="py-2 pr-4 font-medium">Students</th>
                <th className="py-2 font-medium">Last activity</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.kind}-${row.organization_id ?? row.name}`} className="border-b border-gray-50">
                  <td className="py-2 pr-4 font-medium text-gray-900">{row.name}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{row.code ?? "—"}</td>
                  <td className="py-2 pr-4">{row.instructor_count}</td>
                  <td className="py-2 pr-4">{row.class_count}</td>
                  <td className="py-2 pr-4">{row.student_count}</td>
                  <td className="py-2 text-gray-500">
                    {row.last_activity_at ? row.last_activity_at.slice(0, 10) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
