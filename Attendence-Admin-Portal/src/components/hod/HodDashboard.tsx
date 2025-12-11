// src/components/hod/HodDashboard.tsx
import React from "react";
import { useNavigate } from "react-router-dom";

/* Simple reusable card */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      {children}
    </div>
  );
}

export default function HodDashboard() {
  const navigate = useNavigate();

  // Mock export action
  function handleExport() {
    alert("Exporting department attendance reports...");
  }

  return (
    <div className="space-y-6">
      {/* -------- PAGE HEADER -------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">HOD Dashboard</h1>
          <div className="text-sm text-slate-500 mt-1">
            Department overview and quick actions
          </div>
        </div>

        <div className="text-sm text-slate-600">Overview</div>
      </div>

      {/* -------- THREE METRIC CARDS -------- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-slate-500">Total Faculty</div>
          <div className="text-2xl font-semibold mt-2">42</div>
          <div className="text-xs text-slate-400 mt-2">Active in department</div>
        </Card>

        <Card>
          <div className="text-sm text-slate-500">Department Attendance (Today)</div>
          <div className="text-2xl font-semibold mt-2">88%</div>
          <div className="text-xs text-slate-400 mt-2">Average across classes</div>
        </Card>

        <Card>
          <div className="text-sm text-slate-500">Pending Requests</div>
          <div className="text-2xl font-semibold mt-2">3</div>
          <div className="text-xs text-slate-400 mt-2">Approvals needed</div>
        </Card>
      </div>

      {/* -------- ACTIVITY + QUICK ACTIONS -------- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* --- Recent Activity Section --- */}
        <div className="lg:col-span-2 bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="font-medium text-slate-900">Recent Activity</h3>
          <div className="mt-3 text-sm text-slate-500">
            Latest attendance changes, faculty logins and requests.
          </div>

          <ul className="mt-3 space-y-2 text-sm">
            <li className="p-2 border rounded bg-slate-50">Ali marked attendance for CS201</li>
            <li className="p-2 border rounded bg-slate-50">New faculty account created: Dr. X</li>
            <li className="p-2 border rounded bg-slate-50">Attendance report exported for CSE</li>
          </ul>
        </div>

        {/* --- Quick Actions Section --- */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <h3 className="font-medium text-slate-900">Quick Actions</h3>

          <div className="mt-4 flex flex-col gap-3">

            {/* Add Faculty */}
            <button
              onClick={() => navigate("/hod/faculty")}
              className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition"
            >
              Add Faculty
            </button>

            {/* View Attendance */}
            <button
              onClick={() => navigate("/hod/attendance")}
              className="px-3 py-2 rounded border hover:bg-slate-50 transition"
            >
              View Attendance
            </button>

            {/* Export Reports */}
            <button
              onClick={handleExport}
              className="px-3 py-2 rounded border hover:bg-slate-50 transition"
            >
              Export Reports
            </button>

          </div>
        </div>

      </div>
    </div>
  );
}
