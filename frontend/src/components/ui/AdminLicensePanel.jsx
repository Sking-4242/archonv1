import { useState } from "react";
import { adminCreateLicense } from "../../api/admin";

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
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-4 space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Generate license keys</h3>
        <p className="text-xs text-gray-600 mt-1">
          Dev-only admin tool. Share the key with testers — they sign in and paste it under Account.
        </p>
      </div>

      <form onSubmit={handleGenerate} className="space-y-2">
        <input
          type="email"
          value={assignEmail}
          onChange={(e) => setAssignEmail(e.target.value)}
          placeholder="Pre-assign to email (optional)"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
        />
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            max={3650}
            value={validDays}
            onChange={(e) => setValidDays(e.target.value)}
            className="w-28 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          />
          <span className="text-xs text-gray-500 self-center">days valid</span>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="w-full py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 disabled:opacity-60"
        >
          {busy ? "Generating…" : "Generate license key"}
        </button>
      </form>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {generated && (
        <div className="rounded-lg border border-emerald-200 bg-white p-3 space-y-2">
          <div className="text-xs text-gray-500">New license key</div>
          <code className="block text-xs font-mono break-all bg-gray-100 rounded px-2 py-2">
            {generated.key}
          </code>
          {generated.assigned_to && (
            <p className="text-xs text-gray-600">Assigned to {generated.assigned_to}</p>
          )}
          <button
            type="button"
            onClick={copyKey}
            className="text-xs font-medium text-indigo-600 hover:underline"
          >
            Copy key
          </button>
        </div>
      )}
    </div>
  );
}
