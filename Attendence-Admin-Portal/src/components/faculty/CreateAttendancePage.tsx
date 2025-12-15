// src/components/faculty/CreateAttendancePage.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, ArrowLeft, CheckCircle, XCircle, Loader } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

/**
 * CreateAttendancePage
 * - Marks attendance for a class using the new database schema.
 * - Creates a session and attendance_marks records in Supabase.
 * - Fetches faculty's classes and students for selected class from real database.
 */

interface StudentEntry {
  id: string;
  student_id: string;
  reg_number: string;
  name: string;
  present: boolean;
}

interface ClassOption {
  id: string;
  class_no: string;
  department?: string;
}

export default function CreateAttendancePage() {
  const navigate = useNavigate();
  const { user } = useAuth() as any;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [classId, setClassId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [students, setStudents] = useState<StudentEntry[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch faculty's classes on mount
  useEffect(() => {
    if (!user) return;

    const fetchClasses = async () => {
      try {
        const { data, error } = await supabase
          .from("class_faculty")
          .select("class_id, classes(id, class_no, department)")
          .eq("faculty_id", user.id);

        if (error) throw error;

        const classList = (data || [])
          .map((item: any) => ({
            id: item.classes?.id || "",
            class_no: item.classes?.class_no || "",
            department: item.classes?.department,
          }))
          .filter((cls) => cls.id);

        setClasses(classList);
      } catch (err) {
        console.error("Error fetching classes:", err);
        setError("Failed to load classes");
      } finally {
        setLoadingClasses(false);
      }
    };

    fetchClasses();
  }, [user]);

  // Fetch students for selected class
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }

    const fetchStudents = async () => {
      setLoadingStudents(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("students")
          .select("id, reg_number, name")
          .eq("class_id", classId)
          .order("name");

        if (error) throw error;

        const studentList = (data || []).map((student: any) => ({
          id: student.id,
          student_id: student.id,
          reg_number: student.reg_number,
          name: student.name || "Unknown",
          present: false,
        }));

        setStudents(studentList);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError("Failed to load students");
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, [classId]);

  // Toggle present/absent for a student
  const togglePresent = (studentId: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.student_id === studentId ? { ...s, present: !s.present } : s
      )
    );
  };

  // Save attendance to database
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
      setError("No students found for this class.");
      return;
    }
    if (!user) {
      setError("You must be signed in to create attendance.");
      return;
    }

    setLoading(true);

    try {
      // 1. Create a session record
      const { data: sessionData, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          class_id: classId,
          qr_payload: `session_${Date.now()}`,
          status: "ACTIVE",
          session_date: date,
          start_time: new Date().toISOString(),
          created_by: user.id,
        })
        .select("id")
        .single();

      if (sessionError) throw new Error(`Failed to create session: ${sessionError.message}`);

      const sessionId = sessionData.id;

      // 2. Create attendance_marks records for each student
      const attendanceRecords = students.map((student) => ({
        student_id: student.student_id,
        class_id: classId,
        session_id: sessionId,
        status: student.present ? "PRESENT" : "ABSENT",
        marked_at: new Date().toISOString(),
      }));

      const { error: attendanceError } = await supabase
        .from("attendance_marks")
        .insert(attendanceRecords);

      if (attendanceError) throw new Error(`Failed to save attendance: ${attendanceError.message}`);

      setSuccess("Attendance saved successfully.");
      setTimeout(() => navigate("/faculty/attendance"), 700);
    } catch (err: any) {
      console.error("Error saving attendance:", err);
      setError(err?.message ?? "Failed to save attendance.");
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            {loadingClasses ? (
              <div className="flex items-center gap-2 p-2 text-slate-500">
                <Loader className="w-4 h-4 animate-spin" />
                Loading classes...
              </div>
            ) : (
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              >
                <option value="">Select Class</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.class_no} {cls.department ? `(${cls.department})` : ""}
                  </option>
                ))}
              </select>
            )}
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
        </div>

        {classId && (
          <div>
            <h3 className="text-lg font-medium text-slate-900 mb-4">Mark Attendance</h3>

            {loadingStudents && students.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 animate-spin text-blue-600" />
                <span className="ml-2 text-slate-600">Loading students...</span>
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No students found for this class</div>
            ) : (
              <div className="space-y-2">
                {students.map((student) => (
                  <div
                    key={student.student_id}
                    className="flex items-center justify-between p-3 border border-slate-200 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{student.name}</p>
                      <p className="text-sm text-slate-500">Reg: {student.reg_number}</p>
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
