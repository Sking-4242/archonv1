import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../api/client";
import useAuthStore from "../store/authStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", displayName: "" });
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      if (mfaToken) {
        const data = await api.post("/auth/mfa/verify", { mfa_token: mfaToken, code: mfaCode });
        login(data.user, data.token);
        navigate("/dashboard");
        return;
      }

      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { email: form.email, password: form.password }
          : {
              email: form.email,
              password: form.password,
              display_name: form.displayName || undefined,
            };
      const data = await api.post(path, body);

      if (data.mfa_required) {
        setMfaToken(data.mfa_token);
        setMessage("Enter the code from your authenticator app.");
        return;
      }

      login(data.user, data.token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message ?? "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h1>
        <p className="text-sm text-gray-500 mb-6">
          Manage your Archon account.{" "}
          <Link to="/" className="text-indigo-600 hover:underline">
            Back to archonpro.net
          </Link>
        </p>

        {!mfaToken && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-2 text-sm rounded-lg border ${
                mode === "login" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 py-2 text-sm rounded-lg border ${
                mode === "register" ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-gray-200"
              }`}
            >
              Create account
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {!mfaToken && mode === "register" && (
            <input
              type="text"
              placeholder="Display name"
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          )}
          <input
            type="text"
            required
            autoComplete="username"
            placeholder="Email or username"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            disabled={!!mfaToken}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm disabled:bg-gray-50"
          />
          {!mfaToken && (
            <input
              type="password"
              required
            minLength={mode === "register" ? 8 : undefined}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          )}
          {mfaToken && (
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              placeholder="6-digit MFA code"
              value={mfaCode}
              onChange={(e) => setMfaCode(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          )}
          {message && <p className="text-sm text-green-700">{message}</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={busy || (mfaToken && !mfaCode.trim())}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-lg disabled:opacity-60"
          >
            {busy ? "Working…" : mfaToken ? "Verify code" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        {!mfaToken && mode === "login" && (
          <p className="text-sm text-gray-500 mt-4">
            <Link to="/forgot-password" className="text-indigo-600 hover:underline">
              Forgot password?
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
