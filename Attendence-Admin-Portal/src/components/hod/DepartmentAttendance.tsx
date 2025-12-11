// src/components/hod/DepartmentAttendance.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Download, Eye, Clock, CheckCircle, XCircle } from "lucide-react";

/**
 * DepartmentAttendance.tsx
 * - HOD view to review/approve attendance reports submitted by faculty.
 * - Self-contained types so this file works without extra imports.
 * - Mock data function included; replace with real API calls as needed.
 */

/* ---------------------- Types ---------------------- */
type AttendanceStatus = "DRAFT" | "SUBMITTED_TO_HOD" | "HOD_APPROVED" | "CHANGES_REQUESTED" | string;

type AttendanceEntry = {
  id?: string;
  roll_number?: string;
  student_name?: string;
  present?: boolean;
};

type AttendanceReport = {
  id: string;
  faculty_id: string;
  department_id: string;
  class_id: string;
  date: string; // ISO date or string
  semester?: string;
  status: AttendanceStatus;
  created_at?: string;
  updated_at?: string;
  approved_at?: string | null;
  students?: AttendanceEntry[];
};

/* ------------------- Mock API / Data ------------------- */
async function mockFetchReports(): Promise<AttendanceReport[]> {
  await new Promise((r) => setTimeout(r, 300));
  const now = new Date().toISOString();
  return [
    {
      id: "1",
      faculty_id: "f1",
      department_id: "CSE",
      class_id: "CS201",
      date: "2024-01-15",
      semester: "Spring 2024",
      status: "SUBMITTED_TO_HOD",
      created_at: now,
      updated_at: now,
      students: [
        { id: "s1", roll_number: "001", student_name: "John Doe", present: true },
        { id: "s2", roll_number: "002", student_name: "Jane Smith", present: false },
      ],
    },
    {
      id: "2",
      faculty_id: "f2",
      department_id: "CSE",
      class_id: "CS301",
      date: "2024-01-15",
      semester: "Spring 2024",
      status: "HOD_APPROVED",
      created_at: now,
      updated_at: now,
      approved_at: now,
      students: [
        { id: "s3", roll_number: "003", student_name: "Alice Kumar", present: true },
        { id: "s4", roll_number: "004", student_name: "Bob Lee", present: true },
      ],
    },
  ];
}

/* --------------------- Component --------------------- */
export default function DepartmentAttendance() {
  const [reports, setReports] = useState<AttendanceReport[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedReport, setSelectedReport] = useState<AttendanceReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const data = await mockFetchReports();
      setReports(data);
    } catch (err: any) {
      console.error("Failed to load reports:", err);
      setError("Failed to load reports. Try again.");
      setReports([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(reportId: string) {
    // optimistic UI - replace with real API call
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: "HOD_APPROVED", approved_at: new Date().toISOString() } : r))
    );
  }

  async function handleRequestChanges(reportId: string) {
    setReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, status: "CHANGES_REQUESTED" } : r)));
  }

  function formatDateSafe(d?: string) {
    if (!d) return "-";
    const parsed = Date.parse(d);
    if (Number.isNaN(parsed)) return d;
    return new Date(parsed).toLocaleDateString();
  }

  function getStatusColor(status: AttendanceStatus) {
    switch (status) {
      case "SUBMITTED_TO_HOD":
        return "bg-yellow-100 text-yellow-800";
      case "HOD_APPROVED":
        return "bg-green-100 text-green-800";
      case "CHANGES_REQUESTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  }

  function getStatusIcon(status: AttendanceStatus) {
    switch (status) {
      case "SUBMITTED_TO_HOD":
        return <Clock className="w-4 h-4" />;
      case "HOD_APPROVED":
        return <CheckCircle className="w-4 h-4" />;
      case "CHANGES_REQUESTED":
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  }

  function exportReportCSV(r: AttendanceReport) {
    const rows: string[][] = [["Roll", "Name", "Present"]];
    (r.students ?? []).forEach((s) => {
      rows.push([s.roll_number ?? "", s.student_name ?? "", s.present ? "1" : "0"]);
    });
    const csv = rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance_report_${r.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const totals = useMemo(() => {
    const totalReports = reports.length;
    const submitted = reports.filter((r) => r.status === "SUBMITTED_TO_HOD").length;
    const approved = reports.filter((r) => r.status === "HOD_APPROVED").length;
    return { totalReports, submitted, approved };
  }, [reports]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Attendance Reports</h1>
          <p className="text-sm text-slate-500 mt-1">Review and approve faculty attendance submissions.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-600">
            <div>Total: <span className="font-medium text-slate-900">{totals.totalReports}</span></div>
            <div className="text-xs text-slate-500">Submitted: {totals.submitted} • Approved: {totals.approved}</div>
          </div>

          <button
            onClick={loadReports}
            className="px-3 py-2 rounded-lg border bg-white text-sm hover:bg-gray-50"
            title="Refresh"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading reports...</div>
        ) : error ? (
          <div className="p-6 text-sm text-red-700 bg-red-50 border-t border-red-100">{error}</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No reports submitted yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3 px-4 font-medium text-slate-700">Faculty</th>
                  <th className="py-3 px-4 font-medium text-slate-700">Class</th>
                  <th className="py-3 px-4 font-medium text-slate-700">Date</th>
                  <th className="py-3 px-4 font-medium text-slate-700">Status</th>
                  <th className="py-3 px-4 font-medium text-slate-700">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-medium">Faculty {report.faculty_id}</div>
                      <div className="text-xs text-slate-500">{report.department_id}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-medium">{report.class_id}</div>
                      <div className="text-xs text-slate-500">{report.semester}</div>
                    </td>

                    <td className="py-3 px-4">{formatDateSafe(report.date)}</td>

                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(report.status)}`}>
                        {getStatusIcon(report.status)}
                        <span>{String(report.status).replace(/_/g, " ")}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setSelectedReport(report)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 inline-flex items-center gap-2"
                        >
                          <Eye className="w-3 h-3" /> View
                        </button>

                        <button
                          onClick={() => exportReportCSV(report)}
                          className="px-3 py-1 text-xs rounded border inline-flex items-center gap-2"
                          title="Export CSV"
                        >
                          <Download className="w-3 h-3" /> Export
                        </button>

                        {report.status === "SUBMITTED_TO_HOD" && (
                          <>
                            <button
                              onClick={() => handleApprove(report.id)}
                              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleRequestChanges(report.id)}
                              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                            >
                              Request Changes
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Details Modal */}
      {selectedReport && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedReport(null)} aria-hidden />

          <div className="relative z-10 bg-white rounded-lg max-w-3xl w-full overflow-hidden shadow-2xl">
            <div className="p-6 border-b flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold">Report Details</h3>
                <div className="text-xs text-slate-500 mt-1">
                  {selectedReport.class_id} • {selectedReport.department_id} • {formatDateSafe(selectedReport.date)}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(selectedReport.status)}`}>
                  {getStatusIcon(selectedReport.status)}
                  {String(selectedReport.status).replace(/_/g, " ")}
                </span>
                <button onClick={() => setSelectedReport(null)} className="px-3 py-1 rounded border text-sm">Close</button>
              </div>
            </div>

            <div className="p-6 max-h-[60vh] overflow-auto">
              <h4 className="text-sm font-medium mb-3">Submitted by</h4>
              <div className="text-sm text-slate-700 mb-4">Faculty ID: {selectedReport.faculty_id}</div>

              <h4 className="text-sm font-medium mb-3">Students</h4>
              <div className="overflow-x-auto border rounded">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="py-2 px-3 text-xs text-slate-600">Roll</th>
                      <th className="py-2 px-3 text-xs text-slate-600">Name</th>
                      <th className="py-2 px-3 text-xs text-slate-600">Present</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selectedReport.students ?? []).map((s) => (
                      <tr key={s.id ?? `${s.roll_number}-${s.student_name}`} className="odd:bg-white even:bg-slate-50">
                        <td className="py-2 px-3 text-xs">{s.roll_number}</td>
                        <td className="py-2 px-3 text-sm">{s.student_name}</td>
                        <td className="py-2 px-3 text-xs">{s.present ? "Present" : "Absent"}</td>
                      </tr>
                    ))}
                    {(selectedReport.students ?? []).length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-6 px-3 text-center text-slate-500">No student rows available</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                {selectedReport.status === "SUBMITTED_TO_HOD" && (
                  <>
                    <button
                      onClick={() => {
                        handleRequestChanges(selectedReport.id);
                        setSelectedReport(null);
                      }}
                      className="px-4 py-2 rounded-full bg-red-600 text-white"
                    >
                      Request Changes
                    </button>

                    <button
                      onClick={() => {
                        handleApprove(selectedReport.id);
                        setSelectedReport(null);
                      }}
                      className="px-4 py-2 rounded-full bg-green-600 text-white"
                    >
                      Approve
                    </button>
                  </>
                )}

                <button onClick={() => setSelectedReport(null)} className="px-4 py-2 rounded-full border">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
