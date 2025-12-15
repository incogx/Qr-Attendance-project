import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BarChart3,
  QrCode,
  CheckSquare,
  Bell,
  Settings,
  Menu,
  X,
  Plus,
} from "lucide-react";

type NavItemProps = {
  to: string;
  label: string;
  end?: boolean;
  icon?: React.ReactNode;
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
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-purple-300",
          isActive
            ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white shadow"
            : "text-gray-700 hover:bg-gray-50",
        ].join(" ")
      }
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function FacultySidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Mobile header toggle */}
      <div className="md:hidden flex items-center justify-between p-3 bg-white border-b">
        <div className="flex items-center gap-3">
          <img src="/sathyabama-logo.png" alt="logo" className="w-8 h-8 object-contain" />
          <div className="text-sm font-semibold text-purple-700">SATHYABAMA</div>
        </div>

        <button
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-md border bg-white shadow-sm"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop sidebar (fixed column, full height) */}
      <aside className="hidden md:flex md:flex-col w-72 bg-white border-r p-6 gap-6 h-screen">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <img src="/sathyabama-logo.png" alt="logo" className="w-12 h-12 object-contain" />
            <div>
              <div className="text-lg font-bold text-purple-700">SATHYABAMA</div>
              <div className="text-xs text-gray-500">Institute of Science & Technology</div>
            </div>
          </div>

          <nav className="flex flex-col gap-6">
            {/* Main Navigation */}
            <div className="space-y-2">
              <NavItem to="/faculty" label="Dashboard" end icon={<BarChart3 className="w-5 h-5" />} onClick={close} />
            </div>

            {/* Attendance Section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">Attendance</p>
              <NavItem to="/faculty/generate-qr" label="Generate QR" icon={<QrCode className="w-5 h-5" />} onClick={close} />
              <NavItem to="/faculty/create-attendance" label="Create Attendance" icon={<Plus className="w-5 h-5" />} onClick={close} />
              <NavItem to="/faculty/attendance" label="Attendance Reports" icon={<CheckSquare className="w-5 h-5" />} onClick={close} />
            </div>

            {/* Settings Section */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-2">Other</p>
              <NavItem to="/faculty/notifications" label="Notifications" icon={<Bell className="w-5 h-5" />} onClick={close} />
              <NavItem to="/faculty/settings" label="Settings" icon={<Settings className="w-5 h-5" />} onClick={close} />
            </div>
          </nav>
        </div>

        {/* Footer pinned to bottom of sidebar */}
        <div className="mt-auto text-xs text-gray-500">
          <div className="mb-2">Logged in as</div>
          <div className="font-medium text-gray-700 mb-3">Faculty</div>
          <div>
            <a href="https://www.sathyabama.ac.in/" className="text-purple-600 hover:underline">sathyabama.edu.in</a>
          </div>
        </div>
      </aside>

      {/* Mobile slide-over */}
      <div className={`md:hidden fixed inset-0 z-50 ${open ? "block" : "pointer-events-none"}`}>
        <div
          className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
          onClick={() => setOpen(false)}
          aria-hidden
        />
        <div
          className={`absolute left-0 top-0 bottom-0 w-72 bg-white border-r p-6 transform transition-transform ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <img src="/sathyabama-logo.png" alt="logo" className="w-10 h-10 object-contain" />
              <div className="text-sm font-semibold text-purple-700">SATHYABAMA</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 rounded-md border">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex flex-col gap-3">
            <NavItem to="/faculty" label="Dashboard" end icon={<BarChart3 className="w-5 h-5" />} onClick={close} />

            <div className="border-t pt-3 space-y-2">
              <NavItem to="/faculty/generate-qr" label="Generate QR" icon={<QrCode className="w-5 h-5" />} onClick={close} />
              <NavItem to="/faculty/create-attendance" label="Create Attendance" icon={<Plus className="w-5 h-5" />} onClick={close} />
              <NavItem to="/faculty/attendance" label="Attendance Reports" icon={<CheckSquare className="w-5 h-5" />} onClick={close} />
            </div>

            <div className="border-t pt-3 space-y-2">
              <NavItem to="/faculty/notifications" label="Notifications" icon={<Bell className="w-5 h-5" />} onClick={close} />
              <NavItem to="/faculty/settings" label="Settings" icon={<Settings className="w-5 h-5" />} onClick={close} />
            </div>
          </nav>
        </div>
      </div>
    </>
  );
}
