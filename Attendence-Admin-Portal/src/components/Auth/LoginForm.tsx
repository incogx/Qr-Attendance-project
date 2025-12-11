import React, { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { LogIn } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";

/**
 * LoginForm
 * - Calls signIn(email, password)
 * - Sets postSignIn flag and waits for AuthContext.profile to appear
 * - When profile arrives, navigates to the correct portal (replace history)
 * - If profile never appears within fallback time, sends user to /no-access
 */
export default function LoginForm() {
  const navigate = useNavigate();
  const { signIn, profile, loading: authLoading } = useAuth() as any;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [postSignIn, setPostSignIn] = useState(false);

  const submit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    setPostSignIn(false);

    try {
      // If your AuthContext.signIn expects an object, adjust accordingly.
      await signIn(email.trim(), password);
      // Wait for AuthContext to populate profile; set flag
      setPostSignIn(true);
    } catch (err: any) {
      // Better error message parsing if signIn returns structured error
      setError(err?.message ?? "Sign in failed");
      setLoading(false);
      setPostSignIn(false);
      console.error("Login error:", err);
    }
  };

  useEffect(() => {
    if (!postSignIn) return;

    // If AuthContext is still loading, wait
    if (authLoading) return;

    // If profile exists, route to proper portal using navigate with replace
    if (profile) {
      const role = (profile.role ?? "").toString().toUpperCase().trim();
      if (role === "ADMIN") {
        navigate("/admin", { replace: true });
      } else if (role === "HOD") {
        navigate("/hod", { replace: true });
      } else if (role === "FACULTY") {
        navigate("/faculty", { replace: true });
      } else {
        navigate("/no-access", { replace: true });
      }
      setLoading(false);
      setPostSignIn(false);
      return;
    }

    // fallback: if profile doesn't arrive in 10s, avoid leaving user stuck
    const to = setTimeout(() => {
      // Only run fallback if still waiting
      setLoading(false);
      setPostSignIn(false);
      navigate("/no-access", { replace: true });
    }, 10000);

    return () => clearTimeout(to);
  }, [profile, postSignIn, authLoading, navigate]);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-[#f7f7f7] overflow-hidden">
      {/* RIGHT SIDE IMAGE WITH FADE */}
      <div
        className="absolute inset-y-0 right-0 w-[55%] hidden md:block"
        style={{
          backgroundImage: "url('/sathyabama-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          maskImage: "linear-gradient(to left, black 60%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to left, black 60%, transparent 100%)",
        }}
      />

      {/* CENTERED LOGIN CARD */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl p-10 shadow-2xl border border-gray-100">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/sathyabama-logo.png"
            alt="Sathyabama Logo"
            className="w-32 md:w-40 mb-3"
          />
          <p className="text-[13px] md:text-sm font-semibold text-gray-600 -mt-1 tracking-wide">
            INSTITUTE OF SCIENCE & TECHNOLOGY
          </p>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 text-center">
          Sathyabama Portal Login
        </h1>

        <p className="text-sm text-gray-500 text-center mb-6">
          For Administrators, HODs & Faculty Members
        </p>

        <form onSubmit={submit} className="space-y-4" aria-live="polite">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-700 font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your Sathyabama email"
              className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none 
                        focus:ring-2 focus:ring-[#7A0D15]/20 text-gray-800 placeholder-gray-400"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 font-medium">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="mt-1 w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 focus:outline-none 
                        focus:ring-2 focus:ring-[#7A0D15]/20 text-gray-800 placeholder-gray-400"
              autoComplete="current-password"
              disabled={loading}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-gray-500">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="h-4 w-4" disabled={loading} />
              Remember me
            </label>

            <Link to="/forgot-password" className="text-[#7A0D15] hover:underline">
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full flex items-center justify-center gap-2 rounded-lg py-3 bg-[#7A0D15] hover:bg-[#600c10] 
                      text-white font-medium transition disabled:opacity-60"
          >
            <LogIn className="w-5 h-5" />
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          © {new Date().getFullYear()} Sathyabama Institute of Science & Technology
        </p>
      </div>
    </div>
  );
}
