import { useEffect, useState } from "react";
import {
  createOrganization,
  getAffiliation,
  joinOrganization,
  updateAffiliation,
} from "../../api/organization";

export default function InstructorOrganization() {
  const [affiliation, setAffiliation] = useState(null);
  const [schoolName, setSchoolName] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await getAffiliation();
    setAffiliation(data);
    setSchoolName(data.organization_name ?? "");
  }

  useEffect(() => {
    load().catch(() => setAffiliation({}));
  }, []);

  async function handleSaveName(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await updateAffiliation(schoolName.trim() || null);
      setAffiliation(data);
      setMessage("School name saved.");
    } catch (err) {
      setError(err.message ?? "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await createOrganization(newOrgName.trim());
      setAffiliation(data);
      setNewOrgName("");
      setMessage(data.message ?? "Organization created.");
    } catch (err) {
      setError(err.message ?? "Could not create organization");
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const data = await joinOrganization(joinCode.trim());
      setAffiliation(data);
      setJoinCode("");
      setMessage(data.message ?? "Joined organization.");
    } catch (err) {
      setError(err.message ?? "Could not join organization");
    } finally {
      setBusy(false);
    }
  }

  if (!affiliation) return null;

  const linkedName = affiliation.linked_organization_name;
  const orgCode = affiliation.organization_code;

  return (
    <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Your institution</h2>
        <p className="text-sm text-gray-500 mt-1">
          Optional — helps us understand who uses Archon in the classroom. No billing or seat limits.
        </p>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {linkedName && orgCode && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
          <div className="font-medium text-gray-900">{linkedName}</div>
          <div className="text-gray-600 mt-1">
            Org code: <span className="font-mono font-semibold">{orgCode}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Share this code with other instructors at your school.</p>
        </div>
      )}

      <form onSubmit={handleSaveName} className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">School or organization name</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={schoolName}
            onChange={(e) => setSchoolName(e.target.value)}
            placeholder="e.g. State Community College"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg disabled:opacity-60"
          >
            Save
          </button>
        </div>
      </form>

      {!orgCode && (
        <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
          <form onSubmit={handleCreate} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Create shared org</label>
            <p className="text-xs text-gray-500">Get a code colleagues can use to link to the same record.</p>
            <input
              type="text"
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              placeholder="Department or campus name"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={busy || !newOrgName.trim()}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Create & get code
            </button>
          </form>

          <form onSubmit={handleJoin} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Join with code</label>
            <p className="text-xs text-gray-500">Already have a code from a colleague?</p>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ORG CODE"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
            />
            <button
              type="submit"
              disabled={busy || !joinCode.trim()}
              className="px-4 py-2 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 disabled:opacity-60"
            >
              Join organization
            </button>
          </form>
        </div>
      )}
    </section>
  );
}
