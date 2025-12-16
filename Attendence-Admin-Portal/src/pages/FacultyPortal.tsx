import React from "react";
import FacultyHeader from "../components/faculty/FacultyHeader";
import FacultySidebar from "../components/faculty/FacultySidebar";
import FacultyDashboard from "../components/faculty/FacultyDashboard";
import GenerateQRPage from "../components/faculty/GenerateQRPage";
import CreateAttendancePage from "../components/faculty/CreateAttendancePage";
import AttendancePage from "../components/faculty/AttendancePage";
import AttendanceDetail from "../components/faculty/AttendanceDetail";
import { Route, Routes } from "react-router-dom";
import NotificationCenter from "../components/Notifications/NotificationCenter";
import SettingsView from "../components/Settings/SettingsView";
import ProfilePage from "../components/common/ProfilePage";

export default function FacultyPortal() {
  return (
    <div className="min-h-screen bg-[#F7F7FB] text-slate-800">
      <div className="flex">
        {/* Sidebar column (desktop uses fixed width; mobile will overlay) */}
        <div className="hidden md:block">
          <FacultySidebar />
        </div>

        {/* Main area: header + content */}
        <div className="flex-1 min-h-screen">
          <FacultyHeader />

          <main className="px-6 py-6 max-w-7xl mx-auto">
            <Routes>
              <Route index element={<FacultyDashboard />} />
              <Route path="generate-qr" element={<GenerateQRPage />} />
              <Route path="create-attendance" element={<CreateAttendancePage />} />
              <Route path="attendance" element={<AttendancePage />} />
              <Route path="attendance/:sessionId" element={<AttendanceDetail />} />
              <Route path="notifications" element={<NotificationCenter />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsView />} />
              <Route path="*" element={<div className="p-6 text-gray-600">Section not found</div>} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
