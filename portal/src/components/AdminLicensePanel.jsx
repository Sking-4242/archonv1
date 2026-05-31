import { useState } from "react";
import { adminCreateLicense } from "../api/admin";

export default function AdminLicensePanel() {
  const [assignEmail, setAssignEmail] = useState("");
  const [validDays, setValidDays] = useState(365);
  const [generated, setGenerated] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleGenerate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setGenerated(null);
    try {
      const result = await adminCreateLicense({
        assignEmail: assignEmail.trim() || undefined,
        validDays: Number(validDays) || 365,
      });
      setGenerated(result);
    } catch (err) {
      setError(err.message ?? "Could not generate license");
    } finally {
      setBusy(false);
    }
  }

  function copyKey() {
    if (generated?.key) navigator.clipboard.writeText(generated.key);
  }

  return (
    <section className="bg-white border border-indigo-200 rounded-xl p-6 shadow-sm space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Generate license keys</h2>
        <p className="text-sm text-gray-600 mt-1">
          Dev admin tool — share keys with testers. They create an account and paste the key in Professional
          Settings → Account.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-3">
        <input
          type="email"
          value={assignEmail}
          onChange={(e) => setAssignEmail(e.target.value)}
          placeholder="Pre-assign to email (optional)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <div className="flex gap-2 items-center">
          <input
            type="number"
            min={1}
            max={3650}
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <span className="text-sm text-gray-500">days valid</span>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-60"
        >
          {busy ? "Generating…" : "Generate license key"}
        </button>
      </form>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {generated && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
          <div className="text-xs font-medium text-emerald-900">New license key</div>
          <code className="block text-xs font-mono break-all bg-white rounded px-2 py-2 border border-emerald-100">
            {generated.key}
          </code>
          {generated.assigned_to && (
            <p className="text-xs text-gray-600">Pre-assigned to {generated.assigned_to}</p>
          )}
          <button type="button" onClick={copyKey} className="text-sm text-indigo-600 hover:underline">
            Copy key
          </button>
        </div>
      )}
    </section>
  );
}
