// src/components/faculty/CreateAttendancePage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, CheckCircle, XCircle, Loader } from "lucide-react";
import { AttendanceReport, AttendanceEntry } from "../../types/attendance";
import { useAuth } from "../../contexts/AuthContext";

/**
 * CreateAttendancePage
 * - Marks attendance for a class on a given date.
 * - Sends standardized payload to API: { facultyId, departmentId, classId, date, semester, status, entries: [...] }
 *
 * NOTES:
 * - Adjust API_CREATE to match your server (currently "/api/attendance").
 * - Ensure backend expects camelCase keys (facultyId/classId). If your backend expects snake_case, either adapt here
 *   or update server to accept camelCase.
 */

const API_CREATE = "/api/attendance"; // <-- change if your server uses another path
const API_LIST_STUDENTS = "/api/students?classId="; // optional: if you have a students API

export default function CreateAttendancePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth() as any;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [semester, setSemester] = useState("Fall 2023");
  const [students, setStudents] = useState<AttendanceEntry[]>([]);
  const [departmentId, setDepartmentId] = useState<string | null>(
    (profile?.departmentId as string) ?? (profile?.department_id as string) ?? "CSE"
  );

  // Load students for the selected class.
  // If you have a real students API, replace the mock below with a fetch to API_LIST_STUDENTS + classId.
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }

    setLoading(true);
    setError(null);

    // If you have a backend endpoint for students, use fetch instead:
    // fetch(`${API_LIST_STUDENTS}${encodeURIComponent(classId)}`)
    //   .then(res => res.json())
    //   .then(data => setStudents(mapFromApi(data)))
    //   .catch(err => setError(String(err)))
    //   .finally(() => setLoading(false));

    // Mock data fallback (keeps current behaviour)
    const t = setTimeout(() => {
      const mockStudents: AttendanceEntry[] = [
        {
          id: "1",
          report_id: "",
          student_id: "s1",
          student_name: "John Doe",
          roll_number: "001",
          present: true,
        },
        {
          id: "2",
          report_id: "",
          student_id: "s2",
          student_name: "Jane Smith",
          roll_number: "002",
          present: false,
        },
        // add more mock entries as desired
      ];
      setStudents(mockStudents);
      setLoading(false);
    }, 800);

    return () => clearTimeout(t);
  }, [classId]);

  // Toggle present/absent for a student
  const togglePresent = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, present: !s.present } : s
      )
    );
  };

  // Build payload expected by most backends (camelCase)
  const buildPayload = () => {
    const facultyId = profile?.id ?? user?.id ?? null;
    return {
      facultyId,
      departmentId,
      classId,
      date,
      semester,
      status: "DRAFT",
      entries: students.map((s) => ({
        studentId: s.student_id,
        studentName: s.student_name,
        rollNumber: s.roll_number,
        present: !!s.present,
      })),
    };
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(null);

    if (!classId) {
      setError("Please select a class.");
      return;
    }
    if (!date) {
      setError("Please select a date.");
      return;
    }
    if (students.length === 0) {
      setError("No students loaded for this class.");
      return;
    }
    if (!profile && !user) {
      setError("You must be signed in to create attendance.");
      return;
    }

    setLoading(true);

    try {
      const payload = buildPayload();

      // POST to server
      const res = await fetch(API_CREATE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // try to read error message
        let message = `Failed to create attendance (${res.status})`;
        try {
          const json = await res.json();
          message = json?.message || message;
        } catch {
          const text = await res.text().catch(() => "");
          if (text) message = text;
        }
        throw new Error(message);
      }

      // server should return the created report
      const created: AttendanceReport | any = await res.json();

      setSuccess("Attendance saved successfully.");
      // small delay so user sees success before redirect
      setTimeout(() => navigate("/faculty/attendance"), 700);
    } catch (err: any) {
      console.error("CreateAttendance error:", err);
      setError(err?.message ?? "Failed to save attendance report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Create Attendance Report
          </h1>
          <p className="text-sm text-slate-500 mt-1">Mark attendance for your class</p>
        </div>
        <button
          onClick={() => navigate("/faculty/attendance")}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Reports
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">{success}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">Select Class</option>
              <option value="CS201">CS201</option>
              <option value="CS202">CS202</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="Fall 2023">Fall 2023</option>
              <option value="Spring 2024">Spring 2024</option>
            </select>
          </div>
        </div>

        {classId && (
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Mark Attendance</h3>

            {loading && students.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading students...</span>
              </div>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <div
                    key={student.student_id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{student.student_name}</p>
                      <p className="text-sm text-slate-500">Roll: {student.roll_number}</p>
                    </div>
                    <button
                      onClick={() => togglePresent(student.student_id)}
                      className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                        student.present ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                      disabled={loading}
                      aria-pressed={student.present}
                    >
                      {student.present ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      {student.present ? "Present" : "Absent"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save as Draft
        </button>
      </div>
    </div>
  );
}
