// src/pages/AdminPortal.tsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import AdminSidebar from "../components/admin/AdminSidebar";
import AdminHeader from "../components/admin/AdminHeader";

import DashboardPanel from "../components/admin/DashboardPanel";
import UsersManagementAdmin from "../components/admin/UsersManagementAdmin";
import AddUserForm from "../components/admin/AddUserForm";

// common admin pages
import AnalyticsView from "../components/Analytics/AnalyticsView";
import NotificationCenter from "../components/Notifications/NotificationCenter";
import ContentModeration from "../components/Moderation/ContentModeration";
import SettingsView from "../components/Settings/SettingsView";
import ProfilePage from "../components/Common/ProfilePage";

// admin attendance management (ensure this file exists at this path)
import AttendanceManagement from "../components/admin/AttendanceManagement";

// real messaging system (create file at src/components/admin/MessagingSystem.tsx)
import MessagingSystem from "../components/admin/MessagingSystem";

export default function AdminPortal() {
  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar (fixed width) */}
      <div className="w-72 flex-shrink-0">
        <div className="h-screen sticky top-0">
          <AdminSidebar />
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <AdminHeader />

        <main className="p-8 w-full">
          <Routes>
            {/* default dashboard */}
            <Route path="/" element={<DashboardPanel />} />

            {/* user management */}
            <Route path="users" element={<UsersManagementAdmin />} />
            <Route path="add-hod" element={<AddUserForm defaultRole="HOD" />} />
            <Route path="add-faculty" element={<AddUserForm defaultRole="FACULTY" />} />

            {/* additional common admin pages */}
            <Route path="analytics" element={<AnalyticsView />} />
            <Route path="notifications" element={<NotificationCenter />} />
            <Route path="moderation" element={<ContentModeration />} />
            <Route path="attendance" element={<AttendanceManagement />} />

            {/* messaging */}
            <Route path="messaging" element={<MessagingSystem />} />

            <Route path="profile" element={<ProfilePage />} />
            <Route path="settings" element={<SettingsView />} />

            {/* add more admin routes here as needed */}
          </Routes>
        </main>
      </div>
    </div>
  );
}
