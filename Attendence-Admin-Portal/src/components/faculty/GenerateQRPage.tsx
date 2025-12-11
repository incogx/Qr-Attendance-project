import React, { useEffect, useState } from 'react';
import { Play, StopCircle, Send, Users, CheckCircle, XCircle, Clock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  startSession,
  getClassStudents,
  getSessionAttendance,
  markStudentPresent,
  submitSessionForApproval,
  toggleAttendanceStatus,
  Student,
  AttendanceRecord,
  Session,
} from '../../lib/attendanceService';

export default function GenerateQRPage() {
  const { user, profile } = useAuth() as any;
  
  const [classNo, setClassNo] = useState('');
  const [classId, setClassId] = useState<string | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Poll for new scans every 3 seconds when session is active
  useEffect(() => {
    if (!session || session.status !== 'ACTIVE') return;

    const interval = setInterval(async () => {
      try {
        const freshAttendance = await getSessionAttendance(session.id);
        setAttendance(freshAttendance);
      } catch (err) {
        console.error('Failed to poll attendance:', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [session]);

  const handleStartSession = async () => {
    if (!classNo.trim()) {
      setError('Please enter a class number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find class by class_no
      const { data: classData } = await supabase
        .from('classes')
        .select('id, class_no')
        .ilike('class_no', classNo.trim())
        .limit(1)
        .maybeSingle();

      if (!classData) {
        setError(`Class ${classNo} not found`);
        setLoading(false);
        return;
      }

      setClassId(classData.id);

      // Fetch students for this class
      const classStudents = await getClassStudents(classNo.trim());
      if (classStudents.length === 0) {
        setError(`No students found for class ${classNo}`);
        setLoading(false);
        return;
      }
      setStudents(classStudents);

      // Generate QR payload
      const qrPayload = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Start session
      const newSession = await startSession(classData.id, qrPayload);
      setSession(newSession);

      // Load initial attendance (should be empty)
      const initialAttendance = await getSessionAttendance(newSession.id);
      setAttendance(initialAttendance);
    } catch (err: any) {
      console.error('Failed to start session:', err);
      setError(err.message || 'Failed to start session');
    } finally {
      setLoading(false);
    }
  };

  const handleManualMark = async (studentId: string) => {
    if (!session || !classId) return;

    try {
      await markStudentPresent(studentId, classId, session.id);
      const freshAttendance = await getSessionAttendance(session.id);
      setAttendance(freshAttendance);
    } catch (err: any) {
      console.error('Failed to mark student:', err);
      setError(err.message || 'Failed to mark student');
    }
  };

  const handleSubmit = async () => {
    if (!session || !user) return;

    const confirmed = window.confirm(
      `Submit attendance for HOD approval?\n\nThis will close the session and send for approval.`
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError(null);

    try {
      await submitSessionForApproval(session.id, user.id);
      alert('Attendance submitted for HOD approval!');
      
      const freshAttendance = await getSessionAttendance(session.id);
      setAttendance(freshAttendance);
      
      setSession({ ...session, status: 'SUBMITTED' });
    } catch (err: any) {
      console.error('Failed to submit:', err);
      setError(err.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setSession(null);
    setStudents([]);
    setAttendance([]);
    setClassNo('');
    setClassId(null);
    setError(null);
  };

  const getStudentStatus = (studentId: string): 'PRESENT' | 'ABSENT' | 'NOT_MARKED' => {
    const record = attendance.find((r) => r.student_id === studentId);
    if (!record) return 'NOT_MARKED';
    return record.status || 'PRESENT';
  };

  const handleToggleStatus = async (studentId: string) => {
    const record = attendance.find((r) => r.student_id === studentId);
    if (!record) return;
    
    const currentStatus = record.status || 'PRESENT';
    const newStatus = currentStatus === 'PRESENT' ? 'ABSENT' : 'PRESENT';
    
    try {
      await toggleAttendanceStatus(record.id, newStatus);
      // Refresh attendance list
      if (session) {
        const freshAttendance = await getSessionAttendance(session.id);
        setAttendance(freshAttendance);
      }
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      setError(err.message || 'Failed to update attendance status');
    }
  };

  const presentCount = attendance.filter(a => (a.status || 'PRESENT') === 'PRESENT').length;
  const absentCount = attendance.filter(a => a.status === 'ABSENT').length;
  const notMarkedCount = students.length - attendance.length;

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Generate QR & Take Attendance</h1>
        <p className="text-gray-600">Start a live session, display QR for students to scan, and complete attendance</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!session ? (
        /* Start Session Form */
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-xl font-semibold mb-6">Start Attendance Session</h2>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Class Number
              </label>
              <input
                type="text"
                value={classNo}
                onChange={(e) => setClassNo(e.target.value)}
                placeholder="e.g., 373"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
              />
            </div>
            <button
              onClick={handleStartSession}
              disabled={loading || !classNo.trim()}
              className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-5 h-5" />
              {loading ? 'Starting...' : 'Start Session'}
            </button>
          </div>
        </div>
      ) : (
        /* Active Session */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: QR Code & Session Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Session Info</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-600">Class:</span>
                  <span className="ml-2 font-semibold">{classNo}</span>
                </div>
                <div>
                  <span className="text-gray-600">Date:</span>
                  <span className="ml-2 font-medium">
                    {new Date(session.session_date).toLocaleDateString()}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                      session.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : session.status === 'COMPLETED'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">QR Code</h3>
              <div className="bg-gray-50 rounded-lg p-6 text-center min-h-[300px] flex flex-col items-center justify-center">
                {session.status === 'ACTIVE' ? (
                  <>
                    <div className="mb-4">
                      <QRCodeSVG
                        value={session.qr_payload}
                        size={256}
                        level="H"
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Session ID:</p>
                    <p className="text-xs text-gray-400 font-mono break-all max-w-xs">{session.qr_payload}</p>
                    <p className="text-sm text-gray-600 mt-4">Students scan this QR code to mark attendance</p>
                  </>
                ) : (
                  <div className="text-gray-400">Session completed</div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">Summary</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    Present
                  </span>
                  <span className="font-semibold text-green-600">{presentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Absent
                  </span>
                  <span className="font-semibold text-red-600">{absentCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    Not Marked
                  </span>
                  <span className="font-semibold text-gray-600">{notMarkedCount}</span>
                </div>
                <div className="pt-3 border-t flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Total
                  </span>
                  <span className="font-bold text-gray-900">{students.length}</span>
                </div>
              </div>
            </div>

            {session.status === 'ACTIVE' && (
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  <Send className="w-5 h-5" />
                  {submitting ? 'Submitting...' : 'Submit to HOD'}
                </button>
                <button
                  onClick={handleReset}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <StopCircle className="w-5 h-5" />
                  Cancel Session
                </button>
              </div>
            )}

            {session.status === 'COMPLETED' && (
              <button
                onClick={handleReset}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Start New Session
              </button>
            )}
          </div>

          {/* Right: Student List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">
                Class Roster ({students.length} students)
              </h3>
              <div className="overflow-auto max-h-[600px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Reg No.</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-right font-semibold text-gray-700">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {students.map((student) => {
                      const status = getStudentStatus(student.id);
                      return (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {student.reg_number}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {student.name || '-'}
                          </td>
                          <td className="px-4 py-3">
                            {status === 'PRESENT' && (
                              <button
                                onClick={() => handleToggleStatus(student.id)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 cursor-pointer transition-colors"
                                title="Click to mark absent"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Present
                              </button>
                            )}
                            {status === 'ABSENT' && (
                              <button
                                onClick={() => handleToggleStatus(student.id)}
                                className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold hover:bg-red-200 cursor-pointer transition-colors"
                                title="Click to mark present"
                              >
                                <XCircle className="w-3 h-3" />
                                Absent
                              </button>
                            )}
                            {status === 'NOT_MARKED' && (
                              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
                                <Clock className="w-3 h-3" />
                                Not Marked
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {status === 'NOT_MARKED' && session.status === 'ACTIVE' && (
                              <button
                                onClick={() => handleManualMark(student.id)}
                                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                              >
                                Mark Present
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
