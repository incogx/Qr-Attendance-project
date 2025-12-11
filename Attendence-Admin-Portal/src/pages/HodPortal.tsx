// src/pages/HodPortal.tsx
import React from "react";
import HodHeader from "../components/hod/HodHeader";
import HodSidebar from "../components/hod/HodSidebar";
import HodDashboard from "../components/hod/HodDashboard";
import FacultyManagement from "../components/hod/FacultyManagement";
import DepartmentAttendance from "../components/hod/DepartmentAttendance";
import HodApprovals from "../components/hod/HodApprovals";

import NotificationCenter from "../components/Notifications/NotificationCenter";
import SettingsView from "../components/Settings/SettingsView";
import { Routes, Route } from "react-router-dom";

export default function HodPortal() {
  return (
    <div className="min-h-screen flex bg-[#F7F7FB] text-slate-800">
      
      {/* LEFT SIDEBAR – FIXED WIDTH */}
      <div className="w-72 flex-shrink-0">
        <div className="h-screen sticky top-0">
          <HodSidebar />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col">
        {/* HEADER */}
        <HodHeader />

        {/* PAGE CONTENT */}
        <main className="p-6">
          <Routes>
            <Route index element={<HodDashboard />} />
            <Route path="faculty" element={<FacultyManagement />} />
            <Route path="attendance" element={<DepartmentAttendance />} />
            <Route path="approvals" element={<HodApprovals />} />
            <Route path="notifications" element={<NotificationCenter />} />
            <Route path="settings" element={<SettingsView />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
