// src/components/admin/AnalyticsView.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  BarChart3,
  Users,
  UserCheck,
  UserX,
  Activity,
  LineChart,
} from "lucide-react";

export default function AnalyticsView() {
  const { user, loading } = useAuth() as any;
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    totalUsers: 0,
    faculty: 0,
    hod: 0,
    admin: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    setLoadingStats(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("role");

      if (error) throw error;

      const total = data.length;
      const faculty = data.filter((x) => x.role === "FACULTY").length;
      const hod = data.filter((x) => x.role === "HOD").length;
      const admin = data.filter((x) => x.role === "ADMIN").length;

      setStats({
        totalUsers: total,
        faculty,
        hod,
        admin,
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    } finally {
      setLoadingStats(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Header -------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Analytics Dashboard
          </h2>
          <p className="text-gray-600">
            Track performance and insights across your platform
          </p>
        </div>
      </div>

      {/* KPI Cards ------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPI
          title="Total Users"
          value={loadingStats ? "…" : stats.totalUsers}
          icon={<Users className="w-8 h-8 text-purple-600" />}
        />
        <KPI
          title="Faculty Members"
          value={loadingStats ? "…" : stats.faculty}
          icon={<UserCheck className="w-8 h-8 text-blue-600" />}
        />
        <KPI
          title="HODs"
          value={loadingStats ? "…" : stats.hod}
          icon={<UserX className="w-8 h-8 text-green-600" />}
        />
        <KPI
          title="Admins"
          value={loadingStats ? "…" : stats.admin}
          icon={<Activity className="w-8 h-8 text-orange-600" />}
        />
      </div>

      {/* Chart + Insights ---------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Trend Chart Placeholder */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <LineChart className="w-5 h-5 text-purple-600" />
            User Growth Trend
          </h3>

          <div className="h-52 flex items-center justify-center border border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-400 text-sm">
              (Chart placeholder — connect real monthly count here)
            </p>
          </div>
        </div>

        {/* Role Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            User Role Distribution
          </h3>

          <div className="space-y-3">
            <Distribution label="Faculty" count={stats.faculty} />
            <Distribution label="HOD" count={stats.hod} />
            <Distribution label="Admin" count={stats.admin} />
          </div>
        </div>

      </div>

      {/* Summary -------------------------------------------------------- */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          Activity Summary
        </h3>
        <p className="text-gray-600 text-sm">
          This dashboard will update automatically as more activity data (attendance,
          submissions, content moderation, etc.) get connected to analytics.
        </p>
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable Components */
/* ------------------------------------------------------------------ */

function KPI({ title, value, icon }: any) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex items-center gap-4">
      <div className="p-3 bg-purple-50 rounded-lg">{icon}</div>
      <div>
        <p className="text-gray-600 text-sm">{title}</p>
        <p className="text-2xl font-semibold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
}

function Distribution({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">
        {count}
      </span>
    </div>
  );
}
