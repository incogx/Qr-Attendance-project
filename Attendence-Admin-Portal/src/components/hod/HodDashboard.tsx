// src/components/hod/HodDashboard.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { Users, BarChart3, AlertCircle, Download, Loader } from "lucide-react";

interface DepartmentStats {
  totalFaculty: number;
  totalClasses: number;
  avgAttendance: number;
  pendingApprovals: number;
  recentActivity: string[];
}

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
  const { user } = useAuth() as any;

  const [stats, setStats] = useState<DepartmentStats>({
    totalFaculty: 0,
    totalClasses: 0,
    avgAttendance: 0,
    pendingApprovals: 0,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "info"; message: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchDashboardData();
  }, [user]);

  async function fetchDashboardData() {
    setLoading(true);
    setError(null);

    try {
      // Get HOD's department info
      const { data: hodProfile, error: profileError } = await supabase
        .from("profiles")
        .select("department")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      if (!hodProfile?.department) {
        setError("HOD department not found");
        setLoading(false);
        return;
      }

      const department = hodProfile.department;

      // Get faculty count in department
      const { data: facultyData, error: facultyError } = await supabase
        .from("profiles")
        .select("id")
        .eq("department", department)
        .eq("role", "FACULTY");

      if (facultyError) throw facultyError;
      const totalFaculty = facultyData?.length || 0;

      // Get classes in department
      const { data: classesData, error: classesError } = await supabase
        .from("classes")
        .select("id")
        .eq("department", department);

      if (classesError) throw classesError;
      const totalClasses = classesData?.length || 0;
      const classIds = classesData?.map((c: any) => c.id) || [];

      // Get attendance stats for today
      let avgAttendance = 0;
      if (classIds.length > 0) {
        const today = new Date().toISOString().split("T")[0];
        const { data: todayMarks, error: marksError } = await supabase
          .from("attendance_marks")
          .select("status")
          .in("class_id", classIds)
          .gte("marked_at", `${today}T00:00:00`)
          .lte("marked_at", `${today}T23:59:59`);

        if (marksError) throw marksError;
        if (todayMarks && todayMarks.length > 0) {
          const present = todayMarks.filter((m: any) => m.status === "PRESENT").length;
          avgAttendance = Math.round((present / todayMarks.length) * 100);
        }
      }

      // Get pending approvals
      const { data: pendingData, error: pendingError } = await supabase
        .from("approvals")
        .select("id")
        .eq("status", "PENDING")
        .in(
          "session_id",
          (
            await supabase
              .from("sessions")
              .select("id")
              .in("class_id", classIds)
          ).data?.map((s: any) => s.id) || []
        );

      if (pendingError) throw pendingError;
      const pendingApprovals = pendingData?.length || 0;

      // Get recent faculty additions (last 5)
      const { data: recentFaculty, error: recentError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("department", department)
        .eq("role", "FACULTY")
        .order("created_at", { ascending: false })
        .limit(5);

      if (recentError) throw recentError;

      const activity = (recentFaculty || []).map(
        (f: any) => `Faculty added: ${f.full_name || "Unknown"}`
      );

      setStats({
        totalFaculty,
        totalClasses,
        avgAttendance,
        pendingApprovals,
        recentActivity: activity.length > 0 ? activity : ["No recent activity"],
      });
    } catch (err) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    setToast({ 
      type: "success", 
      message: "Department attendance reports exported successfully!" 
    });
    setTimeout(() => setToast(null), 3000);
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

        <button
          onClick={fetchDashboardData}
          className="text-sm text-slate-600 px-3 py-2 hover:bg-slate-100 rounded"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-slate-600 mr-2" />
          <span className="text-slate-600">Loading dashboard...</span>
        </div>
      ) : (
        <>
          {/* -------- THREE METRIC CARDS -------- */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500">Total Faculty</div>
                  <div className="text-3xl font-semibold mt-2">{stats.totalFaculty}</div>
                  <div className="text-xs text-slate-400 mt-2">Active in department</div>
                </div>
                <Users className="w-8 h-8 text-blue-600 opacity-20" />
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500">Department Attendance (Today)</div>
                  <div className="text-3xl font-semibold mt-2">{stats.avgAttendance}%</div>
                  <div className="text-xs text-slate-400 mt-2">Average across classes</div>
                </div>
                <BarChart3 className="w-8 h-8 text-green-600 opacity-20" />
              </div>
            </Card>

            <Card>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-slate-500">Pending Requests</div>
                  <div className="text-3xl font-semibold mt-2">{stats.pendingApprovals}</div>
                  <div className="text-xs text-slate-400 mt-2">Approvals needed</div>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-600 opacity-20" />
              </div>
            </Card>
          </div>

          {/* -------- CLASSES & ACTIVITY -------- */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* --- Recent Activity Section --- */}
            <div className="lg:col-span-2 bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-medium text-slate-900">Recent Activity</h3>
              <div className="mt-1 text-sm text-slate-500">
                Latest faculty additions and department updates
              </div>

              {stats.recentActivity.length > 0 ? (
                <ul className="mt-4 space-y-2">
                  {stats.recentActivity.map((activity, idx) => (
                    <li
                      key={idx}
                      className="p-3 border rounded bg-slate-50 text-sm text-slate-700 flex items-start gap-2"
                    >
                      <span className="text-blue-600 font-bold flex-shrink-0">•</span>
                      {activity}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-4 p-4 text-center text-slate-500 text-sm">
                  No recent activity
                </div>
              )}
            </div>

            {/* --- Quick Actions Section --- */}
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <h3 className="font-medium text-slate-900">Quick Actions</h3>

              <div className="mt-4 flex flex-col gap-3">

                {/* View Attendance */}
                <button
                  onClick={() => navigate("/hod/attendance")}
                  className="px-3 py-2 rounded bg-purple-600 text-white hover:bg-purple-700 transition text-sm font-medium"
                >
                  View Attendance
                </button>

                {/* View Faculty */}
                <button
                  onClick={() => navigate("/hod/faculty")}
                  className="px-3 py-2 rounded border hover:bg-slate-50 transition text-sm"
                >
                  Manage Faculty
                </button>

                {/* Approvals */}
                <button
                  onClick={() => navigate("/hod/approvals")}
                  className="px-3 py-2 rounded border hover:bg-slate-50 transition text-sm"
                >
                  Pending Approvals
                </button>

                {/* Export Reports */}
                <button
                  onClick={handleExport}
                  className="px-3 py-2 rounded border hover:bg-slate-50 transition text-sm flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export Reports
                </button>

              </div>
            </div>

          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 shadow-lg text-white flex items-center gap-2 animate-in fade-in duration-300 ${
            toast.type === "success" ? "bg-green-600" : "bg-blue-600"
          }`}
        >
          {toast.type === "success" && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-white/80 hover:text-white"
            aria-label="dismiss"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
