// src/components/RedirectToRole.tsx
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/**
 * Strict route guard + role-based redirect.
 * - Ensures only ADMIN/HOD/FACULTY access their respective areas.
 * - Preserves attempted path when sending unauthenticated users to /login.
 * - Allows a small set of explicit public routes to avoid redirect loops.
 *
 * Mount near App/Router root.
 */
export default function RedirectToRole() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading } = useAuth() as any;

  useEffect(() => {
    // wait for auth to settle
    if (loading) return;

    const pathname = location.pathname || "/";

    // Public route *bases* (allow nested routes like /forgot-password/step2)
    const publicBases = [
      "/login",
      "/no-access",
      "/privacy",
      "/healthcheck",
      "/forgot",
      "/forgot-password",
      "/reset-password",
    ];

    const isPublic = publicBases.some(
      (base) => pathname === base || pathname.startsWith(base + "/")
    );

    // Not signed in → send to login (preserve original location) unless already on a public route
    if (!user) {
      if (!isPublic) {
        navigate("/login", { replace: true, state: { from: location } });
      }
      return;
    }

    // Signed in but no profile → redirect to login (user exists but incomplete setup)
    if (!profile) {
      if (pathname !== "/login") {
        navigate("/login", { replace: true });
      }
      return;
    }

    // Normalise role
    const role = String(profile.role ?? "").toUpperCase().trim();

    // helper to check if current path is within base path (exact or startsWith)
    const isPath = (base: string) =>
      pathname === base || pathname.startsWith(base + "/");

    // If user is in an area they shouldn't be in, redirect to their portal
    if (isPath("/admin") && role !== "ADMIN") {
      if (role === "HOD") navigate("/hod", { replace: true });
      else if (role === "FACULTY") navigate("/faculty", { replace: true });
      else navigate("/no-access", { replace: true });
      return;
    }

    if (isPath("/hod") && role !== "HOD") {
      if (role === "ADMIN") navigate("/admin", { replace: true });
      else if (role === "FACULTY") navigate("/faculty", { replace: true });
      else navigate("/no-access", { replace: true });
      return;
    }

    if (isPath("/faculty") && role !== "FACULTY") {
      if (role === "ADMIN") navigate("/admin", { replace: true });
      else if (role === "HOD") navigate("/hod", { replace: true });
      else navigate("/no-access", { replace: true });
      return;
    }

    // If at a root entry point, route to the appropriate portal
    if (pathname === "/" || pathname === "/login") {
      if (role === "ADMIN") navigate("/admin", { replace: true });
      else if (role === "HOD") navigate("/hod", { replace: true });
      else if (role === "FACULTY") navigate("/faculty", { replace: true });
      else navigate("/no-access", { replace: true });
      return;
    }

    // no-op: user is on an allowed page
  }, [user, profile, loading, location.pathname, navigate, location]);

  return null;
}
