// src/components/admin/UserManagement.tsx
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import dayjs from "dayjs";
import AddUserModal from "./AddUserModal";
import { listUsers, deleteUser } from "../../lib/supabaseAdmin";
import { supabase } from "../../lib/supabase";

type ProfileRow = {
  id: string;
  email: string;
  full_name?: string | null;
  role?: string | null;
  department?: string | null;
  phone?: string | null;
  created_at?: string | null;
};

export default function UserManagement() {
  const location = useLocation();
  
  /* ================================
     USERS STATE
  ================================= */
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState<"HOD" | "FACULTY" | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  /* ================================
     STUDENT SIGNUP TOGGLE
  ================================= */
  const [signupEnabled, setSignupEnabled] = useState(false);
  const [loadingSignup, setLoadingSignup] = useState(true);

  /* ================================
     TOAST
  ================================= */
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  /* ================================
     INITIAL LOAD & REFRESH ON NAVIGATION
  ================================= */
  useEffect(() => {
    fetchProfiles();
    fetchSignupSetting();
  }, [location.pathname]); // Refresh when navigating to this page

  /* ================================
     FETCH USERS
  ================================= */
  async function fetchProfiles() {
    setLoadingProfiles(true);
    try {
      const users = await listUsers();
      setProfiles(users);
    } catch {
      setToast({ type: "error", message: "Failed to load users" });
    } finally {
      setLoadingProfiles(false);
    }
  }

  /* ================================
     FETCH SIGNUP SETTING
  ================================= */
  async function fetchSignupSetting() {
    const { data, error } = await supabase
      .from("system_settings")
      .select("student_signup_enabled")
      .single();

    if (!error && data) {
      setSignupEnabled(data.student_signup_enabled);
    }
    setLoadingSignup(false);
  }

  /* ================================
     TOGGLE SIGNUP (FIXED)
  ================================= */
  async function toggleSignup(value: boolean) {
    setSignupEnabled(value);

    const { error } = await supabase
      .from("system_settings")
      .update({ student_signup_enabled: value })
      // REQUIRED so PostgREST allows UPDATE
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) {
      setSignupEnabled(!value);
      setToast({ type: "error", message: "Failed to update signup setting" });
    } else {
      setToast({
        type: "success",
        message: value ? "Student signup enabled" : "Student signup disabled",
      });
      setTimeout(() => setToast(null), 1500);
    }
  }

  /* ================================
     DELETE USER
  ================================= */
  async function handleDelete(id: string) {
    if (!confirm("Delete this user?")) return;
    setDeleteLoadingId(id);

    try {
      await deleteUser(id);
      setToast({ type: "success", message: "User deleted" });
      fetchProfiles();
    } catch {
      setToast({ type: "error", message: "Delete failed" });
    } finally {
      setDeleteLoadingId(null);
    }
  }

  /* ================================
     FILTER USERS
  ================================= */
  const filtered = useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.role ?? "").toLowerCase().includes(q)
    );
  }, [profiles, searchTerm]);

  return (
    <div className="space-y-6">
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Manage Users</h2>
          <p className="text-gray-600">
            Create HOD and Faculty accounts and control student registration.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setShowAddModal("HOD")}
            className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" /> Add HOD
          </button>
          <button
            onClick={() => setShowAddModal("FACULTY")}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            <Plus className="w-5 h-5" /> Add Faculty
          </button>
        </div>
      </div>

      {/* ================= STUDENT SIGNUP CARD ================= */}
      <div className="bg-white rounded-xl border p-5 flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Student Registration</h3>
          <p className="text-xs text-gray-500">
            This is enforced at backend Edge Functions level.
          </p>
        </div>

        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={signupEnabled}
            disabled={loadingSignup}
            onChange={(e) => toggleSignup(e.target.checked)}
          />
          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-green-500 transition-all" />
          <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5" />
        </label>
      </div>

      {/* ================= USERS TABLE ================= */}
      <div className="bg-white rounded-xl border p-6">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
          />
        </div>

        <table className="w-full text-sm">
          <thead className="text-gray-500 border-b">
            <tr>
              <th className="py-2 text-left">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Department</th>
              <th>Phone</th>
              <th>Created</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loadingProfiles ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filtered.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="py-3">{p.full_name ?? "—"}</td>
                  <td>{p.email}</td>
                  <td>{p.role}</td>
                  <td>{p.department ?? "—"}</td>
                  <td>{p.phone ?? "—"}</td>
                  <td>{dayjs(p.created_at).format("DD/MM/YYYY")}</td>
                  <td>
                    <button
                      disabled={deleteLoadingId === p.id}
                      onClick={() => handleDelete(p.id)}
                      className="text-red-600 hover:underline"
                    >
                      {deleteLoadingId === p.id ? "Deleting..." : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL ================= */}
      <AddUserModal
        role={showAddModal as "HOD" | "FACULTY"}
        open={!!showAddModal}
        onClose={() => setShowAddModal(null)}
        onCreated={fetchProfiles}
      />

      {/* ================= TOAST ================= */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-2 rounded text-white shadow ${
            toast.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
