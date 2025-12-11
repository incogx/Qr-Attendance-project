// src/components/hod/FacultyManagement.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Download, Trash2, Edit, UserPlus } from "lucide-react";

/**
 * RequestFacultyModal: modal for requesting new faculty accounts (sent to admin)
 */
function RequestFacultyModal({ open, onClose, onRequested }: { open: boolean; onClose: ()=>void; onRequested?: ()=>void; }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("");
  const [phone, setPhone] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!name || !email || !dept || !reason) return alert("All fields are required");
    setLoading(true);
    try {
      // Mock request submission to admin
      await new Promise(r => setTimeout(r, 200));
      // In real app: send request to admin via API/supabase
      alert("Faculty addition request sent to Admin for approval");
      setName(""); setEmail(""); setDept(""); setPhone(""); setReason("");
      onRequested?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 w-[min(640px,94%)]">
        <h3 className="text-lg font-medium">Request Faculty Addition</h3>
        <div className="text-sm text-slate-500 mt-1">This request will be sent to Admin for approval</div>
        <div className="mt-4 space-y-3">
          <input className="w-full px-3 py-2 border rounded" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Department (e.g. CSE)" value={dept} onChange={e=>setDept(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Phone (optional)" value={phone} onChange={e=>setPhone(e.target.value)} />
          <textarea
            className="w-full px-3 py-2 border rounded"
            placeholder="Reason for addition (required)"
            value={reason}
            onChange={e=>setReason(e.target.value)}
            rows={3}
          />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={submit} disabled={loading} className="px-4 py-2 rounded bg-purple-600 text-white">{loading ? "Sending..." : "Send Request"}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * EditFacultyModal: small modal form for editing faculty accounts
 */
function EditFacultyModal({ faculty, open, onClose, onUpdated }: { faculty: Faculty | null; open: boolean; onClose: ()=>void; onUpdated?: ()=>void; }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (faculty) {
      setName(faculty.name);
      setEmail(faculty.email);
      setDept(faculty.dept);
      setPhone(faculty.phone || "");
    }
  }, [faculty]);

  if (!open || !faculty) return null;

  async function submit() {
    if (!name || !email || !dept) return alert("Name, email and dept required");
    setLoading(true);
    try {
      // Mock update
      await new Promise(r => setTimeout(r, 200));
      // In real app: supabase.from('faculty').update({ full_name: name, email, dept, phone }).eq('id', faculty.id)
      onUpdated?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Update failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 w-[min(640px,94%)]">
        <h3 className="text-lg font-medium">Edit Faculty</h3>
        <div className="mt-4 space-y-3">
          <input className="w-full px-3 py-2 border rounded" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Department (e.g. CSE)" value={dept} onChange={e=>setDept(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Phone (optional)" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={submit} disabled={loading} className="px-4 py-2 rounded bg-purple-600 text-white">{loading ? "Updating..." : "Update"}</button>
        </div>
      </div>
    </div>
  );
}

/**
 * FacultyManagement
 * - Shows a searchable, paginated list of faculty
 * - Actions: Edit (navigate), Delete (mock)
 */

/* Mock fetch */
type Faculty = { id: string; name: string; email: string; dept: string; phone?: string; role?: string; };
async function mockFetchFaculty(): Promise<Faculty[]> {
  await new Promise(r => setTimeout(r, 120));
  return Array.from({length: 26}).map((_,i) => ({ id: `f${i+1}`, name: `Dr. Faculty ${i+1}`, email:`fac${i+1}@sathyabama.edu.in`, dept: i%2===0 ? "CSE" : "ECE", phone: `+91-90000${100+i}` }));
}

export default function FacultyManagement() {
  const [list, setList] = useState<Faculty[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState<Faculty | null>(null);
  const pageSize = 10;
  useEffect(() => { (async ()=> setList(await mockFetchFaculty()))(); }, []);

  const filtered = useMemo(() => list.filter(f => f.name.toLowerCase().includes(query.toLowerCase()) || f.email.toLowerCase().includes(query.toLowerCase())), [list, query]);
  const total = filtered.length;
  const pageItems = filtered.slice((page-1)*pageSize, page*pageSize);

  function deleteFaculty(id: string) {
    if (!confirm("Delete faculty?")) return;
    setList(prev => prev.filter(p => p.id !== id));
    // in real app: supabase.from('faculty').delete().eq('id', id)
  }

  function exportCSV() {
    const rows = [["Name","Email","Dept","Phone"], ...filtered.map(f => [f.name,f.email,f.dept,f.phone||""])];
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `faculty_list.csv`; a.click(); URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Faculty Management</h3>
          <div className="text-sm text-slate-500">Request faculty additions, edit and remove faculty accounts</div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
            aria-label="Request Faculty Addition"
          >
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Request Faculty</span>
          </button>
          <input className="px-3 py-2 border rounded-md" placeholder="Search by name or email" value={query} onChange={e=>{setQuery(e.target.value); setPage(1);}} />
          <button onClick={exportCSV} className="px-3 py-2 rounded border inline-flex items-center gap-2 text-sm"><Download className="w-4 h-4" /> Export</button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-slate-500">
              <tr><th className="py-2 px-3">Name</th><th className="py-2 px-3">Email</th><th className="py-2 px-3">Dept</th><th className="py-2 px-3">Phone</th><th className="py-2 px-3">Actions</th></tr>
            </thead>
            <tbody className="divide-y">
              {pageItems.map(f => (
                <tr key={f.id}>
                  <td className="py-3 px-3 font-medium">{f.name}</td>
                  <td className="py-3 px-3">{f.email}</td>
                  <td className="py-3 px-3">{f.dept}</td>
                  <td className="py-3 px-3">{f.phone}</td>
                  <td className="py-3 px-3">
                    <div className="flex gap-2">
                      <button onClick={()=> setEditingFaculty(f)} className="px-2 py-1 rounded border inline-flex items-center gap-2 text-sm"><Edit className="w-4 h-4" /> Edit</button>
                      <button onClick={()=> deleteFaculty(f.id)} className="px-2 py-1 rounded border text-red-600 inline-flex items-center gap-2 text-sm"><Trash2 className="w-4 h-4" /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <div className="text-xs text-slate-500">Showing {Math.min((page-1)*pageSize+1, total)}–{Math.min(page*pageSize, total)} of {total}</div>
          <div className="flex gap-2">
            <button onClick={()=> setPage(p => Math.max(1, p-1))} className="px-3 py-1 border rounded" disabled={page===1}>Prev</button>
            <button onClick={()=> setPage(p => p*pageSize < total ? p+1 : p)} className="px-3 py-1 border rounded" disabled={page*pageSize >= total}>Next</button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RequestFacultyModal open={showRequestModal} onClose={() => setShowRequestModal(false)} onRequested={() => setShowRequestModal(false)} />
      <EditFacultyModal faculty={editingFaculty} open={!!editingFaculty} onClose={() => setEditingFaculty(null)} onUpdated={() => setEditingFaculty(null)} />
    </div>
  );
}
