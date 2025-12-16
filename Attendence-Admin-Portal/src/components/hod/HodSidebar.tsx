// src/components/hod/HodSidebar.tsx
import { useState } from "react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { BarChart3, Users, CheckSquare, Bell, Settings, Menu, X, ClipboardCheck } from "lucide-react";

type NavItemProps = {
  to: string;
  label: string;
  icon?: ReactNode;
  end?: boolean;
  onClick?: () => void;
};

function NavItem({ to, label, icon, end = false, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-purple-300",
          isActive ? "bg-purple-600 text-white" : "text-gray-700 hover:bg-gray-50",
        ].join(" ")
      }
    >
      <span className="w-5 h-5 flex-shrink-0">{icon}</span>
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function HodSidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Mobile header: visible on small screens */}
      <div className="md:hidden flex items-center justify-between p-3 border-b bg-white">
        <div className="flex items-center gap-3">
          <img src="/sathyabama-logo.png" alt="Sathyabama" className="w-8 h-8 object-contain" />
          <div className="text-sm font-semibold text-purple-700">SATHYABAMA</div>
        </div>

        <button
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
          className="p-2 rounded-md border bg-white shadow-sm"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Desktop sidebar: fixed width, full height */}
      <aside className="hidden md:flex md:flex-col w-72 flex-shrink-0 bg-white border-r p-6 h-screen">
        <div>
          <div className="flex items-center gap-3 mb-6">
            <img src="/sathyabama-logo.png" alt="Sathyabama" className="w-12 h-12 object-contain" />
            <div>
              <h1 className="text-lg font-bold text-purple-700">SATHYABAMA</h1>
              <p className="text-xs text-gray-500">Institute of Science & Technology</p>
            </div>
          </div>

          {/* Sectioned navigation with generous gaps */}
          <nav className="flex flex-col">
            <div className="text-xs font-semibold text-slate-500 mb-2">OVERVIEW</div>
            <div className="flex flex-col gap-2">
              <NavItem to="/hod" label="Dashboard" icon={<BarChart3 className="w-5 h-5" />} onClick={close} end />
              <NavItem to="/hod/faculty" label="Faculty" icon={<Users className="w-5 h-5" />} onClick={close} />
            </div>

            <div className="mt-6 text-xs font-semibold text-slate-500 mb-2">ATTENDANCE</div>
            <div className="flex flex-col gap-2">
              <NavItem to="/hod/attendance" label="Department Attendance" icon={<CheckSquare className="w-5 h-5" />} onClick={close} />
              <NavItem to="/hod/approvals" label="Approvals" icon={<ClipboardCheck className="w-5 h-5" />} onClick={close} />
            </div>

            <div className="mt-6 text-xs font-semibold text-slate-500 mb-2">OTHER</div>
            <div className="flex flex-col gap-2">
              <NavItem to="/hod/notifications" label="Notifications" icon={<Bell className="w-5 h-5" />} onClick={close} />
              <NavItem to="/hod/settings" label="Settings" icon={<Settings className="w-5 h-5" />} onClick={close} />
            </div>
          </nav>
        </div>

        {/* Footer pinned to bottom */}
        <div className="mt-auto text-xs text-gray-500">
          <div className="mb-1">Logged in as</div>
          <div className="font-medium text-gray-700">HOD</div>
          <div className="mt-3">
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
              <img src="/sathyabama-logo.png" alt="Sathyabam" className="w-10 h-10 object-contain" />
              <div className="text-sm font-semibold text-purple-700">SATHYABAMA</div>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-1 rounded-md border">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mobile: sectioned navigation with dividers */}
          <nav className="flex flex-col">
            <div className="text-xs font-semibold text-slate-500 mb-2">OVERVIEW</div>
            <div className="flex flex-col gap-2">
              <NavItem to="/hod" label="Dashboard" icon={<BarChart3 className="w-5 h-5" />} onClick={close} end />
              <NavItem to="/hod/faculty" label="Faculty" icon={<Users className="w-5 h-5" />} onClick={close} />
            </div>

            <div className="my-4 border-t" />
            <div className="text-xs font-semibold text-slate-500 mb-2">ATTENDANCE</div>
            <div className="flex flex-col gap-2">
              <NavItem to="/hod/attendance" label="Department Attendance" icon={<CheckSquare className="w-5 h-5" />} onClick={close} />
              <NavItem to="/hod/approvals" label="Approvals" icon={<ClipboardCheck className="w-5 h-5" />} onClick={close} />
            </div>

            <div className="my-4 border-t" />
            <div className="text-xs font-semibold text-slate-500 mb-2">OTHER</div>
            <div className="flex flex-col gap-2">
              <NavItem to="/hod/notifications" label="Notifications" icon={<Bell className="w-5 h-5" />} onClick={close} />
              <NavItem to="/hod/settings" label="Settings" icon={<Settings className="w-5 h-5" />} onClick={close} />
            </div>
          </nav>

          <div className="mt-6 text-xs text-gray-500">
            <div className="mb-1">Logged in as</div>
            <div className="font-medium text-gray-700">HOD</div>
            <div className="mt-3">
              <a href="https://sathyabama.edu.in" className="text-purple-600 hover:underline">sathyabama.edu.in</a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
