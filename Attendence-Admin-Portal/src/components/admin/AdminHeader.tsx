// src/components/admin/AdminHeader.tsx
import React, { useEffect, useRef, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate, useLocation } from "react-router-dom";

/* Avatar (unchanged) */
function Avatar({ name, size = 40 }: { name?: string | null; size?: number }) {
  const initials =
    (name || "")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase() ?? "")
      .join("") || (name ? name[0].toUpperCase() : "?");

  return (
    <div
      aria-hidden
      title={name ?? "User"}
      className="flex items-center justify-center rounded-full flex-shrink-0 ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size / 2.7),
        background: "linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(139,92,246,1) 100%)",
        color: "white",
      }}
    >
      {initials}
    </div>
  );
}

/* Apple style sign-out modal (kept small) */
function AppleSignOutModal({
  open,
  title = "Sign out",
  description = "Are you sure you want to sign out?",
  loading = false,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  description?: string;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      window.addEventListener("keydown", onKey);
      setTimeout(() => dialogRef.current?.focus(), 50);
    }
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="apple-signout-title"
      aria-describedby="apple-signout-desc"
    >
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="relative z-20 w-[min(560px,94%)] max-w-lg rounded-2xl bg-white/95 border border-white/60 shadow-2xl p-6 focus:outline-none"
        style={{
          boxShadow: "0 12px 30px rgba(20,20,20,0.18)",
          WebkitBackdropFilter: "blur(6px)",
          backdropFilter: "blur(6px)",
        }}
      >
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center border border-gray-200">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M12 2v4" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M6 9l6 6 6-6" stroke="#374151" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 id="apple-signout-title" className="text-lg font-medium text-gray-900">
              {title}
            </h3>
            <p id="apple-signout-desc" className="mt-1 text-sm text-gray-600">
              {description}
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-200"
                disabled={loading}
              >
                Cancel
              </button>

              <button
                onClick={() => onConfirm()}
                className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-red-50 border border-red-200 text-sm font-medium text-red-600 hover:bg-red-600 hover:text-white focus:outline-none focus:ring-2 focus:ring-red-200 transition-colors"
                disabled={loading}
              >
                {loading ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminHeader() {
  const { user, profile, signOut } = useAuth() as any;
  const navigate = useNavigate();
  const location = useLocation();

  const [menuOpen, setMenuOpen] = useState(false);
  const [loadingSignOut, setLoadingSignOut] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const firstMenuItemRef = useRef<HTMLButtonElement | null>(null);

  // compute normalized role and base path
  const roleRaw = profile?.role ?? "";
  const role = typeof roleRaw === "string" ? roleRaw.toUpperCase().trim() : roleRaw;
  const basePath = role === "ADMIN" ? "/admin" : role === "HOD" ? "/hod" : role === "FACULTY" ? "/faculty" : "";

  // If a non-admin lands on /admin, immediately redirect them to their portal (replace)
  useEffect(() => {
    if (!role) return; // don't act until we know role
    if (location.pathname.startsWith("/admin") && role !== "ADMIN") {
      // redirect off admin area
      if (role === "HOD") window.location.replace("/hod");
      else if (role === "FACULTY") window.location.replace("/faculty");
      else window.location.replace("/no-access");
    }
    // If a non-HOD lands on /hod, redirect
    if (location.pathname.startsWith("/hod") && role !== "HOD") {
      if (role === "ADMIN") window.location.replace("/admin");
      else if (role === "FACULTY") window.location.replace("/faculty");
      else window.location.replace("/no-access");
    }
    // If non-FACULTY lands on /faculty, redirect
    if (location.pathname.startsWith("/faculty") && role !== "FACULTY") {
      if (role === "ADMIN") window.location.replace("/admin");
      else if (role === "HOD") window.location.replace("/hod");
      else window.location.replace("/no-access");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, location.pathname]);

  // Close dropdown on outside click or Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      const desktopContains = menuRef.current?.contains(target);
      const mobileContains = mobileMenuRef.current?.contains(target);
      if (!desktopContains && !mobileContains) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // focus first item when opening menu
  useEffect(() => {
    if (menuOpen) setTimeout(() => firstMenuItemRef.current?.focus(), 50);
  }, [menuOpen]);

  const displayName = profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email ?? "Admin";

  async function doSignOut() {
    try {
      setLoadingSignOut(true);
      await signOut();

      // Clear local storage and session storage to avoid stale state
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (err) {
        console.warn("storage clear failed", err);
      }

      // Hard replace to /login so Back cannot return to protected pages
      window.location.replace("/login");
    } catch (err) {
      console.error("Sign out failed:", err);
      alert("Sign out failed. Check console for details.");
      setLoadingSignOut(false);
      setConfirmOpen(false);
    }
  }

  function handleSignOutClick() {
    setConfirmOpen(true);
  }

  // Role-aware navigation helpers
  function goProfile() {
    setMenuOpen(false);
    if (!basePath) return navigate("/no-access", { replace: true });
    navigate(`${basePath}/profile`, { replace: true });
  }
  function goSettings() {
    setMenuOpen(false);
    if (!basePath) return navigate("/no-access", { replace: true });
    navigate(`${basePath}/settings`, { replace: true });
  }

  // Only admins see analytics/notifications in menu
  const showAdminItems = role === "ADMIN";

  return (
    <>
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left */}
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-gray-900">Admin Portal</h2>
              <p className="hidden sm:block text-sm text-gray-500">Manage HOD, Faculty and view analytics</p>
            </div>

            {/* Right: Profile / actions */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3 text-right">
                <div>
                  <div className="text-sm font-medium text-gray-800 max-w-[220px] truncate" title={displayName}>
                    {displayName}
                  </div>
                  <div className="text-xs mt-0.5">
                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {role ? role : "ADMIN"}
                    </span>
                  </div>
                </div>

                <div className="relative" ref={menuRef}>
                  <button
                    aria-haspopup="true"
                    aria-expanded={menuOpen}
                    onClick={() => setMenuOpen((v) => !v)}
                    className="flex items-center gap-2 p-1 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  >
                    <Avatar name={displayName} size={40} />
                    <svg className="w-4 h-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 011.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>

                  {menuOpen && (
                    <div
                      role="menu"
                      aria-label="User menu"
                      className="origin-top-right right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 transform transition ease-out duration-150"
                    >
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            goProfile();
                          }}
                          ref={firstMenuItemRef as any}
                          role="menuitem"
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                          Profile
                        </button>

                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            goSettings();
                          }}
                          role="menuitem"
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none"
                        >
                          Settings
                        </button>

                        {showAdminItems && (
                          <>
                            <button
                              onClick={() => {
                                setMenuOpen(false);
                                navigate("/admin/notifications", { replace: true });
                              }}
                              role="menuitem"
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none"
                            >
                              Notifications
                            </button>

                            <button
                              onClick={() => {
                                setMenuOpen(false);
                                navigate("/admin/analytics", { replace: true });
                              }}
                              role="menuitem"
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none"
                            >
                              Analytics
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setMenuOpen(false);
                            handleSignOutClick();
                          }}
                          disabled={loadingSignOut}
                          role="menuitem"
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 focus:outline-none"
                        >
                          Sign out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile */}
              <div className="flex sm:hidden items-center gap-2 relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="p-1 rounded hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-600"
                  aria-label="Open user menu"
                >
                  <Avatar name={displayName} size={36} />
                </button>

                <button
                  onClick={handleSignOutClick}
                  disabled={loadingSignOut}
                  className="px-3 py-1 bg-red-50 text-red-700 rounded text-sm"
                >
                  Sign out
                </button>

                {menuOpen && (
                  <div
                    ref={mobileMenuRef}
                    className="absolute right-4 top-16 w-44 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50 sm:hidden"
                  >
                    <div className="py-1">
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          goProfile();
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Profile
                      </button>

                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          goSettings();
                        }}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Settings
                      </button>

                      {showAdminItems && (
                        <>
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              navigate("/admin/notifications", { replace: true });
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Notifications
                          </button>

                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              navigate("/admin/analytics", { replace: true });
                            }}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          >
                            Analytics
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <AppleSignOutModal
        open={confirmOpen}
        loading={loadingSignOut}
        title="Sign out"
        description="Are you sure you want to sign out?"
        onConfirm={doSignOut}
        onClose={() => setConfirmOpen(false)}
      />
    </>
  );
}
