// src/components/faculty/FacultyDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { QrCode } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";

/**
 * FacultyDashboard.tsx
 *
 * Fetches faculty's classes and attendance data from the new database schema.
 * Uses real Supabase queries for:
 * - classes (via class_faculty junction table)
 * - attendance marks (via sessions)
 * - 7-day history for each class
 *
 * TailwindCSS classes are used to match your admin styles.
 */

/* ----------------------------- Types ------------------------------ */
type ClassItem = {
  id: string;
  class_no: string;
  department?: string;
};

type AttendanceSnapshot = {
  classId: string;
  className: string;
  present: number;
  absent: number;
  total: number;
  // last 7 days summary: array of { date, present, absent }
  history: { date: string; present: number; absent: number }[];
};

/* ----------------------- REAL DATABASE API ---------------------- */

/** Get faculty's assigned classes from class_faculty table */
async function fetchFacultyClasses(facultyId: string): Promise<ClassItem[]> {
  try {
    const { data, error } = await supabase
      .from("class_faculty")
      .select("class_id, classes(id, class_no, department)")
      .eq("faculty_id", facultyId);

    if (error) {
      console.error("Error fetching classes:", error);
      return [];
    }

    return (data || [])
      .map((item: any) => ({
        id: item.classes?.id || "",
        class_no: item.classes?.class_no || "",
        department: item.classes?.department,
      }))
      .filter((cls) => cls.id);
  } catch (err) {
    console.error("Error in fetchFacultyClasses:", err);
    return [];
  }
}

/** Get attendance snapshot for classes (today's data + last 7 days) */
async function fetchAttendanceSnapshot(classes: ClassItem[]): Promise<AttendanceSnapshot[]> {
  if (!classes.length) return [];

  try {
    const classIds = classes.map((c) => c.id);

    // Get today's attendance marks
    const today = new Date().toISOString().split("T")[0];
    const { data: todayData, error: todayError } = await supabase
      .from("attendance_marks")
      .select("class_id, status, student_id")
      .in("class_id", classIds)
      .eq("session_id", (await supabase.from("sessions").select("id").eq("session_date", today)).data?.[0]?.id || "");

    if (todayError) console.error("Error fetching today's attendance:", todayError);

    // Get 7-day history
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const { data: historyData, error: historyError } = await supabase
      .from("attendance_marks")
      .select("class_id, status, marked_at")
      .in("class_id", classIds)
      .gte("marked_at", sevenDaysAgo);

    if (historyError) console.error("Error fetching history:", historyError);

    // Get total students per class
    const { data: studentData, error: studentError } = await supabase
      .from("students")
      .select("class_id, id")
      .in("class_id", classIds);

    if (studentError) console.error("Error fetching students:", studentError);

    // Process data
    return classes.map((cls) => {
      const classStudents = (studentData || []).filter((s: any) => s.class_id === cls.id);
      const total = classStudents.length;

      const todayAttendance = (todayData || []).filter((a: any) => a.class_id === cls.id);
      const present = todayAttendance.filter((a: any) => a.status === "PRESENT").length;
      const absent = todayAttendance.filter((a: any) => a.status === "ABSENT").length;

      // Build 7-day history
      const history: { date: string; present: number; absent: number }[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const dayRecords = (historyData || []).filter(
          (h: any) => h.class_id === cls.id && h.marked_at.startsWith(date)
        );
        const dayPresent = dayRecords.filter((r: any) => r.status === "PRESENT").length;
        const dayAbsent = dayRecords.filter((r: any) => r.status === "ABSENT").length;
        history.push({ date, present: dayPresent, absent: dayAbsent });
      }

      return {
        classId: cls.id,
        className: cls.class_no,
        present,
        absent,
        total,
        history,
      };
    });
  } catch (err) {
    console.error("Error in fetchAttendanceSnapshot:", err);
    return [];
  }
}

/* Poll attendance snapshot (real data refresh) */
async function fetchAttendanceSnapshotPolled(classes: ClassItem[]): Promise<AttendanceSnapshot[]> {
  return fetchAttendanceSnapshot(classes);
}


/* ------------------------ Small Components ------------------------ */

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-white rounded-lg p-4 shadow-sm border ${className}`}>{children}</div>;
}

/* Tiny inline sparkline for last 7 days (present counts) */
function Sparkline({ data }: { data: number[] }) {
  const width = 80;
  const height = 30;
  const max = Math.max(...data, 1);
  const points = data
    .map((d, i) => `${(i / (data.length - 1)) * width},${height - (d / max) * height}`)
    .join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline fill="none" stroke="#7c3aed" strokeWidth={2} points={points} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------------------- MAIN FACULTY DASHBOARD -------------------- */

export default function FacultyDashboard() {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState<ClassItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveQrToken, setLiveQrToken] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState(5000); // ms

  // on mount: load faculty's classes + attendance
  useEffect(() => {
    let mounted = true;
    if (!user) return;

    setLoading(true);
    (async () => {
      const classes = await fetchFacultyClasses(user.id);
      if (!mounted) return;
      setTimetable(classes);

      const snap = await fetchAttendanceSnapshot(classes);
      if (!mounted) return;
      setAttendance(snap);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [user]);

  // poll attendance snapshot every pollInterval ms to simulate realtime
  useEffect(() => {
    if (!timetable.length) return;
    let alive = true;
    const interval = setInterval(async () => {
      if (!alive) return;
      const snap = await fetchAttendanceSnapshotPolled(timetable);
      setAttendance(snap);
    }, pollInterval);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [timetable, pollInterval]);

  // generate a rotating live token (simulate live QR rotation) every 15s when active
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (liveQrToken) {
      // rotate token each 15s
      timer = setInterval(() => {
        setLiveQrToken(uuidv4());
      }, 15000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [liveQrToken]);

  // quick summary totals
  const totals = useMemo(() => {
    const totalStudents = attendance.reduce((s, a) => s + a.total, 0);
    const totalPresent = attendance.reduce((s, a) => s + a.present, 0);
    const totalAbsent = attendance.reduce((s, a) => s + a.absent, 0);
    return { totalStudents, totalPresent, totalAbsent };
  }, [attendance]);

  /* ---------------- UI actions ---------------- */

  function startLiveQrForClass(classId: string) {
    // set token & copy or show QR modal (UI for QR not implemented here - produce token)
    const token = `${classId}::${uuidv4()}`;
    setLiveQrToken(token);
    // In real app emit token to DB so scanners can validate
  }

  function exportClassCSV(classId: string) {
    const snap = attendance.find((a) => a.classId === classId);
    if (!snap) return;
    const rows = [["date", "present", "absent"], ...snap.history.map((h) => [h.date, String(h.present), String(h.absent)])];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_${classId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ---------------- Render ---------------- */
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Faculty Dashboard</h1>
          <div className="text-sm text-slate-500 mt-1">Your classes and real-time attendance overview</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">
            Polling every <strong>{Math.round(pollInterval / 1000)}</strong>s
          </div>
          <select
            value={pollInterval}
            onChange={(e) => setPollInterval(Number(e.target.value))}
            className="px-3 py-1 rounded border"
          >
            <option value={3000}>3s</option>
            <option value={5000}>5s</option>
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-sm text-slate-500">Total students (all classes)</div>
          <div className="text-2xl font-semibold mt-2">{totals.totalStudents}</div>
          <div className="text-sm text-slate-400 mt-2">
            Present <span className="font-medium text-green-600">{totals.totalPresent}</span> • Absent{" "}
            <span className="font-medium text-red-600">{totals.totalAbsent}</span>
          </div>
        </Card>

        <Card>
          <div className="text-sm text-slate-500">Total Classes</div>
          <div className="text-2xl font-semibold mt-2">{timetable.length}</div>
          <div className="text-sm text-slate-400 mt-2">Classes assigned to you</div>
        </Card>

        <Card>
          <div className="text-sm text-slate-500">Attendance Rate</div>
          <div className="text-2xl font-semibold mt-2">
            {totals.totalStudents > 0 ? ((totals.totalPresent / totals.totalStudents) * 100).toFixed(1) : 0}%
          </div>
          <div className="text-sm text-slate-400 mt-2">Average across all classes</div>
        </Card>
      </div>

      {/* Main grid: Classes (left) + Attendance table (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Classes List */}
        <div className="lg:col-span-1">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-lg font-medium">Your Classes</div>
              <div className="text-sm text-slate-400">Live</div>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-6 text-center text-sm text-slate-500">Loading classes…</div>
              ) : timetable.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">No classes assigned</div>
              ) : (
                timetable.map((cls) => {
                  const classAttendance = attendance.find((a) => a.classId === cls.id);
                  return (
                    <div
                      key={cls.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg border border-transparent hover:border-slate-200 transition"
                    >
                      <div>
                        <div className="text-sm font-medium">{cls.class_no}</div>
                        <div className="text-xs text-slate-500 mt-1">{cls.department || "No dept"}</div>
                        {classAttendance && (
                          <div className="mt-2 text-xs">
                            <span className="text-green-600 font-medium">{classAttendance.present}</span> present •{" "}
                            <span className="text-red-600 font-medium">{classAttendance.absent}</span> absent
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => startLiveQrForClass(cls.id)}
                          className="px-3 py-1 rounded-md bg-purple-600 text-white text-sm flex items-center gap-2"
                        >
                          <QrCode className="w-4 h-4" /> QR
                        </button>

                        <button
                          onClick={() => exportClassCSV(cls.id)}
                          className="px-2 py-1 rounded-md border text-sm text-slate-600"
                        >
                          Export
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>

        {/* Attendance Table */}
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-lg font-medium">Class-wise Attendance</div>
              <div className="text-sm text-slate-500">Real-time data</div>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-xs text-slate-500">
                    <th className="py-2 px-3">Class</th>
                    <th className="py-2 px-3">Present</th>
                    <th className="py-2 px-3">Absent</th>
                    <th className="py-2 px-3">Total</th>
                    <th className="py-2 px-3">Last 7 days</th>
                    <th className="py-2 px-3">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {attendance.map((row) => {
                    const cls = timetable.find((c) => c.id === row.classId);
                    const historyPresent = row.history.map((h) => h.present);
                    return (
                      <tr key={row.classId} className="odd:bg-white even:bg-slate-50">
                        <td className="py-3 px-3">
                          <div className="font-medium">{cls?.class_no ?? row.classId}</div>
                          <div className="text-xs text-slate-500">{row.className}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-green-600 font-semibold">{row.present}</div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="text-red-600 font-semibold">{row.absent}</div>
                        </td>

                        <td className="py-3 px-3">{row.total}</td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-3">
                            <Sparkline data={historyPresent} />
                            <div className="text-xs text-slate-500">7d</div>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                // navigate to class attendance page (implement route separately)
                                window.location.href = `/faculty/attendance?class=${row.classId}`;
                              }}
                              className="px-3 py-1 rounded-md bg-white border text-sm text-slate-700"
                            >
                              View
                            </button>

                            <button
                              onClick={() => exportClassCSV(row.classId)}
                              className="px-3 py-1 rounded-md bg-purple-600 text-white text-sm"
                            >
                              Export CSV
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {attendance.length === 0 && (
                    <tr>
                      <td className="py-6 px-3 text-center text-slate-500" colSpan={6}>
                        No attendance data yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
