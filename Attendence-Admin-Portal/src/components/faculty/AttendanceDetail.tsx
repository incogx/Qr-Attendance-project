import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Download, Loader, AlertTriangle } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface AttendanceMark {
  student_id: string;
  reg_number: string;
  name: string;
  status: "PRESENT" | "ABSENT";
  marked_at: string;
}

interface SessionDetail {
  id: string;
  class_id: string;
  class_no: string;
  session_date: string;
  status: "ACTIVE" | "SUBMITTED" | "APPROVED" | "REJECTED";
  created_at: string;
  marks: AttendanceMark[];
}

export default function AttendanceDetail() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID provided");
      setLoading(false);
      return;
    }

    const fetchSessionDetail = async () => {
      setLoading(true);
      setError(null);

      try {
        // Get session details
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("id, class_id, session_date, status, created_at, classes(class_no)")
          .eq("id", sessionId)
          .single();

        if (sessionError) throw sessionError;
        if (!sessionData) throw new Error("Session not found");

        // Get attendance marks for this session
        const { data: marksData, error: marksError } = await supabase
          .from("attendance_marks")
          .select("student_id, status, marked_at, students(reg_number, name)")
          .eq("session_id", sessionId)
          .order("marked_at");

        if (marksError) throw marksError;

        const mappedMarks = (marksData || []).map((m: any) => ({
          student_id: m.student_id,
          reg_number: m.students?.reg_number || "N/A",
          name: m.students?.name || "Unknown",
          status: m.status,
          marked_at: m.marked_at,
        }));

        setSession({
          id: sessionData.id,
          class_id: sessionData.class_id,
          class_no: sessionData.classes?.class_no || "Unknown",
          session_date: sessionData.session_date,
          status: sessionData.status,
          created_at: sessionData.created_at,
          marks: mappedMarks,
        });
      } catch (err) {
        console.error("Error fetching session:", err);
        setError(err instanceof Error ? err.message : "Failed to load session details");
      } finally {
        setLoading(false);
      }
    };

    fetchSessionDetail();
  }, [sessionId]);

  const exportCSV = () => {
    if (!session) return;

    const headers = ["Reg Number", "Student Name", "Status", "Marked At"];
    const rows = session.marks.map((m) => [
      m.reg_number,
      m.name,
      m.status,
      new Date(m.marked_at).toLocaleString(),
    ]);

    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${session.class_no}_${session.session_date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const presentCount = session?.marks.filter((m) => m.status === "PRESENT").length || 0;
  const absentCount = session?.marks.filter((m) => m.status === "ABSENT").length || 0;
  const totalCount = session?.marks.length || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-50 text-green-700 border-green-200";
      case "REJECTED":
        return "bg-red-50 text-red-700 border-red-200";
      case "SUBMITTED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "ACTIVE":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading session details...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-red-800">Error</h2>
              <p className="text-red-700 mt-1">{error || "Session not found"}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/faculty/attendance")}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Back to Reports
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate("/faculty/attendance")}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Reports
          </button>

          <h1 className="text-3xl font-bold text-slate-900">{session.class_no}</h1>
          <p className="text-slate-500 mt-1">
            {new Date(session.session_date).toLocaleDateString()}
          </p>
        </div>

        <div
          className={`px-4 py-2 rounded-full text-sm font-semibold border ${getStatusColor(
            session.status
          )}`}
        >
          {session.status}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 border shadow-sm">
          <p className="text-sm text-slate-500">Total Students</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{totalCount}</p>
        </div>

        <div className="bg-green-50 rounded-lg p-4 border border-green-200 shadow-sm">
          <p className="text-sm text-green-700">Present</p>
          <p className="text-2xl font-bold text-green-700 mt-2">{presentCount}</p>
        </div>

        <div className="bg-red-50 rounded-lg p-4 border border-red-200 shadow-sm">
          <p className="text-sm text-red-700">Absent</p>
          <p className="text-2xl font-bold text-red-700 mt-2">{absentCount}</p>
        </div>

        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-sm">
          <p className="text-sm text-blue-700">Attendance Rate</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">
            {totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b bg-slate-50">
          <h2 className="text-lg font-semibold text-slate-900">Student Attendance</h2>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-slate-50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Reg Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Student Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700">
                  Marked At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {session.marks.map((mark, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 text-sm text-slate-600">{mark.reg_number}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{mark.name}</td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        mark.status === "PRESENT"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {mark.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(mark.marked_at).toLocaleString()}
                  </td>
                </tr>
              ))}

              {session.marks.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No attendance records found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Session Info */}
      <div className="mt-6 bg-slate-50 rounded-lg p-6 border">
        <h3 className="font-semibold text-slate-900 mb-4">Session Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600">Session ID</p>
            <p className="font-mono text-slate-900 mt-1 break-all">{session.id}</p>
          </div>
          <div>
            <p className="text-slate-600">Created At</p>
            <p className="text-slate-900 mt-1">
              {new Date(session.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
