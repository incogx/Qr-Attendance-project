import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Users, Calendar, User, MessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getPendingApprovals, reviewApproval, getSessionAttendance } from '../../lib/attendanceService';

interface Approval {
  id: string;
  session_id: string;
  submitted_at: string;
  status: string;
  comments: string | null;
  sessions: {
    id: string;
    session_date: string;
    start_time?: string;
    qr_payload: string;
    classes: {
      class_no: string;
      name: string;
      instructor_name: string;
    };
  };
}

interface AttendanceRecord {
  id: string;
  student_id: string;
  marked_at: string;
  status?: 'PRESENT' | 'ABSENT';
  students?: {
    reg_number: string;
    name: string;
  };
}

export default function HodApprovals() {
  const { user } = useAuth() as any;
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproval, setSelectedApproval] = useState<Approval | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [comment, setComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  useEffect(() => {
    if (selectedApproval) {
      fetchSessionAttendance(selectedApproval.session_id);
    } else {
      setAttendance([]);
    }
  }, [selectedApproval]);

  async function fetchPendingApprovals() {
    setLoading(true);
    setError(null);
    try {
      const data = await getPendingApprovals();
      setApprovals(data);
    } catch (err: any) {
      console.error('Failed to fetch approvals:', err);
      setError(err.message || 'Failed to load pending approvals');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSessionAttendance(sessionId: string) {
    try {
      const data = await getSessionAttendance(sessionId);
      setAttendance(data);
    } catch (err: any) {
      console.error('Failed to fetch attendance:', err);
    }
  }

  async function handleApprove() {
    if (!selectedApproval || !user) return;

    const confirmed = window.confirm('Approve this attendance session?');
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);

    try {
      await reviewApproval(selectedApproval.id, user.id, 'APPROVED', comment.trim() || undefined);
      alert('Attendance session approved successfully!');
      setSelectedApproval(null);
      setComment('');
      fetchPendingApprovals();
    } catch (err: any) {
      console.error('Failed to approve:', err);
      setError(err.message || 'Failed to approve session');
    } finally {
      setActionLoading(false);
    }
  }

  // HOD view is read-only; toggling attendance is disabled by RLS

  async function handleReject() {
    if (!selectedApproval || !user) return;
    if (!comment.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }

    const confirmed = window.confirm('Reject this attendance session?');
    if (!confirmed) return;

    setActionLoading(true);
    setError(null);

    try {
      await reviewApproval(selectedApproval.id, user.id, 'REJECTED', comment.trim());
      alert('Attendance session rejected.');
      setSelectedApproval(null);
      setComment('');
      fetchPendingApprovals();
    } catch (err: any) {
      console.error('Failed to reject:', err);
      setError(err.message || 'Failed to reject session');
    } finally {
      setActionLoading(false);
    }
  }

  const presentCount = attendance.filter(a => (a.status || 'PRESENT') === 'PRESENT').length;
  const totalCount = attendance.length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Attendance Approvals</h1>
        <p className="text-gray-600">Review and approve faculty attendance submissions</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Pending Approvals List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-600" />
              Pending Approvals ({approvals.length})
            </h2>

            {loading ? (
              <div className="py-8 text-center text-gray-500">Loading...</div>
            ) : approvals.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-sm">No pending approvals</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {approvals.map((approval) => (
                  <button
                    key={approval.id}
                    onClick={() => setSelectedApproval(approval)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedApproval?.id === approval.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="font-semibold text-gray-900 mb-1">
                      Class {approval.sessions.classes.class_no}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {approval.sessions.classes.instructor_name || 'N/A'}
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(approval.sessions.session_date).toLocaleDateString()}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Details & Actions */}
        <div className="lg:col-span-2">
          {!selectedApproval ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Select an approval from the list to review details</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Session Info */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Session Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Class:</span>
                    <span className="ml-2 font-semibold">{selectedApproval.sessions.classes.class_no}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Faculty:</span>
                    <span className="ml-2 font-medium">{selectedApproval.sessions.classes.instructor_name || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium">{new Date(selectedApproval.sessions.session_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Submitted:</span>
                    <span className="ml-2 font-medium">{new Date(selectedApproval.submitted_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Attendance Summary */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Attendance Summary</h3>
                <div className="flex gap-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-gray-600">Present:</span>
                    <span className="font-bold text-green-600">{presentCount}</span>
                  </div>
                  {/* Absentees are not stored; HOD sees only present count */}
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-gray-600" />
                    <span className="text-sm text-gray-600">Total:</span>
                    <span className="font-bold text-gray-900">{totalCount}</span>
                  </div>
                </div>
              </div>

              {/* Attendance List */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Student Attendance</h3>
                <div className="overflow-auto max-h-[400px]">
                  {attendance.length === 0 ? (
                    <div className="py-8 text-center text-gray-500">No attendance records</div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Register No.</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Student Name</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                          <th className="px-4 py-3 text-left font-semibold text-gray-700">Time</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {attendance.map((record) => {
                          const status = record.status || 'PRESENT';
                          const isPresent = status === 'PRESENT';
                          
                          return (
                            <tr key={record.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 font-medium text-gray-900">
                                {record.students?.reg_number || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-gray-700">
                                {record.students?.name || 'Unknown'}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                  isPresent ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {isPresent ? (
                                    <>
                                      <CheckCircle className="w-3 h-3" />
                                      Present
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3 h-3" />
                                      Not Marked
                                    </>
                                  )}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-600 text-xs">
                                {new Date(record.marked_at).toLocaleTimeString()}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Comment & Actions */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Comment (optional for approval, required for rejection)
                </h3>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add a comment or feedback..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                />

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleApprove}
                    disabled={actionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    <CheckCircle className="w-5 h-5" />
                    {actionLoading ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={actionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    <XCircle className="w-5 h-5" />
                    {actionLoading ? 'Processing...' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
