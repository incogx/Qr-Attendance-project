// src/components/faculty/GenerateQRPanel.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode"; // npm i qrcode
import { v4 as uuidv4 } from "uuid";
import { Download, StopCircle, PlayCircle } from "lucide-react";

/**
 * GenerateQRPanel.tsx
 *
 * Teacher workflow:
 * 1. Component auto-loads today's timetable and auto-selects the ongoing class (if any).
 * 2. Teacher starts a Live Session: component creates a session token, writes it to backend (live_qr_sessions).
 * 3. Students scan the QR and the scanner posts { studentId, classId, sessionToken } to backend -> creates scan record.
 * 4. Component polls backend for scan records and displays them below the QR.
 * 5. Faculty verifies (checkbox) each scanned student and then clicks "Submit Attendance" to finalize attendance (backend writes final attendance).
 *
 * Replace mock* functions with your real API / Supabase calls.
 */

/* ---------------------------- Types ---------------------------- */
type ClassItem = { id: string; courseCode: string; courseTitle: string; start: string; end: string; room?: string };
type ScanRecord = { id: string; studentId: string; name: string; roll: string; scannedAt: string; verified?: boolean };
type AttendanceFinalizePayload = { classId: string; date: string; presentStudentIds: string[] };

/* ------------------------ CONFIG / CONSTANTS --------------------- */
const TOKEN_ROTATION_MS = 1500; // rotate token every 1.5s
const POLL_SCANS_MS = 4000; // poll scans every 4s

/* ------------------------ MOCKED API (REPLACE) ------------------- */
/**
 * NOTE: Replace these mock implementations with your real endpoints.
 * Example Supabase patterns are included in comments for reference.
 */

async function mockFetchTodayTimetable(): Promise<ClassItem[]> {
  await new Promise((r) => setTimeout(r, 150));
  return [
    { id: "c1", courseCode: "CS201", courseTitle: "Data Structures", start: "09:00", end: "09:50", room: "Lab 3" },
    { id: "c2", courseCode: "CS301", courseTitle: "Operating Systems", start: "10:30", end: "11:20", room: "Room 102" },
    { id: "c3", courseCode: "CS401", courseTitle: "AI & Robotics", start: "13:00", end: "14:00", room: "Room 204" },
  ];
}

let MOCK_SESSION_DB: { [sessionId: string]: { token: string; classId: string; active: boolean } } = {};
let MOCK_SCANS_DB: { [sessionId: string]: ScanRecord[] } = {};

/** Create session on backend (persist session token + classId + expiresAt) */
async function mockCreateLiveSession(classId: string, token: string) {
  await new Promise((r) => setTimeout(r, 120));
  const sessionId = uuidv4();
  MOCK_SESSION_DB[sessionId] = { token, classId, active: true };
  MOCK_SCANS_DB[sessionId] = [];
  return { sessionId, token };
}

/** Rotate token for an existing session (backend should update token for sessionId) */
async function mockRotateSessionToken(sessionId: string, newToken: string) {
  await new Promise((r) => setTimeout(r, 80));
  if (MOCK_SESSION_DB[sessionId]) {
    MOCK_SESSION_DB[sessionId].token = newToken;
    // Return updated token
    return { sessionId, token: newToken };
  }
  throw new Error("Session not found");
}

/** Stop session */
async function mockStopSession(sessionId: string) {
  await new Promise((r) => setTimeout(r, 80));
  if (MOCK_SESSION_DB[sessionId]) {
    MOCK_SESSION_DB[sessionId].active = false;
    return true;
  }
  return false;
}

/** Poll scan records for session */
async function mockFetchScans(sessionId: string): Promise<ScanRecord[]> {
  await new Promise((r) => setTimeout(r, 80));
  const arr = MOCK_SCANS_DB[sessionId] ?? [];
  return arr.slice().sort((a, b) => a.scannedAt.localeCompare(b.scannedAt));
}

/** Finalize attendance: mark present in attendance table */
async function mockFinalizeAttendance(payload: AttendanceFinalizePayload) {
  await new Promise((r) => setTimeout(r, 150));
  // In a real backend you'd insert rows into attendance table for each student
  return { ok: true };
}

/** Helper: simulate a student scanning (only for mock/demo) */
export async function mockStudentScan(sessionId: string, student: { id: string; name: string; roll: string }) {
  await new Promise((r) => setTimeout(r, 100));
  if (!MOCK_SCANS_DB[sessionId]) MOCK_SCANS_DB[sessionId] = [];
  MOCK_SCANS_DB[sessionId].push({
    id: uuidv4(),
    studentId: student.id,
    name: student.name,
    roll: student.roll,
    scannedAt: new Date().toISOString(),
    verified: false,
  });
}

/* ------------------------ Helper Utilities ----------------------- */
function nowHHMM(): string {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
function isTimeBetween(time: string, start: string, end: string) {
  const toM = (t: string) => {
    const [h, m] = t.split(":").map((s) => parseInt(s, 10));
    return h * 60 + m;
  };
  const t = toM(time);
  return toM(start) <= t && t < toM(end);
}

/* ------------------------ QR IMAGE HELPER ------------------------ */
async function generateDataUrlFromText(text: string) {
  return await QRCode.toDataURL(text, { margin: 1, width: 360 });
}

/* ------------------------ MAIN COMPONENT ------------------------- */

export default function GenerateQRPanel() {
  const [timetable, setTimetable] = useState<ClassItem[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [polling, setPolling] = useState(false);
  const pollRef = useRef<number | null>(null);
  const rotationRef = useRef<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lastPolledAt, setLastPolledAt] = useState<string | null>(null);

  // load today timetable and auto-select ongoing class if any
  useEffect(() => {
    (async () => {
      const tt = await mockFetchTodayTimetable();
      setTimetable(tt);

      // auto-select ongoing class
      const now = nowHHMM();
      const ongoing = tt.find((c) => isTimeBetween(now, c.start, c.end));
      if (ongoing) setSelectedClass(ongoing);
      else if (tt.length > 0) setSelectedClass(tt[0]);
    })();
  }, []);

  // generate QR image when token changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) {
        setQrDataUrl(null);
        return;
      }
      try {
        const url = await generateDataUrlFromText(token);
        if (mounted) setQrDataUrl(url);
      } catch (err) {
        console.error("QR gen failed", err);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [token]);

  // polling for scans while session active
  useEffect(() => {
    if (!sessionId) {
      setPolling(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    setPolling(true);
    // initial fetch
    (async () => {
      const s = await mockFetchScans(sessionId);
      setScans(s);
      setLastPolledAt(new Date().toISOString());
    })();

    pollRef.current = window.setInterval(async () => {
      const s = await mockFetchScans(sessionId);
      setScans(s);
      setLastPolledAt(new Date().toISOString());
    }, POLL_SCANS_MS);

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [sessionId]);

  // rotate token when active session & token exists
  useEffect(() => {
    if (!sessionId || !token) return;
    rotationRef.current = window.setInterval(async () => {
      if (!selectedClass || !sessionId) return;

      const newToken = `${selectedClass.id}::${uuidv4()}`;

    try {
    await mockRotateSessionToken(sessionId, newToken);
    setToken(newToken); // triggers QR re-render instantly
  } catch (err) {
    console.error("Token rotation failed", err);
  }
}, TOKEN_ROTATION_MS);


    return () => {
      if (rotationRef.current) {
        clearInterval(rotationRef.current);
        rotationRef.current = null;
      }
    };
  }, [sessionId, token, selectedClass]);

  /* ------------------------ ACTIONS ----------------------------- */

  async function startSession() {
    if (!selectedClass) return alert("Select a class first.");
    const initialToken = `${selectedClass.id}::${uuidv4()}`;
    // create session in backend
    const { sessionId: sid } = await mockCreateLiveSession(selectedClass.id, initialToken);
    setSessionId(sid);
    setToken(initialToken);

    // OPTIONAL: In a real app: write sessionId & token to DB with expiresAt
    // supabase example:
    // const { data, error } = await supabase.from('live_qr_sessions').insert({ class_id: selectedClass.id, token: initialToken, active: true }).select().single();
    // setSessionId(data.id); setToken(data.token);
  }

  async function stopSession() {
    if (!sessionId) return;
    await mockStopSession(sessionId);
    setSessionId(null);
    setToken(null);
    setQrDataUrl(null);
    setScans([]);
  }

  function toggleVerify(scanId: string) {
    setScans((prev) => prev.map((s) => (s.id === scanId ? { ...s, verified: !s.verified } : s)));
  }

  async function submitAttendance() {
    if (!selectedClass) return alert("No class selected.");
    setSubmitting(true);
    try {
      const presentStudentIds = scans.filter((s) => s.verified).map((s) => s.studentId);
      // payload for backend
      const payload: AttendanceFinalizePayload = {
        classId: selectedClass.id,
        date: new Date().toISOString().slice(0, 10),
        presentStudentIds,
      };
      await mockFinalizeAttendance(payload);
      // In real app: insert rows into attendance table for each student
      alert(`Submitted attendance for ${presentStudentIds.length} students.`);
      // optionally stop session or keep running. We'll keep running but clear verified flags:
      setScans((prev) => prev.map((s) => ({ ...s, verified: false })));
    } catch (err) {
      console.error(err);
      alert("Submit failed");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadQrImage() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `${selectedClass?.courseCode ?? "qr"}_session.png`;
    a.click();
  }

  /* ------------------------ UI ------------------------------- */

  const isActive = !!sessionId && !!token;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Generate QR — Live Session</h2>
          <div className="text-sm text-slate-500 mt-1">Display QR, review scanned students and submit attendance</div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-sm text-slate-600">Current: {nowHHMM()}</div>
        </div>
      </div>

      {/* Class selector + controls */}
      <div className="flex gap-3 items-center">
        <select
          value={selectedClass?.id ?? ""}
          onChange={(e) => {
            const found = timetable.find((t) => t.id === e.target.value);
            setSelectedClass(found ?? null);
          }}
          className="px-3 py-2 border rounded-md"
        >
          {timetable.map((c) => (
            <option key={c.id} value={c.id}>
              {c.courseCode} — {c.courseTitle} ({c.start}-{c.end})
            </option>
          ))}
        </select>

        {!isActive ? (
          <button onClick={startSession} className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md">
            <PlayCircle className="w-5 h-5" /> Start Live Session
          </button>
        ) : (
          <button onClick={stopSession} className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-md">
            <StopCircle className="w-5 h-5" /> Stop Session
          </button>
        )}

        <button onClick={downloadQrImage} disabled={!qrDataUrl} className="inline-flex items-center gap-2 px-3 py-2 border rounded-md">
          <Download className="w-4 h-4" /> Download QR
        </button>
      </div>

      {/* QR + summary area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* QR CARD */}
        <div className="lg:col-span-1 bg-white rounded-lg p-6 border shadow-sm flex flex-col items-center">
          <div className="mb-3 text-sm text-slate-500">Class</div>
          <div className="text-lg font-medium mb-2">{selectedClass ? `${selectedClass.courseCode} • ${selectedClass.courseTitle}` : "No class selected"}</div>
          <div className="text-xs text-slate-400 mb-4">{selectedClass ? `${selectedClass.start} - ${selectedClass.end} • ${selectedClass.room ?? ""}` : ""}</div>

          <div className="w-full flex items-center justify-center bg-gray-50 p-4 rounded-lg border">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="Live QR" className="w-72 h-72 object-contain" />
            ) : (
              <div className="w-72 h-72 flex items-center justify-center text-slate-400">
                {isActive ? "Generating QR..." : "Start session to generate QR"}
              </div>
            )}
          </div>

          <div className="mt-4 text-sm text-slate-600">
            {isActive ? (
              <>
                <div>Session: <span className="font-mono text-xs">{sessionId}</span></div>
                <div className="mt-1 text-xs text-slate-400">
                    Auto-refresh every 1.5s (Anti-proxy enabled)
                </div>
                
              </>
            ) : (
              <div className="text-xs text-slate-400">No active live session</div>
            )}
          </div>
        </div>

        {/* Scans + verify table */}
        <div className="lg:col-span-2 bg-white rounded-lg p-4 border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="font-medium">Scanned Students</div>
            <div className="text-xs text-slate-500">Last polled: {lastPolledAt ? new Date(lastPolledAt).toLocaleTimeString() : "—"}</div>
          </div>

          <div className="max-h-[420px] overflow-y-auto divide-y">
            {scans.length === 0 ? (
              <div className="py-8 text-center text-slate-500">No students scanned yet.</div>
            ) : (
              scans.map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 px-2">
                  <div>
                    <div className="font-medium">{s.name} <span className="text-xs text-slate-400">({s.roll})</span></div>
                    <div className="text-xs text-slate-500">Scanned at {new Date(s.scannedAt).toLocaleTimeString()}</div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2">
                      <input type="checkbox" checked={!!s.verified} onChange={() => toggleVerify(s.id)} className="w-4 h-4" />
                      <span className="text-sm text-slate-600">Verified</span>
                    </label>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3">
            <button onClick={() => setScans([])} className="px-3 py-2 border rounded-md text-sm">Clear</button>
            <button onClick={submitAttendance} disabled={submitting || scans.filter(s => s.verified).length === 0} className="px-4 py-2 rounded-md bg-purple-600 text-white text-sm">
              {submitting ? "Submitting..." : `Submit Attendance (${scans.filter(s => s.verified).length})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
