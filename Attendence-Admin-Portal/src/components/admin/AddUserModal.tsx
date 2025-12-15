// src/components/admin/AddUserModal.tsx
import React, { useEffect, useState } from "react";

import { supabase, supabaseUrl } from "../../lib/supabase";

function generatePassword(length = 14) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_+={}[]<>?";
  try {
    const arr = new Uint32Array(length);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map((n) => charset[n % charset.length]).join("");
  } catch {
    let s = "";
    for (let i = 0; i < length; i++) s += charset[Math.floor(Math.random() * charset.length)];
    return s;
  }
}

export default function AddUserModal({
  role,
  open,
  onClose,
  onCreated,
}: {
  role: "HOD" | "FACULTY";
  open: boolean;
  onClose: () => void;
  onCreated?: (profile?: any) => void;
}) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [autoGenerate, setAutoGenerate] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [copyMsg, setCopyMsg] = useState("");

  useEffect(() => {
    if (!open) {
      setEmail("");
      setFullName("");
      setDepartment("");
      setPhone("");
      setErrorMsg("");
      setSuccessMsg("");
      setCopyMsg("");
      setLoading(false);
      setAutoGenerate(true);
      setPassword("");
      setShowPassword(false);
    }
  }, [open]);

  if (!open) return null;

  async function handleGenerate() {
    const p = generatePassword(14);
    setPassword(p);
    setShowPassword(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!email.trim() || !fullName.trim()) {
      setErrorMsg("Please fill Full name and Email.");
      return;
    }

    // basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrorMsg("Please enter a valid email address.");
      return;
    }

    // if not autoGenerate, ensure password exists (we'll generate if empty)
    let pwToSend = password;
    if (!autoGenerate && !pwToSend) {
      setErrorMsg("Please generate or type a temporary password.");
      return;
    }
    if (autoGenerate && !pwToSend) {
      // generate on demand so backend has a temp password
      pwToSend = generatePassword(14);
      setPassword(pwToSend);
      setShowPassword(true);
    }

    setLoading(true);
    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMsg("Please log in again");
        setLoading(false);
        return;
      }

      const payload: any = {
        email: email.trim(),
        full_name: fullName.trim(),
        role,
        department: department.trim() || null,
        phone: phone.trim() || null,
        password: pwToSend,
      };

      // Call Supabase Edge Function
      const EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/create-user`;
      
      const res = await fetch(EDGE_FUNCTION_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(payload),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        // show server message if present
        setErrorMsg(body?.error || body?.message || `Server returned ${res.status}`);
        setLoading(false);
        return;
      }

      // success
      setSuccessMsg("User created successfully.");
      // Call onCreated callback to refresh the user list
      if (onCreated) {
        onCreated(body.profile ?? body.user ?? body);
      }
      // keep the password visible so admin can copy it; don't clear it automatically
      setLoading(false);
      // optionally close modal automatically after short delay
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMsg(err?.message || "Network error");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded shadow-lg w-full max-w-2xl p-6">
        <h3 className="text-2xl font-semibold mb-3">Create {role}</h3>

        <p className="text-sm text-gray-600 mb-4">
          Create an account for HOD or Faculty. This will provision an Auth account and create a profile record.
        </p>

        {errorMsg && (
          <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-2 rounded mb-3 text-sm">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-50 border border-green-100 text-green-800 px-4 py-2 rounded mb-3 text-sm">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Full Name</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Email</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Department (optional)</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g., CSE"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Phone (optional)</label>
              <input
                className="w-full px-3 py-2 border rounded"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 mt-1">
            <input
              id="auto-gen-modal"
              type="checkbox"
              checked={autoGenerate}
              onChange={() => setAutoGenerate((v) => !v)}
              className="h-4 w-4 text-purple-600"
            />
            <label htmlFor="auto-gen-modal" className="text-sm text-gray-700">
              Auto-generate temporary password
            </label>
          </div>

          <div className="mt-3">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-700 mb-1">Temporary password (admin copy)</div>
                <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm font-mono break-all">
                  {password ? password : <span className="text-gray-400">No password generated yet</span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Use Generate to create a secure password which you can copy for the user. For production, prefer invite / password-setup links.
                </div>
                {copyMsg && (
                  <div className="text-xs text-green-600 mt-1 font-medium">
                    {copyMsg}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="inline-flex items-center px-4 py-2 rounded-md bg-purple-600 text-white shadow-sm"
                >
                  Generate
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    if (!password) {
                      const p = generatePassword(14);
                      setPassword(p);
                      setShowPassword(true);
                      setCopyMsg("Password generated!");
                      setTimeout(() => setCopyMsg(""), 2000);
                      return;
                    }
                    try {
                      await navigator.clipboard.writeText(password);
                      setCopyMsg("Copied to clipboard!");
                      setTimeout(() => setCopyMsg(""), 2000);
                    } catch (err) {
                      setCopyMsg("Copy failed - select and copy manually");
                      setTimeout(() => setCopyMsg(""), 3000);
                    }
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-md border bg-white text-sm"
                >
                  {password ? "Copy" : "Generate & Copy"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="inline-flex items-center px-4 py-2 rounded-md border bg-white text-sm"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-purple-600 text-white rounded">
              {loading ? "Creating..." : `Create ${role}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
