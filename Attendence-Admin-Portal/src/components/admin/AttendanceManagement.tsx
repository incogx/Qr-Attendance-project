import { useEffect, useMemo, useState } from "react";
import { DownloadCloud, Trash2, Search, RefreshCw } from "lucide-react";
import { supabase } from "../../lib/supabase";
import * as XLSX from 'xlsx';

/**
 * src/components/admin/AttendanceManagement.tsx
 *
 * Admin view to manage approved attendance reports across departments.
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
  faculty_name?: string;
  department?: string;
  session_date?: string;
  reviewed_at?: string;
  students?: AttendanceEntry[];
};

export default function AttendanceManagement() {
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // UI controls
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState<string>("ALL");
  const [date, setDate] = useState<string>(""); // ISO date filter
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function fetchReports() {
    setLoading(true);
    setError(null);

    try {
      // Fetch approved sessions with class info
      const { data: approvals, error: approvalsError } = await supabase
        .from('approvals')
        .select(`
          id,
          session_id,
          reviewed_at,
          sessions (
            id,
            session_date,
            created_by,
            class_id,
            classes (
              class_no,
              department
            )
          )
        `)
        .eq('status', 'APPROVED')
        .order('reviewed_at', { ascending: false });

      if (approvalsError) throw approvalsError;

      // Build reports with faculty names and student attendance
      const reportsWithDetails = await Promise.all(
        (approvals || []).map(async (approval: any) => {
          const session = approval.sessions;
          if (!session) return null;

          // Get faculty name from profiles
          let facultyName = 'N/A';
          if (session.created_by) {
            const { data: faculty } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', session.created_by)
              .single();
            facultyName = faculty?.full_name || 'N/A';
          }

          // Get attendance records with student info
          const { data: attendance } = await supabase
            .from('attendance_marks')
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
            .eq('session_id', session.id);

          return {
            id: approval.id,
            session_id: session.id,
            class_no: session.classes?.class_no || 'N/A',
            faculty_name: facultyName,
            department: session.classes?.department || 'N/A',
            session_date: session.session_date,
            reviewed_at: approval.reviewed_at,
            students: (attendance || []).map((att: any) => ({
              student_id: att.student_id,
              reg_number: att.students?.reg_number || '',
              student_name: att.students?.name || '',
              status: att.status || 'PRESENT',
              marked_at: att.marked_at,
            })),
          };
        })
      );

      setReports(reportsWithDetails.filter(Boolean) as AttendanceReport[]);
    } catch (err: any) {
      console.error("[AttendanceManagement] fetch error:", err);
      setError(err?.message || "Failed to load attendance reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReports();
  }, []);

  const filtered = useMemo(() => {
    return reports.filter((r) => {
      if (department !== "ALL" && (r.department ?? "").toUpperCase() !== department.toUpperCase()) return false;
      if (date && r.session_date !== date) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        (r.class_no ?? "").toLowerCase().includes(q) ||
        (r.faculty_name ?? "").toLowerCase().includes(q) ||
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
      ['Class:', r.class_no || ''],
      ['Faculty:', r.faculty_name || ''],
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
    worksheetData.push(['Present:', String(presentCount)]);
    worksheetData.push(['Absent:', String(absentCount)]);
    worksheetData.push(['Total:', String(r.students?.length || 0)]);

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
          <p className="text-sm text-slate-500 mt-1">View and manage approved attendance reports.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="px-3 py-2 rounded-md border text-sm hover:bg-slate-50 inline-flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

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
        {loading && reports.length === 0 ? (
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
                  <th className="py-2 px-3">Present / Absent / Total</th>
                  <th className="py-2 px-3">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 px-3 text-center text-slate-500">
                      {reports.length === 0 ? "No approved reports found." : "No reports match your filters."}
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
                      <td className="py-3 px-3 font-medium">{r.class_no ?? "-"}</td>
                      <td className="py-3 px-3">{r.department ?? "-"}</td>
                      <td className="py-3 px-3">{r.faculty_name ?? "-"}</td>
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
