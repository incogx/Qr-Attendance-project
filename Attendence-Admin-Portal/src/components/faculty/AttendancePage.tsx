// src/components/faculty/AttendancePage.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit,
  Send,
  Eye,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

// Local attendance type for this page (mock only)
type AttendanceReportLocal = {
  id: string;
  classId?: string;
  className?: string;
  date?: string;
  notes?: string;
  students?: { id: string; status?: string }[];
};

/**
 * AttendancePage
 * - Lists the most recent attendance sessions for the faculty's classes
 * - Lets the faculty create a new attendance session
 * - Real database integration with Supabase
 */

export default function AttendancePage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth() as any;

  const [reports, setReports] = useState<AttendanceReportLocal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<{ id: string; class_no: string }[]>([]);
  const [filterClassId, setFilterClassId] = useState<string>("");
  const [filterDate, setFilterDate] = useState<string>("");

  // Fetch faculty's classes and sessions
  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get faculty's classes
        const { data: classData, error: classError } = await supabase
          .from("class_faculty")
          .select("class_id, classes(id, class_no)")
          .eq("faculty_id", user.id);

        if (classError) throw classError;

        const classList = (classData || [])
          .map((item: any) => ({
            id: item.classes?.id || "",
            class_no: item.classes?.class_no || "",
          }))
          .filter((cls) => cls.id);

        setClasses(classList);

        // Get sessions for these classes
        const classIds = classList.map((c) => c.id);
        if (classIds.length === 0) {
          setReports([]);
          setLoading(false);
          return;
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("id, class_id, session_date, status, created_at, classes(class_no)")
          .in("class_id", classIds)
          .eq("created_by", user.id)
          .order("created_at", { ascending: false })
          .limit(10);

        if (sessionError) throw sessionError;

        const mapped: AttendanceReportLocal[] = (sessionData || []).map((s: any) => ({
          id: s.id,
          classId: s.classes?.class_no || s.class_id,
          className: s.classes?.class_no || "Unknown",
          date: s.session_date,
          notes: `Status: ${s.status}`,
          students: [],
        }));

        setReports(mapped);
      } catch (err: any) {
        console.error("Failed to load data:", err);
        setError(err.message || "Failed to load attendance data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authLoading, user]);

  // Derived helpers
  const recent = useMemo(() => {
    let filtered = [...reports];

    // Filter by class if selected
    if (filterClassId) {
      filtered = filtered.filter((r) => r.classId === filterClassId);
    }

    // Filter by date if selected
    if (filterDate) {
      filtered = filtered.filter((r) => r.date?.startsWith(filterDate));
    }

    // Sort descending by date
    return filtered.sort((a, b) =>
      (b.date || "").localeCompare(a.date || "")
    );
  }, [reports, filterClassId, filterDate]);

  const handleOpen = (reportId: string) => {
    navigate(`/faculty/attendance/${reportId}`);
  };

  /**
   * Status badge component with enhanced styling.
   * @param s AttendanceStatus
   * @returns JSX.Element
   */
  // No status badge for mock data

  return (
    <div className="min-h-[70vh] flex flex-col p-4">
      {/* Main content: reports list & actions */}
      <div className="w-full bg-white rounded-xl p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-gray-700" />
            Attendance Sessions
          </h2>

          <button
            onClick={() => navigate("/faculty/create-attendance")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold bg-red-700 hover:bg-red-800 transition-all shadow-md"
          >
            <Send className="w-4 h-4" />
            New Session
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-end gap-3 mb-6 pb-4 border-b">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Class</label>
            <select
              value={filterClassId}
              onChange={(e) => setFilterClassId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-500 transition-all text-sm"
            >
              <option value="">All Classes</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.class_no}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Date</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-300 focus:border-red-500 transition-all text-sm"
            />
          </div>

          {(filterClassId || filterDate) && (
            <button
              onClick={() => {
                setFilterClassId("");
                setFilterDate("");
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm transition-all"
            >
              Clear Filters
            </button>
          )}
        </div>

        {error && (
          <div
            className="mb-6 rounded-lg bg-red-50 border border-red-300 px-4 py-3 text-sm font-medium text-red-800 flex items-center gap-2"
            role="alert"
          >
            <AlertTriangle className="w-5 h-5" />
            **Error:** {error}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-lg text-gray-500">
            <span className="animate-pulse">Loading reports...</span>
          </div>
        ) : recent.length === 0 ? (
          <div className="py-20 text-center text-lg text-gray-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            <p>No attendance reports yet. Create one using the controls above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recent.map((r) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-red-100 transition-all duration-200 shadow-sm hover:shadow-lg"
              >
                {/* Report Details */}
                <div>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-1">
                    <h3 className="text-lg font-bold text-gray-900">
                      {r.className ?? r.classId}
                    </h3>
                    <span className="text-sm text-gray-600 font-medium">
                      {r.date ? new Date(r.date).toLocaleDateString() : 'Unknown Date'}
                    </span>
                    <span className="text-sm text-gray-400">•</span>
                    <span className="text-sm text-gray-600">
                      **{r.students?.length ?? 0}** Students
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500 italic">
                    {r.notes ? `"${r.notes}"` : "No notes recorded."}
                  </p>
                </div>

                {/* Actions and Status */}
                <div className="flex items-center gap-3 mt-3 sm:mt-0 flex-shrink-0">
                  <button
                    onClick={() => handleOpen(r.id)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors text-sm"
                    title="Open report details"
                  >
                    <Eye className="w-4 h-4" /> View
                  </button>

                  <button
                    onClick={() => {
                      // Quick re-open or edit — you may replace with edit modal
                      navigate(`/faculty/attendance/${r.id}/edit`);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors text-sm"
                    title="Edit report"
                  >
                    <Edit className="w-4 h-4" /> Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}