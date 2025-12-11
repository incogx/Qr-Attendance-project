// src/components/faculty/FacultyDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { QrCode } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

/**
 * FacultyDashboard.tsx
 *
 * - Single-file component with small internal helper components and a mocked "real-time" data source.
 * - Replace mocked API functions (fetchTodayTimetable(), fetchAttendanceSnapshot()) with real API / supabase calls.
 *
 * TailwindCSS classes are used to match your admin styles.
 */

/* ----------------------------- Types ------------------------------ */
type ClassItem = {
  id: string;
  courseCode: string;
  courseTitle: string;
  start: string; // ISO time or HH:MM
  end: string;
  room?: string;
};

type AttendanceSnapshot = {
  classId: string;
  present: number;
  absent: number;
  total: number;
  // last 7 days summary: array of { date, present, absent }
  history: { date: string; present: number; absent: number }[];
};

/* ------------------------- MOCKED DATA / API ---------------------- */
/**
 * NOTE:
 * Replace these mocks with real API calls. Keep function signatures the same.
 */

function mockTodayTimetable(): ClassItem[] {
  // Example timetable - scheduled in local time strings (24h)
  const todayBase = new Date();
  return [
    {
      id: "c1",
      courseCode: "CS201",
      courseTitle: "Data Structures",
      start: "09:00",
      end: "09:50",
      room: "Lab 3",
    },
    {
      id: "c2",
      courseCode: "CS301",
      courseTitle: "Operating Systems",
      start: "10:30",
      end: "11:20",
      room: "Room 102",
    },
    {
      id: "c3",
      courseCode: "CS401",
      courseTitle: "AI & Robotics",
      start: "13:00",
      end: "14:00",
      room: "Room 204",
    },
  ];
}

/** Create a plausible attendance snapshot for each class (mock) */
function mockAttendanceSnapshot(classes: ClassItem[]): AttendanceSnapshot[] {
  return classes.map((c) => {
    // random totals but deterministic-ish
    const seed = c.id.charCodeAt(1) + c.id.length;
    const total = 30 + (seed % 10);
    const present = Math.floor(total * (0.7 + ((seed % 5) * 0.05)));
    const absent = total - present;
    const history = Array.from({ length: 7 }).map((_, i) => {
      const dayPresent = Math.max(0, present - (i % 3));
      const dayAbsent = Math.max(0, total - dayPresent);
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      return { date, present: dayPresent, absent: dayAbsent };
    });
    return { classId: c.id, present, absent, total, history };
  });
}

/* Simulated API: returns today's timetable */
async function fetchTodayTimetable(): Promise<ClassItem[]> {
  // simulate network latency
  await new Promise((r) => setTimeout(r, 200));
  return mockTodayTimetable();
}

/* Simulated API: returns attendance snapshot (polling) */
async function fetchAttendanceSnapshot(classes: ClassItem[]): Promise<AttendanceSnapshot[]> {
  await new Promise((r) => setTimeout(r, 200));
  // occasionally vary present/absent to simulate live changes
  const base = mockAttendanceSnapshot(classes);
  // small random fluctuation
  return base.map((s) => {
    const rnd = Math.random() > 0.6 ? -1 : Math.random() > 0.6 ? 1 : 0;
    const present = Math.max(0, Math.min(s.total, s.present + rnd));
    const absent = s.total - present;
    const history = s.history.slice();
    // roll date - update today's history row
    const today = new Date().toISOString().slice(0, 10);
    history[0] = { date: today, present, absent };
    return { ...s, present, absent, history };
  });
}

/* -------------------------- Utility fns --------------------------- */
function nowHHMM(): string {
  const n = new Date();
  const hh = n.getHours().toString().padStart(2, "0");
  const mm = n.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

function isTimeBetween(time: string, start: string, end: string) {
  // time in "HH:MM"
  const toMinutes = (t: string) => {
    const [h, m] = t.split(":").map((s) => parseInt(s, 10));
    return h * 60 + m;
  };
  const t = toMinutes(time);
  return toMinutes(start) <= t && t < toMinutes(end);
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
  const [timetable, setTimetable] = useState<ClassItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [liveQrToken, setLiveQrToken] = useState<string | null>(null);
  const [pollInterval, setPollInterval] = useState(5000); // ms

  // on mount: load timetable + attendance
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    (async () => {
      const tt = await fetchTodayTimetable();
      if (!mounted) return;
      setTimetable(tt);
      const snap = await fetchAttendanceSnapshot(tt);
      if (!mounted) return;
      setAttendance(snap);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // poll attendance snapshot every pollInterval ms to simulate realtime
  useEffect(() => {
    if (!timetable.length) return;
    let alive = true;
    const interval = setInterval(async () => {
      if (!alive) return;
      const snap = await fetchAttendanceSnapshot(timetable);
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

  const now = nowHHMM();

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

  function stopLiveQr() {
    setLiveQrToken(null);
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
          <div className="text-sm text-slate-500 mt-1">Today's timetable and real-time attendance overview</div>
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
          <div className="text-sm text-slate-500">Current Time</div>
          <div className="text-2xl font-semibold mt-2">{now}</div>
          <div className="text-sm text-slate-400 mt-2">Auto-detects the ongoing class in the timetable</div>
        </Card>
      </div>

      {/* Main grid: Timetable (left) + Attendance table (right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Timetable */}
        <div className="lg:col-span-1">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-lg font-medium">Today's Timetable</div>
              <div className="text-sm text-slate-400">Live</div>
            </div>

            <div className="mt-4 space-y-3">
              {loading ? (
                <div className="py-6 text-center text-sm text-slate-500">Loading timetable…</div>
              ) : timetable.length === 0 ? (
                <div className="py-6 text-center text-sm text-slate-500">No classes today</div>
              ) : (
                timetable.map((cls) => {
                  const ongoing = isTimeBetween(now, cls.start, cls.end);
                  const upcoming = cls.start > now;
                  return (
                    <div
                      key={cls.id}
                      className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${
                        ongoing ? "border-green-200 bg-green-50" : "border-transparent"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {cls.courseCode} • {cls.courseTitle}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {cls.start} - {cls.end} • {cls.room}
                        </div>
                        <div className="mt-2 text-xs">
                          {ongoing ? <span className="text-green-600 font-medium">Ongoing</span> : upcoming ? <span className="text-slate-500">Upcoming</span> : <span className="text-slate-400">Completed</span>}
                        </div>
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
              <div className="text-sm text-slate-500">Updated in simulated realtime</div>
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
                          <div className="font-medium">{cls?.courseCode ?? row.classId}</div>
                          <div className="text-xs text-slate-500">{cls?.courseTitle}</div>
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
