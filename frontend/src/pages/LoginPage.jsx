import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../hooks/useAuth";
import { authApi } from "../services/api";

export default function LoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login({ email: form.email, password: form.password });
      setAuth(res.user, res.access_token, res.refresh_token);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message ?? "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-1 rounded-2xl border border-white/5 p-8 shadow-glass">
        <h1 className="text-2xl font-bold text-white mb-1">Profit<span className="text-brand">OS</span></h1>
        <p className="text-sm text-muted mb-8">Sign in to your workspace</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 bg-surface-2 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand" />
          <input type="password" placeholder="Password" value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-2.5 bg-surface-2 border border-white/10 rounded-lg text-sm text-white placeholder:text-muted focus:outline-none focus:border-brand" />
          {error && <p className="text-danger text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-brand hover:bg-brand-dark text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50">
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}