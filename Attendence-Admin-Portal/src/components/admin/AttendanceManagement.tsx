import React, { useEffect, useMemo, useState } from "react";
import { DownloadCloud, Trash2, Eye, Search } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import * as XLSX from 'xlsx';

/**
 * src/components/admin/AttendanceManagement.tsx
 *
 * Admin view to manage attendance reports across departments.
 *
 * - Replace API_LIST / API_DELETE with your real endpoints.
 * - Defensive: falls back to sample data if backend is not available.
 */

type AttendanceEntry = {
  student_id?: string;
  reg_number?: string;
  student_name?: string;
  status?: string;
  marked_at?: string;
};

type AttendanceReport = {
  id: string;
  session_id: string;
  class_no?: string;
  class_name?: string;
  instructor_name?: string;
  department?: string;
  session_date?: string;
  reviewed_at?: string;
  students?: AttendanceEntry[];
};

const API_LIST = "/api/admin/attendance";
const API_DELETE = (id: string) => `/api/admin/attendance/${id}`;

function sampleData(): AttendanceReport[] {
  const d = new Date().toISOString().slice(0, 10);
  return [
    {
      id: "r-1",
      facultyName: "Dr. A. Kumar",
      classId: "CS201",
      className: "Data Structures",
      department: "CSE",
      date: d,
      semester: "Fall 2025",
      notes: "First lecture",
      students: [
        { student_id: "s1", student_name: "John Doe", roll_number: "001", present: true },
        { student_id: "s2", student_name: "Jane Smith", roll_number: "002", present: false },
      ],
      created_at: new Date().toISOString(),
    },
    {
      id: "r-2",
      facultyName: "Prof. S. Rao",
      classId: "ME101",
      className: "Mechanics",
      department: "MECH",
      date: d,
      semester: "Fall 2025",
      notes: "",
      students: [
        { student_id: "s3", student_name: "Alice", roll_number: "010", present: true },
      ],
      created_at: new Date().toISOString(),
    },
  ];
}

export default function AttendanceManagement() {
  const auth = (useAuth?.() as any) ?? {};
  const { user, profile } = auth;

  const [reports, setReports] = useState<AttendanceReport[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // UI controls
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string>("ALL");
  const [date, setDate] = useState<string>(""); // ISO date filter
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        // Fetch approved attendance sessions with student details
        const { data: approvals, error: approvalsError } = await supabase
          .from('approvals')
          .select(`
            id,
            session_id,
            reviewed_at,
            sessions!inner (
              id,
              session_date,
              classes!inner (
                class_no,
                name,
                instructor_name,
                department
              )
            )
          `)
          .eq('status', 'APPROVED')
          .order('reviewed_at', { ascending: false });

        if (approvalsError) throw approvalsError;

        if (!mounted) return;

        // Fetch attendance records for each approved session
        const reportsWithStudents = await Promise.all(
          (approvals || []).map(async (approval: any) => {
            const { data: attendance, error: attError } = await supabase
              .from('attendance')
              .select(`
                id,
                student_id,
                status,
                marked_at,
                students (
                  reg_number,
                  name
                )
              `)
              .eq('session_id', approval.session_id);

            if (attError) console.error('Error fetching attendance:', attError);

            return {
              id: approval.id,
              session_id: approval.session_id,
              class_no: approval.sessions.classes.class_no,
              class_name: approval.sessions.classes.name,
              instructor_name: approval.sessions.classes.instructor_name,
              department: approval.sessions.classes.department,
              session_date: approval.sessions.session_date,
              reviewed_at: approval.reviewed_at,
              students: (attendance || []).map((att: any) => ({
                student_id: att.student_id,
                reg_number: att.students?.reg_number,
                student_name: att.students?.name,
                status: att.status || 'PRESENT',
                marked_at: att.marked_at,
              })),
            };
          })
        );

        if (mounted) {
          setReports(reportsWithStudents);
        }
      } catch (err: any) {
        console.error("[AttendanceManagement] fetch error:", err);
        if (!mounted) return;
        setError(String(err?.message ?? "Failed to load attendance reports"));
        setReports([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const filtered = useMemo(() => {
    if (!reports) return [];
    return reports.filter((r) => {
      if (department !== "ALL" && (r.department ?? "").toUpperCase() !== department.toUpperCase()) return false;
      if (date && r.session_date !== date) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (r.class_no ?? "").toLowerCase().includes(q) ||
        (r.class_name ?? "").toLowerCase().includes(q) ||
        (r.instructor_name ?? "").toLowerCase().includes(q) ||
        (r.department ?? "").toLowerCase().includes(q)
      );
    });
  }, [reports, query, department, date]);

  async function handleDelete(id: string) {
    setDeleting(true);
    setError(null);
    try {
      const { error: deleteError } = await supabase
        .from('approvals')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      setReports((prev) => prev?.filter((p) => p.id !== id) ?? null);
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error("Delete error:", err);
      setError(String(err?.message ?? "Delete failed"));
    } finally {
      setDeleting(false);
    }
  }

  function exportExcel(r: AttendanceReport) {
    // Prepare data for Excel
    const worksheetData = [
      ['Attendance Report'],
      ['Class:', r.class_no, r.class_name || ''],
      ['Instructor:', r.instructor_name || ''],
      ['Department:', r.department || ''],
      ['Date:', r.session_date || ''],
      ['Approved:', r.reviewed_at ? new Date(r.reviewed_at).toLocaleString() : ''],
      [],
      ['Register No.', 'Student Name', 'Status', 'Marked At'],
    ];

    // Add student rows
    (r.students || []).forEach((s) => {
      worksheetData.push([
        s.reg_number || '',
        s.student_name || '',
        s.status || 'PRESENT',
        s.marked_at ? new Date(s.marked_at).toLocaleTimeString() : '',
      ]);
    });

    // Add summary
    const presentCount = (r.students || []).filter(s => (s.status || 'PRESENT') === 'PRESENT').length;
    const absentCount = (r.students || []).filter(s => s.status === 'ABSENT').length;
    worksheetData.push([]);
    worksheetData.push(['Summary']);
    worksheetData.push(['Present:', presentCount]);
    worksheetData.push(['Absent:', absentCount]);
    worksheetData.push(['Total:', r.students?.length || 0]);

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
      { wch: 15 },
    ];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

    // Generate filename
    const filename = `attendance_${r.class_no}_${r.session_date || 'report'}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Attendance Management</h1>
          <p className="text-sm text-slate-500 mt-1">View and manage attendance reports across departments.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by class, faculty or department"
              className="pl-10 pr-3 py-2 rounded-md border w-72 text-sm"
            />
          </div>

          <select className="rounded-md border px-3 py-2 text-sm" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="ALL">All Departments</option>
            <option value="CSE">CSE</option>
            <option value="MECH">MECH</option>
            <option value="ECE">ECE</option>
            <option value="EEE">EEE</option>
          </select>

          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md border px-3 py-2 text-sm" />
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md bg-red-50 border border-red-100 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-2xl border bg-white p-4">
        {loading && !reports ? (
          <div className="animate-pulse">
            <div className="h-6 bg-slate-200 rounded w-1/4 mb-4" />
            <div className="h-48 bg-slate-100 rounded" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-xs text-slate-500">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Class</th>
                  <th className="py-2 px-3">Department</th>
                  <th className="py-2 px-3">Faculty</th>
                  <th className="py-2 px-3">Students</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-3 text-center text-slate-500">
                      No reports found.
                    </td>
                  </tr>
                )}

                {filtered.map((r) => {
                  const presentCount = (r.students || []).filter(s => (s.status || 'PRESENT') === 'PRESENT').length;
                  const absentCount = (r.students || []).filter(s => s.status === 'ABSENT').length;
                  
                  return (
                    <tr key={r.id} className="odd:bg-white even:bg-slate-50">
                      <td className="py-3 px-3 text-xs text-slate-600">
                        {r.session_date ? new Date(r.session_date).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-medium">{r.class_no ?? "-"}</div>
                        <div className="text-xs text-slate-500">{r.class_name}</div>
                      </td>
                      <td className="py-3 px-3">{r.department ?? "-"}</td>
                      <td className="py-3 px-3">{r.instructor_name ?? "-"}</td>
                      <td className="py-3 px-3">
                        <div className="text-sm">
                          <span className="text-green-600 font-medium">{presentCount}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-red-600">{absentCount}</span>
                          <span className="text-slate-400 mx-1">/</span>
                          <span className="text-slate-600">{(r.students ?? []).length}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => exportExcel(r)}
                            className="px-3 py-1 rounded-md bg-green-600 text-white text-sm inline-flex items-center gap-2 hover:bg-green-700 transition-colors"
                            title="Export to Excel"
                          >
                            <DownloadCloud className="w-4 h-4" /> Excel
                          </button>

                          <button
                            onClick={() => setConfirmDeleteId(r.id)}
                            className="px-3 py-1 rounded-md border text-sm inline-flex items-center gap-2 hover:bg-slate-50 transition-colors"
                            title="Delete report"
                          >
                          <Trash2 className="w-4 h-4 text-red-600" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-40 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setConfirmDeleteId(null)} />
          <div className="relative z-50 w-[min(560px,94%)] max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-medium text-gray-900">Delete attendance report</h3>
            <p className="text-sm text-slate-600 mt-2">Are you sure you want to permanently delete this attendance report? This action cannot be undone.</p>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setConfirmDeleteId(null)} className="px-4 py-2 rounded-full border">Cancel</button>
              <button
                onClick={() => confirmDeleteId && handleDelete(confirmDeleteId)}
                className="px-4 py-2 rounded-full bg-red-600 text-white"
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
