// src/components/hod/AddFacultyForm.tsx
import React, { useState } from "react";

/**
 * AddFacultyForm: small modal form for creating faculty accounts
 * Replace mockCreateFaculty with supabase call.
 */

type Props = { open: boolean; onClose: ()=>void; onCreated?: ()=>void; };

async function mockCreateFaculty(payload: { name: string; email: string; dept: string; phone?: string; role?: string }) {
  await new Promise(r => setTimeout(r, 200));
  return { ok: true, id: Math.random().toString(36).slice(2,9) };
}

export default function AddFacultyForm({ open, onClose, onCreated }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [dept, setDept] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function submit() {
    if (!name || !email || !dept) return alert("Name, email and dept required");
    setLoading(true);
    try {
      // Supabase example:
      // const { data, error } = await supabase.from('faculty').insert({ full_name: name, email, dept, phone, role: 'FACULTY' }).select().single();
      const res = await mockCreateFaculty({ name,email,dept,phone,role:'FACULTY' });
      if (!res) throw new Error("Create failed");
      setName(""); setEmail(""); setDept(""); setPhone("");
      onCreated?.();
      onClose();
    } catch (err) {
      console.error(err);
      alert("Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center" role="dialog" aria-modal>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-lg p-6 w-[min(640px,94%)]">
        <h3 className="text-lg font-medium">Add Faculty</h3>
        <div className="mt-4 space-y-3">
          <input className="w-full px-3 py-2 border rounded" placeholder="Full name" value={name} onChange={e=>setName(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Department (e.g. CSE)" value={dept} onChange={e=>setDept(e.target.value)} />
          <input className="w-full px-3 py-2 border rounded" placeholder="Phone (optional)" value={phone} onChange={e=>setPhone(e.target.value)} />
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded border">Cancel</button>
          <button onClick={submit} disabled={loading} className="px-4 py-2 rounded bg-purple-600 text-white">{loading ? "Creating..." : "Create"}</button>
        </div>
      </div>
    </div>
  );
}
