// src/components/admin/AddUserForm.tsx
import React, { useState } from "react";
import { createUser } from "../../lib/supabaseAdmin";

type Role = "HOD" | "FACULTY" | "ADMIN";

function generatePassword(length = 14) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_+={}[]<>?";
  // use crypto if available
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

export default function AddUserForm({
  defaultRole = "FACULTY",
  onCreated,
  onCancel,
}: {
  defaultRole?: Role;
  onCreated?: (profile?: any) => void;
  onCancel?: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(defaultRole);
  const [department, setDepartment] = useState("");
  const [phone, setPhone] = useState("");

  const [autoGenerate, setAutoGenerate] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function validate() {
    const errs: string[] = [];
    if (!fullName.trim()) errs.push("Full name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push("Valid email is required.");
    if (!["HOD", "FACULTY", "ADMIN"].includes(role)) errs.push("Role must be HOD, FACULTY or ADMIN.");
    if (!autoGenerate) {
      if (!password) errs.push("Password required.");
      if (password !== confirmPassword) errs.push("Passwords do not match.");
      if (password.length < 8) errs.push("Password should be at least 8 characters.");
    }
    return errs;
  }

  async function handleGenerate() {
    const pw = generatePassword(14);
    setPassword(pw);
    setConfirmPassword(pw);
    setShowPassword(true);
  }

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setServerError(null);
    setSuccessMsg(null);

    const errs = validate();
    if (errs.length) {
      setServerError(errs.join(" "));
      return;
    }

    setLoading(true);
    try {
      // Build payload using the new createUser function
      const profile = await createUser(
        email.trim(),
        fullName.trim(),
        role as 'HOD' | 'FACULTY' | 'ADMIN',
        autoGenerate ? undefined : password,
        department.trim() || undefined,
        phone.trim() || undefined
      );

      setSuccessMsg("User created successfully.");
      if (onCreated) onCreated(profile);

      // Clear form
      setFullName("");
      setEmail("");
      setDepartment("");
      setPhone("");
    } catch (err: any) {
      setServerError(err?.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h3 className="text-2xl font-semibold mb-2">Create User</h3>
      <p className="text-sm text-gray-600 mb-6">
        Create an account for HOD, Faculty, or Admin. For production, use server-side invites or password-setup links rather than emailing plaintext passwords.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Full name</label>
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-300"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-300"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-300"
            >
              <option value="HOD">HOD</option>
              <option value="FACULTY">Faculty</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Department</label>
            <input
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-300"
              placeholder="e.g., CSE"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-300"
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="flex items-center gap-3 mt-4">
            <input
              id="auto-gen"
              type="checkbox"
              checked={autoGenerate}
              onChange={() => {
                setAutoGenerate((v) => !v);
                // if toggling on, clear any manual password
                if (!autoGenerate) {
                  // going from manual -> auto generate: clear manual passwords
                  setPassword("");
                  setConfirmPassword("");
                } else {
                  // going from auto->manual: leave password blank so admin types
                  setPassword("");
                  setConfirmPassword("");
                }
              }}
              className="h-4 w-4 text-purple-600"
            />
            <label htmlFor="auto-gen" className="text-sm text-gray-700">
              Auto-generate password
            </label>
          </div>
        </div>

        {!autoGenerate && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-gray-200 shadow-sm pr-28 focus:ring-2 focus:ring-purple-300"
                  placeholder="Choose a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-sm rounded-md bg-gray-50 border"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-200 shadow-sm focus:ring-2 focus:ring-purple-300"
                placeholder="Confirm password"
              />
            </div>
          </div>
        )}

        {autoGenerate && (
          <div className="mt-6">
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="text-sm text-gray-700 mb-1">Generated password (admin copy)</div>
                <div className="rounded-md border bg-gray-50 px-3 py-2 text-sm font-mono break-all">
                  {password ? password : <span className="text-gray-400">No password generated yet</span>}
                </div>
                <div className="text-xs text-gray-500 mt-1">Use Generate to create a secure temporary password for the new user.</div>
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
                  onClick={() => {
                    if (!password) {
                      const p = generatePassword(14);
                      setPassword(p);
                      setConfirmPassword(p);
                      setShowPassword(true);
                      return;
                    }
                    navigator.clipboard?.writeText(password);
                  }}
                  className="inline-flex items-center px-4 py-2 rounded-md border bg-white text-sm"
                >
                  {password ? "Copy" : "Generate & Copy"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* server / validation messages */}
        <div className="mt-4">
          {serverError && <div className="text-sm text-red-600 mb-2">{serverError}</div>}
          {successMsg && <div className="text-sm text-green-600 mb-2">{successMsg}</div>}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
            }}
            className="px-4 py-2 rounded-md border bg-white"
            disabled={loading}
          >
            Cancel
          </button>

          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-purple-600 text-white shadow-sm disabled:opacity-60"
          >
            {loading ? "Creating..." : "Create user"}
          </button>
        </div>
      </form>
    </div>
  );
}
