// src/components/admin/SettingsView.tsx
import { useEffect, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function SettingsView() {
  const { user, profile, loading, signOut } = useAuth() as any;
  const navigate = useNavigate();

  const [fullName, setFullName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    // if auth finished loading and there's no user -> go to login
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name ?? "");
    }
  }, [profile]);

  async function handleSave(e?: React.FormEvent) {
    e?.preventDefault();
    if (!profile?.id) {
      setToast({ type: "error", message: "Profile not loaded." });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: fullName })
        .eq("id", profile.id);

      if (error) throw error;
      setToast({ type: "success", message: "Profile updated." });

      // Optionally refetch profile or rely on your AuthContext listener.
      // If you want immediate UI refresh in context, consider calling a context method.
    } catch (err) {
      console.error("Failed to update profile:", err);
      setToast({ type: "error", message: "Failed to update profile." });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 1800);
    }
  }

  async function handleSignOut() {
    if (!confirm) {
      // keep the modal confirm from header or simple confirm fallback
    }
    try {
      setSigningOut(true);
      await signOut();
      // replace location so back button doesn't show protected route
      window.location.replace("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      setToast({ type: "error", message: "Sign out failed." });
      setSigningOut(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Settings</h2>
        <p className="text-gray-600">Manage your account and system preferences</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-2xl">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              value={profile?.email ?? ""}
              readOnly
              className="w-full px-3 py-2 border border-gray-200 rounded bg-gray-50 text-sm text-gray-700"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-600 focus:border-transparent"
              placeholder="Your full name"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Role</label>
            <div className="inline-block text-sm px-3 py-1 rounded-full bg-gray-100 text-gray-700">
              {profile?.role ?? "—"}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                // reset to current profile value
                setFullName(profile?.full_name ?? "");
              }}
              className="px-4 py-2 rounded border border-gray-200 bg-white hover:bg-gray-50"
              disabled={saving}
            >
              Reset
            </button>

            <button
              type="submit"
              className="px-4 py-2 rounded bg-purple-600 text-white hover:bg-purple-700"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>

          <div className="pt-6 border-t mt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">Danger zone</h4>
            <p className="text-sm text-gray-500 mb-3">Sign out of this session and clear local state.</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleSignOut}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                disabled={signingOut}
              >
                {signingOut ? "Signing out..." : "Sign out"}
              </button>
              <button
                type="button"
                onClick={() => {
                  // optional: clear client cache only
                  try {
                    localStorage.clear();
                    sessionStorage.clear();
                    setToast({ type: "success", message: "Local storage cleared." });
                    setTimeout(() => setToast(null), 1500);
                  } catch (err) {
                    setToast({ type: "error", message: "Failed to clear storage." });
                    setTimeout(() => setToast(null), 1500);
                  }
                }}
                className="px-3 py-2 rounded border border-gray-200 bg-white hover:bg-gray-50 text-sm"
              >
                Clear local cache
              </button>
            </div>
          </div>
        </form>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-60 rounded px-4 py-2 shadow ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-3 underline text-xs opacity-90"
            aria-label="dismiss"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
