// src/components/admin/AdminSidebar.tsx
import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  Users,
  Settings,
  Bell,
  Shield,
  Menu,
  X,
  FileText,
  MessageSquare
} from "lucide-react";

type NavItemProps = {
  to: string;
  label: string;
  end?: boolean;
  icon?: ReactNode;
  onClick?: () => void;
};

function NavItem({ to, label, end = false, icon, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition",
          "focus:outline-none focus:ring-2 focus:ring-purple-300",
          isActive ? "bg-purple-600 text-white" : "text-gray-700 hover:bg-gray-50"
        ].join(" ")
      }
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-2">
          <img
            src="/sathyabama-logo.png"
            alt="Sathyabama Logo"
            className="w-8 h-8 object-contain"
          />
          <span className="font-semibold text-purple-700">Sathyabama</span>
        </div>

        <button
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="inline-flex items-center justify-center p-2 rounded-md border bg-white shadow-sm hover:bg-gray-50"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={[
          "bg-white border-r w-72 md:static fixed inset-y-0 left-0 z-40 transform transition-transform duration-200",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "md:translate-x-0 md:shadow-none shadow-lg"
        ].join(" ")}
      >
        <div className="p-6 h-full flex flex-col">
          
          {/* SATHYABAMA BRANDING */}
          <div className="hidden md:flex items-center gap-3 mb-6">
            <img
              src="/sathyabama-logo.png"
              alt="Sathyabama Logo"
              className="w-12 h-12 object-contain"
            />
            <div className="leading-tight">
              <h1 className="text-lg font-bold text-purple-700">SATHYABAMA</h1>
              <p className="text-xs text-gray-500">Institute of Science & Technology</p>
            </div>
          </div>

          {/* Navigation with sections */}
          <nav className="flex-1">
            <div className="text-xs font-semibold text-slate-500 mb-2">OVERVIEW</div>
            <div className="flex flex-col gap-2 mb-6">
              <NavItem
                to="/admin"
                label="Dashboard"
                end
                icon={<BarChart3 className="w-5 h-5" />}
                onClick={closeMobile}
              />
              <NavItem
                to="/admin/users"
                label="Users"
                icon={<Users className="w-5 h-5" />}
                onClick={closeMobile}
              />
            </div>

            <div className="text-xs font-semibold text-slate-500 mb-2">ATTENDANCE</div>
            <div className="flex flex-col gap-2 mb-6">
              <NavItem to="/admin/attendance" label="Attendance Management" icon={<FileText className="w-5 h-5" />} onClick={closeMobile} />
              <NavItem to="/admin/messaging" label="Messaging" icon={<MessageSquare className="w-5 h-5" />} onClick={closeMobile} />
            </div>

            <div className="text-xs font-semibold text-slate-500 mb-2">OTHER</div>
            <div className="flex flex-col gap-2">
              <NavItem to="/admin/analytics" label="Analytics" icon={<BarChart3 className="w-5 h-5" />} onClick={closeMobile} />
              <NavItem to="/admin/notifications" label="Notifications" icon={<Bell className="w-5 h-5" />} onClick={closeMobile} />
              <NavItem to="/admin/moderation" label="Moderation" icon={<Shield className="w-5 h-5" />} onClick={closeMobile} />
              <NavItem to="/admin/settings" label="Settings" icon={<Settings className="w-5 h-5" />} onClick={closeMobile} />
            </div>
          </nav>

        
        </div>
      </aside>
    </>
  );
}
