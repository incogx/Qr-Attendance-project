// src/components/admin/DashboardPanel.tsx
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "../../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import {
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

type Counts = { 
  totalUsers: number; 
  totalFaculty: number; 
  totalHod: number;
  totalAdmins: number;
  totalStudents: number;
  todaySessions: number;
  weekSessions: number;
};

function formatDay(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }); // e.g. "Dec 3"
}

function buildLastNDays(n = 7) {
  const days: { key: string; date: Date; label: string }[] = [];
  const now = new Date();
  // build from oldest -> newest
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    days.push({ key, date: d, label: formatDay(d) });
  }
  return days;
}

function StatCard({
  title,
  value,
  loading,
  onClick,
  chart,
}: {
  title: string;
  value: number | string;
  loading?: boolean;
  onClick?: () => void;
  chart?: ReactNode;
}) {
  const Wrapper: any = onClick ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`bg-white p-5 rounded-lg shadow-sm border text-left w-full ${onClick ? "cursor-pointer hover:shadow-md" : ""}`}
      {...(onClick ? { "aria-pressed": false } : {})}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">{title}</div>
        <div aria-hidden className="text-xs text-gray-400">
          {/* chart area (tiny) */}
          {chart ? <div style={{ width: 100, height: 36 }}>{chart}</div> : null}
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="h-10 w-28 bg-gray-100 rounded animate-pulse" />
        ) : (
          <div className="text-2xl font-semibold text-gray-900">{value}</div>
        )}
      </div>
    </Wrapper>
  );
}

export default function DashboardPanel() {
  const [counts, setCounts] = useState<Counts>({ 
    totalUsers: 0, 
    totalFaculty: 0, 
    totalHod: 0,
    totalAdmins: 0,
    totalStudents: 0,
    todaySessions: 0,
    weekSessions: 0
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const [trendData, setTrendData] = useState<{ date: string; count: number }[]>([]);
  const [trendLoading, setTrendLoading] = useState<boolean>(true);

  const navigate = useNavigate();
  const location = useLocation();

  const fetchCounts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Profile counts - fetch actual data to debug
      const { data: allProfiles, error: allError, count: allCount } = await supabase
        .from("profiles")
        .select("role", { count: "exact" });
      
      console.log("All profiles:", allProfiles);
      console.log("Total count:", allCount);
      
      if (allError) {
        console.error("Error fetching profiles:", allError);
        throw new Error(allError.message);
      }

      // Count by role manually to ensure accuracy
      const totalUsers = allCount ?? 0;
      const totalFaculty = allProfiles?.filter(p => p.role === "FACULTY").length ?? 0;
      const totalHod = allProfiles?.filter(p => p.role === "HOD").length ?? 0;
      const totalAdmins = allProfiles?.filter(p => p.role === "ADMIN").length ?? 0;
      
      console.log("Counts:", { totalUsers, totalFaculty, totalHod, totalAdmins });
      
      // Student count
      const qStudents = supabase.from("students").select("*", { count: "exact", head: true });
      
      // Session counts
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString().split('T')[0];
      
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoISO = weekAgo.toISOString().split('T')[0];
      
      const qTodaySessions = supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .gte("session_date", todayISO);
      
      const qWeekSessions = supabase
        .from("sessions")
        .select("*", { count: "exact", head: true })
        .gte("session_date", weekAgoISO);

      const [resStudents, resToday, resWeek] = 
        await Promise.all([qStudents, qTodaySessions, qWeekSessions]);

      const anyError = (resStudents as any)?.error || 
                       (resToday as any)?.error || (resWeek as any)?.error;
      if (anyError) {
        console.error("Supabase count error:", anyError);
        throw new Error((anyError as any)?.message || "Failed to load counts");
      }

      const totalStudents = (resStudents as any)?.count ?? 0;
      const todaySessions = (resToday as any)?.count ?? 0;
      const weekSessions = (resWeek as any)?.count ?? 0;

      setCounts({ totalUsers, totalFaculty, totalHod, totalAdmins, totalStudents, todaySessions, weekSessions });
      setLastUpdated(Date.now());
    } catch (err: any) {
      console.error("fetchCounts error:", err);
      setError(err?.message || "Failed to load dashboard counts");
    } finally {
      setLoading(false);
    }
  }, []);

  // fetch signups per day for last 7 days
  const fetchTrend = useCallback(async (days = 7) => {
    setTrendLoading(true);
    try {
      const windowDays = buildLastNDays(days);
      const startISO = windowDays[0].date.toISOString(); // earliest date/time

      // fetch created_at values after startISO
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", startISO)
        .order("created_at", { ascending: true });

      if (error) {
        console.warn("Trend fetch error:", error);
        // use empty trend in case of missing table or permission issue
        const empty = windowDays.map((d) => ({ date: d.label, count: 0 }));
        setTrendData(empty);
        return;
      }

      // aggregate counts per YYYY-MM-DD
      const countsMap: Record<string, number> = {};
      (data ?? []).forEach((row: any) => {
        const ts = row.created_at;
        if (!ts) return;
        const key = ts.slice(0, 10); // "YYYY-MM-DD"
        countsMap[key] = (countsMap[key] ?? 0) + 1;
      });

      const aggregated = windowDays.map((d) => {
        const key = d.key;
        return { date: d.label, count: countsMap[key] ?? 0 };
      });

      setTrendData(aggregated);
    } catch (err) {
      console.error("fetchTrend error:", err);
      const empty = buildLastNDays(7).map((d) => ({ date: d.label, count: 0 }));
      setTrendData(empty);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  // initial load and refresh when navigating to dashboard
  useEffect(() => {
    fetchCounts();
    fetchTrend(7);
  }, [fetchCounts, fetchTrend, location.pathname]); // Refresh when pathname changes (e.g., navigating back to dashboard)

  return (
    <section aria-labelledby="dashboard-heading" className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 id="dashboard-heading" className="text-2xl font-bold text-gray-900">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500">Overview of users and recent activity</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchCounts();
              fetchTrend(7);
            }}
            disabled={loading || trendLoading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded bg-white border text-sm hover:bg-gray-50 disabled:opacity-60"
            aria-label="Refresh dashboard counts"
            title="Refresh"
          >
            {loading || trendLoading ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 100 24v-2a10 10 0 110-20z" />
              </svg>
            ) : (
              "Refresh"
            )}
          </button>

          <div className="text-xs text-gray-500" aria-live="polite">
            {lastUpdated ? `Updated ${new Date(lastUpdated).toLocaleTimeString()}` : "Not updated"}
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="bg-red-50 border border-red-100 text-red-700 px-4 py-2 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Users"
          value={counts.totalUsers}
          loading={loading}
          onClick={() => navigate("/admin/users")}
          chart={
            trendLoading ? (
              <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={36}>
                <LineChart data={trendData}>
                  <Line type="monotone" dataKey="count" stroke="#7C3AED" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )
          }
        />

        <StatCard
          title="Total Faculty"
          value={counts.totalFaculty}
          loading={loading}
          onClick={() => navigate("/admin/users?role=FACULTY")}
          chart={
            trendLoading ? (
              <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={36}>
                <LineChart data={trendData}>
                  <Line type="monotone" dataKey="count" stroke="#2563EB" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )
          }
        />

        <StatCard
          title="Total HOD"
          value={counts.totalHod}
          loading={loading}
          onClick={() => navigate("/admin/users?role=HOD")}
          chart={
            trendLoading ? (
              <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height={36}>
                <LineChart data={trendData}>
                  <Line type="monotone" dataKey="count" stroke="#059669" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )
          }
        />

        <StatCard
          title="Total Admins"
          value={counts.totalAdmins}
          loading={loading}
          onClick={() => navigate("/admin/users?role=ADMIN")}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <StatCard
          title="Total Students"
          value={counts.totalStudents}
          loading={loading}
        />

        <StatCard
          title="Sessions Today"
          value={counts.todaySessions}
          loading={loading}
          onClick={() => navigate("/admin/attendance")}
        />

        <StatCard
          title="Sessions This Week"
          value={counts.weekSessions}
          loading={loading}
          onClick={() => navigate("/admin/attendance")}
        />
      </div>
    </section>
  );
}
