import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Download, BarChart3, Loader } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

/**
 * AttendanceReports
 * - Displays attendance history for faculty's classes
 * - Shows sessions and attendance marks from database
 * - Allows viewing detailed attendance and exporting
 */

interface Session {
  id: string;
  class_id: string;
  class_no?: string;
  session_date: string;
  status: "ACTIVE" | "SUBMITTED" | "APPROVED" | "REJECTED";
  present_count: number;
  absent_count: number;
  total_count: number;
}

interface DetailedSession extends Session {
  marks: Array<{
    student_id: string;
    reg_number: string;
    name: string;
    status: "PRESENT" | "ABSENT";
    marked_at: string;
  }>;
}

export default function AttendanceReports() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [detailedSession, setDetailedSession] = useState<DetailedSession | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch sessions for faculty's classes
  useEffect(() => {
    if (!user) return;

    const fetchSessions = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1. Get faculty's classes
        const { data: classData, error: classError } = await supabase
          .from("class_faculty")
          .select("class_id, classes(id, class_no)")
          .eq("faculty_id", user.id);

        if (classError) throw classError;

        const classIds = (classData || []).map((c: any) => c.class_id);
        if (classIds.length === 0) {
          setSessions([]);
          setLoading(false);
          return;
        }

        // 2. Get sessions for those classes
        const { data: sessionData, error: sessionError } = await supabase
          .from("sessions")
          .select("id, class_id, session_date, status, created_at")
          .in("class_id", classIds)
          .order("created_at", { ascending: false })
          .limit(50);

        if (sessionError) throw sessionError;

        // 3. For each session, count attendance marks
        const sessionsWithCounts: Session[] = await Promise.all(
          (sessionData || []).map(async (session: any) => {
            const { data: marks, error: marksError } = await supabase
              .from("attendance_marks")
              .select("status")
              .eq("session_id", session.id);

            if (marksError) console.error("Error fetching marks:", marksError);

            const markList = marks || [];
            const present_count = markList.filter((m: any) => m.status === "PRESENT").length;
            const absent_count = markList.filter((m: any) => m.status === "ABSENT").length;

            // Get class_no from classData
            const classInfo = (classData || []).find((c: any) => c.class_id === session.class_id);

            return {
              id: session.id,
              class_id: session.class_id,
              class_no: (classInfo as any)?.classes?.class_no || "Unknown",
              session_date: session.session_date,
              status: session.status,
              present_count,
              absent_count,
              total_count: present_count + absent_count,
            };
          })
        );

        setSessions(sessionsWithCounts);
      } catch (err) {
        console.error("Error fetching sessions:", err);
        setError("Failed to load attendance reports");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user]);

  // Fetch detailed marks for a session
  const fetchSessionDetails = async (sessionId: string) => {
    setLoadingDetails(true);

    try {
      const session = sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const { data: marks, error: marksError } = await supabase
        .from("attendance_marks")
        .select("student_id, status, marked_at, students(reg_number, name)")
        .eq("session_id", sessionId)
        .order("marked_at");

      if (marksError) throw marksError;

      const mappedMarks = (marks || []).map((m: any) => ({
        student_id: m.student_id,
        reg_number: m.students?.reg_number || "N/A",
        name: m.students?.name || "Unknown",
        status: m.status,
        marked_at: m.marked_at,
      }));

      setDetailedSession({
        ...session,
        marks: mappedMarks,
      });
    } catch (err) {
      console.error("Error fetching session details:", err);
      setError("Failed to load session details");
    } finally {
      setLoadingDetails(false);
    }
  };

  // Export session to CSV
  const exportSessionCSV = (session: DetailedSession) => {
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

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Attendance Reports</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage attendance history</p>
        </div>

        <button
          onClick={() => navigate("/faculty/create-attendance")}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          + New Attendance
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-blue-600 mr-2" />
          <span className="text-slate-600">Loading reports...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No attendance reports yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white border rounded-lg shadow-sm overflow-hidden">
              {/* Session Header */}
              <button
                onClick={() => {
                  setExpandedSession(expandedSession === session.id ? null : session.id);
                  if (expandedSession !== session.id) {
                    fetchSessionDetails(session.id);
                  }
                }}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-4 flex-1">
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition ${
                      expandedSession === session.id ? "rotate-180" : ""
                    }`}
                  />

                  <div className="text-left">
                    <div className="font-medium text-slate-900">{session.class_no}</div>
                    <div className="text-xs text-slate-500">
                      {new Date(session.session_date).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      <span className="text-green-600">{session.present_count}</span> /{" "}
                      <span className="text-slate-600">{session.total_count}</span>
                    </div>
                    <div className="text-xs text-slate-500">Present</div>
                  </div>

                  <div
                    className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      session.status
                    )}`}
                  >
                    {session.status}
                  </div>
                </div>
              </button>

              {/* Expanded Details */}
              {expandedSession === session.id && (
                <div className="border-t bg-slate-50 p-6">
                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                      <span className="text-slate-600">Loading details...</span>
                    </div>
                  ) : detailedSession ? (
                    <>
                      <div className="mb-4 overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 font-medium text-slate-700">
                                Reg Number
                              </th>
                              <th className="text-left py-2 px-3 font-medium text-slate-700">
                                Student Name
                              </th>
                              <th className="text-left py-2 px-3 font-medium text-slate-700">Status</th>
                              <th className="text-left py-2 px-3 font-medium text-slate-700">
                                Marked At
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {detailedSession.marks.map((mark, idx) => (
                              <tr key={idx} className="hover:bg-white transition">
                                <td className="py-2 px-3 text-slate-600">{mark.reg_number}</td>
                                <td className="py-2 px-3 text-slate-900 font-medium">{mark.name}</td>
                                <td className="py-2 px-3">
                                  <span
                                    className={`px-2 py-1 rounded text-xs font-medium ${
                                      mark.status === "PRESENT"
                                        ? "bg-green-100 text-green-800"
                                        : "bg-red-100 text-red-800"
                                    }`}
                                  >
                                    {mark.status}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-slate-500">
                                  {new Date(mark.marked_at).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => exportSessionCSV(detailedSession)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Export CSV
                        </button>
                      </div>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
