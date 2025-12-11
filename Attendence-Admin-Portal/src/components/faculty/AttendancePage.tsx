// src/components/faculty/AttendancePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Edit,
  Send,
  Eye,
  AlertTriangle,
  ClipboardList,
  Play,
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
 * - Lists the most recent attendance reports for the faculty's classes
 * - Lets the faculty create a new attendance record (quick flow)
 * - Shows a right-side panel with QR generator or details (using your GenerateQRPanel)
 *
 * Assumptions:
 * - API endpoints:
 * GET  /api/attendance?facultyId=...
 * POST /api/attendance   { facultyId, classId, date, students: [{id, status}] }
 * Adjust paths to match your server.
 *
 * - useAuth() returns: { user, profile, loading }
 */

// Define a professional primary color for the system, e.g., a deep indigo or university maroon
const PRIMARY_COLOR = "[#7A0D15]"; // Your existing deep maroon color

export default function AttendancePage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth() as any;

  const [reports, setReports] = useState<AttendanceReportLocal[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // UI state for creating a new attendance
  const [creating, setCreating] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    // Ensure the date format is consistent: YYYY-MM-DD
    return d.toISOString().slice(0, 10);
  });

  // Live session state for QR panel
  const [liveStarted, setLiveStarted] = useState(false);
  const [liveToken, setLiveToken] = useState<string | null>(null);
  const [scanned, setScanned] = useState<string[]>([]);

  // Load real attendance sessions from database
  useEffect(() => {
    if (authLoading) return;
    if (!profile && !user) return;

    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('attendance_sessions')
          .select('*')
          .eq('faculty_id', profile?.id || user?.id)
          .order('started_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        
        const mapped: AttendanceReportLocal[] = (data || []).map((s: any) => ({
          id: s.id,
          classId: s.class_no,
          className: s.class_no,
          date: s.session_date,
          notes: `Status: ${s.status}`,
          students: [],
        }));
        
        setReports(mapped);
      } catch (err: any) {
        console.error('Failed to load sessions:', err);
        setError(err.message || 'Failed to load attendance sessions');
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [authLoading, profile, user]);

  // Derived helpers
  const recent = useMemo(() => {
    // Sort descending by date (assuming report.date is ISO string or comparable)
    return [...reports].sort((a, b) =>
      (b.date || "").localeCompare(a.date || "")
    );
  }, [reports]);

  const handleCreate = async () => {
    if (!profile && !user) {
      return navigate("/login");
    }
    if (!selectedClassId) {
      setError("Please select a class first.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      // Create real attendance session
      const { data, error } = await supabase
        .from('attendance_sessions')
        .insert([{
          class_no: selectedClassId,
          faculty_id: profile?.id || user.id,
          faculty_name: profile?.full_name || user?.email || 'Unknown',
          department: profile?.department || 'N/A',
          session_date: selectedDate,
          status: 'ACTIVE',
        }])
        .select()
        .single();

      if (error) throw error;

      const newReport: AttendanceReportLocal = {
        id: data.id,
        classId: data.class_no,
        className: data.class_no,
        date: data.session_date,
        notes: `Status: ${data.status}`,
        students: [],
      };

      setReports((prev) => [newReport, ...prev]);
      alert('Attendance session created! Go to Generate QR to start taking attendance.');
    } catch (err: any) {
      console.error("Create attendance error:", err);
      setError(err?.message ?? "Unable to create attendance");
    } finally {
      setCreating(false);
    }
  };

  const handleOpen = (reportId: string) => {
    // Navigate to a detail page (implement route if required)
    navigate(`/faculty/attendance/${reportId}`);
  };

  /**
   * Status badge component with enhanced styling.
   * @param s AttendanceStatus
   * @returns JSX.Element
   */
  // No status badge for mock data

  return (
    <div className="min-h-[70vh] flex flex-col lg:flex-row gap-6 p-4">
      {/* Left column: reports list & actions */}
      <div className="w-full lg:w-2/3 bg-white rounded-xl p-6 shadow-xl border border-gray-100">
        <div className="flex items-center justify-between mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-gray-700" />
            Attendance Reports
          </h2>
          {/* Action controls group */}
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-red-300 focus:border-red-500 transition-all"
              aria-label="Attendance Date"
            />

            <select
              value={selectedClassId ?? ""}
              onChange={(e) => setSelectedClassId(e.target.value || null)}
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm bg-white focus:ring-2 focus:ring-red-300 focus:border-red-500 transition-all"
              aria-label="Select Class"
            >
              <option value="" disabled>
                Select class
              </option>
              {/* TODO: replace these with dynamic classes from profile or API */}
              <option value="CSE-2A">CSE - II A</option>
              <option value="CSE-2B">CSE - II B</option>
              <option value="MECH-1A">MECH - I A</option>
            </select>

            <button
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-white font-semibold transition-all duration-200 shadow-md ${
                creating || !selectedClassId
                  ? "bg-gray-400 cursor-not-allowed"
                  : `bg-${PRIMARY_COLOR} hover:bg-[#600c10] active:bg-[#4d090c] hover:shadow-lg`
              }`}
              onClick={handleCreate}
              disabled={creating || !selectedClassId}
              aria-busy={creating}
            >
              <Send className="w-4 h-4" />
              {creating ? "Creating..." : "Create Attendance"}
            </button>
          </div>
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

      {/* Right column: simple mock QR panel */}
      <aside className="w-full lg:w-1/3">
        <div className="sticky top-6 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xl">
            <h4 className="text-xl font-semibold mb-4 border-b pb-3 text-gray-800 flex items-center gap-2">
              <Send className="w-5 h-5 inline text-gray-600" />
              Live Session / QR
            </h4>

            <div className="space-y-3">
              <div className="text-sm text-gray-600">Class</div>
              <div className="text-base font-semibold">{selectedClassId || "Select a class"}</div>
              <div className="text-xs text-gray-500">Date: {selectedDate}</div>

              <div className="flex flex-wrap gap-2 mt-2">
                {!liveStarted ? (
                  <button
                    onClick={() => {
                      setLiveStarted(true);
                      setLiveToken(`session-${Date.now()}`);
                      setScanned([]);
                    }}
                    className="inline-flex items-center gap-2 rounded bg-green-600 text-white px-4 py-2 text-sm hover:bg-green-700"
                  >
                    <Play className="w-4 h-4" /> Start Live Session
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setLiveStarted(false);
                      setLiveToken(null);
                    }}
                    className="inline-flex items-center gap-2 rounded bg-red-600 text-white px-4 py-2 text-sm hover:bg-red-700"
                  >
                    Stop Session
                  </button>
                )}

                <button
                  onClick={() => {
                    if (!liveStarted || !liveToken) return alert("Start session first");
                    const id = `S-${String(scanned.length + 1).padStart(3, "0")}`;
                    setScanned((prev) => [...prev, id]);
                  }}
                  className="inline-flex items-center gap-2 rounded border px-4 py-2 text-sm bg-white"
                  disabled={!liveStarted}
                >
                  Mock Scan
                </button>
              </div>

              <div className="mt-4 rounded border bg-gray-50 p-4 text-center min-h-[140px] flex items-center justify-center">
                {liveStarted && liveToken ? (
                  <div className="space-y-2 text-gray-700 text-sm">
                    <div className="text-xs text-gray-400">QR Token</div>
                    <div className="font-mono text-xs break-all">{liveToken}</div>
                    <div className="text-green-600 font-semibold text-xs">Session Active</div>
                  </div>
                ) : (
                  <div className="text-gray-400 text-sm">Start session to generate QR</div>
                )}
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                  <span>Scanned Students</span>
                  <span className="text-xs text-gray-500">Count: {scanned.length}</span>
                </div>
                <div className="space-y-1 max-h-40 overflow-auto text-sm">
                  {scanned.length === 0 ? (
                    <div className="text-gray-400 text-sm text-center py-2">No students scanned yet.</div>
                  ) : (
                    scanned.map((s) => (
                      <div key={s} className="px-2 py-1 bg-green-50 rounded text-green-700">{s}</div>
                    ))
                  )}
                </div>
                <div className="mt-3 flex gap-2 justify-end">
                  <button
                    onClick={() => setScanned([])}
                    className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
                    disabled={!liveStarted}
                  >
                    Clear
                  </button>
                  <button
                    onClick={() => alert(`Submitted ${scanned.length} attendance records`)}
                    className="px-4 py-1 bg-purple-600 text-white rounded text-sm"
                    disabled={!liveStarted}
                  >
                    Submit ({scanned.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}