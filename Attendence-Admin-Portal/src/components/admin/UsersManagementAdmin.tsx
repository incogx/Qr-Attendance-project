// src/components/admin/UserManagement.tsx
import { Plus, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import dayjs from "dayjs";
import AddUserModal from "./AddUserModal";
import { listUsers, deleteUser, UserProfile } from "../../lib/supabaseAdmin";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [showAddModal, setShowAddModal] = useState<"HOD" | "FACULTY" | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  // basic client-side toast messages
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- REPLACED fetchProfiles: use new supabaseAdmin functions ----------
  async function fetchProfiles() {
    setLoadingProfiles(true);
    setToast(null);

    try {
      const users = await listUsers();
      setProfiles(users);
    } catch (err: any) {
      console.error("Failed to fetch profiles:", err);
      setToast({ type: "error", message: "Failed to load users." });
    } finally {
      setLoadingProfiles(false);
    }
  }
  // -------------------------------------------------------------------------

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return profiles;
    return profiles.filter(
      (p) =>
        (p.full_name ?? "").toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.role ?? "").toLowerCase().includes(q)
    );
  }, [profiles, searchTerm]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this user profile? This cannot be undone.")) return;
    setDeleteLoadingId(id);

    try {
      await deleteUser(id);
      setToast({ type: "success", message: "User deleted." });
      await fetchProfiles();
    } catch (err) {
      console.error("Failed to delete user:", err);
      setToast({ type: "error", message: "Delete failed." });
    } finally {
      setDeleteLoadingId(null);
    }
  }

  async function copyId(id?: string) {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setToast({ type: "success", message: "ID copied" });
      setTimeout(() => setToast(null), 1500);
    } catch (err) {
      console.warn("clipboard failed", err);
      setToast({ type: "error", message: "Copy failed" });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Manage Users</h2>
          <p className="text-gray-600">Create HOD and Faculty accounts and delete credentials.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal("HOD")}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            aria-label="Add HOD"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add HOD</span>
          </button>
          <button
            onClick={() => setShowAddModal("FACULTY")}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            aria-label="Add Faculty"
          >
            <Plus className="w-5 h-5" />
            <span className="font-medium">Add Faculty</span>
          </button>
          <button
            onClick={() => fetchProfiles()}
            className="px-4 py-2 rounded border border-gray-200 bg-white hover:bg-gray-50"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent outline-none"
            aria-label="Search users"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-sm text-gray-500">
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Created</th>
                <th className="py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingProfiles ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-gray-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="py-4 px-4">
                      <div className="font-medium">{p.full_name ?? "—"}</div>
                    </td>
                    <td className="py-4 px-4 text-gray-600">{p.email}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{p.role ?? "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{p.department ?? "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{p.phone ?? "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {p.created_at ? dayjs(p.created_at).format("M/D/YYYY, h:mm:ss A") : "—"}
                    </td>
                    <td className="py-4 px-4 text-sm">
                      <button onClick={() => copyId(p.id)} className="mr-4 text-indigo-600 hover:underline">
                        CopyID
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-red-600 hover:underline"
                        disabled={deleteLoadingId === p.id}
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
      </div>

      {/* Add User Modal */}
      <AddUserModal role={showAddModal as "HOD" | "FACULTY"} open={!!showAddModal} onClose={() => setShowAddModal(null)} onCreated={() => fetchProfiles()} />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-60 rounded px-4 py-2 shadow ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-3 underline text-xs opacity-90" aria-label="dismiss">
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
