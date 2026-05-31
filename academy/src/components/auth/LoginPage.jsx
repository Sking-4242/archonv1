import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, verifyMfa } from "../../api/auth";
import useAuthStore from "../../store/authStore";
import useAccessStore from "../../store/accessStore";

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const refreshAccess = useAccessStore((s) => s.refresh);
  const [form, setForm] = useState({ email: "", password: "" });
  const [mfaToken, setMfaToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function finishLogin(data) {
    const user = {
      ...data.user,
      name: data.user.display_name || data.user.name || data.user.email,
      role: data.user.academy_role || data.user.role,
    };
    login(user, data.token);
    await refreshAccess();
    if (user.role === "instructor") {
      navigate("/instructor");
    } else {
      navigate("/dashboard");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mfaToken) {
        const data = await verifyMfa(mfaToken, mfaCode);
        await finishLogin(data);
        return;
      }

      const data = await loginUser(form.email, form.password);
      if (data.mfa_required) {
        setMfaToken(data.mfa_token);
        setMessage("Enter the code from your authenticator app.");
        return;
      }

      await finishLogin(data);
    } catch (err) {
      setError(err.message ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mb-4 shadow-md">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L21 8.25V15.75L12 21L3 15.75V8.25L12 3Z" stroke="white" strokeWidth="1.5" fill="none" />
              <circle cx="12" cy="12" r="3" fill="white" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Archon <span className="text-blue-600">Academy</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            {message && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 text-sm rounded-lg px-4 py-3">
                {message}
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                disabled={!!mfaToken}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors disabled:bg-gray-50"
                placeholder="you@university.edu"
              />
            </div>

            {!mfaToken && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}

            {mfaToken && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-600" htmlFor="mfa">
                  MFA code
                </label>
                <input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm"
                  placeholder="6-digit code"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mfaToken && !mfaCode.trim())}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors mt-2"
            >
              {loading ? "Signing in…" : mfaToken ? "Verify code" : "Sign In"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Powered by Archon Professional
        </p>
      </div>
    </div>
  );
}
