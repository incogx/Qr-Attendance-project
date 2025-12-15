import React, { useEffect, useMemo, useState } from 'react';
import { Play, StopCircle, Send, Users, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { showToast } from '../common/toast';

type StudentRow = {
  id: string; 
  reg_number: string;
  name: string | null;
};



type AttendanceRow = {
  id: string;
  student_id: string;
  session_id: string;
  status: 'PRESENT' | null;
  marked_at: string | null;
};

type SessionRow = {
  id: string;
  class_id: string;
  qr_payload: string;
  status: 'ACTIVE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | null;
  session_date?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

type RosterEntry = {
  student: StudentRow;
  attendanceId?: string;
  status: 'PRESENT' | 'NOT_MARKED';
  marked_at?: string | null;
};

export default function GenerateQRPage() {
  const { user } = useAuth();

  const [classNo, setClassNo] = useState('');
  const [session, setSession] = useState<SessionRow | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRow[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [activeUpdateId, setActiveUpdateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isLocked = session ? (session.status ?? 'ACTIVE') !== 'ACTIVE' : false;

  const roster = useMemo<RosterEntry[]>(() => {
    return students.map((student) => {
      const record = attendance.find((a) => a.student_id === student.id);
      if (!record) {
        return {
          student,
          status: 'NOT_MARKED',
        };
      }

      return {
        student,
        attendanceId: record.id,
        status: record.status === 'PRESENT' ? 'PRESENT' : 'NOT_MARKED',
        marked_at: record.marked_at ?? null,
      };
    });
  }, [students, attendance]);

  const presentCount = useMemo(() => roster.filter((r) => r.status === 'PRESENT').length, [roster]);
  const notMarkedCount = useMemo(() => roster.filter((r) => r.status === 'NOT_MARKED').length, [roster]);

  useEffect(() => {
    if (!session || (session.status ?? 'ACTIVE') !== 'ACTIVE') return;

    const interval = setInterval(async () => {
      try {
        await refreshAttendance(session.id);
      } catch (err) {
        console.error('Polling attendance failed', err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [session]);

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
  };

  const fetchSessionRecord = async (sessionId: string): Promise<SessionRow> => {
    const { data, error: sessionError } = await supabase
      .from('sessions')
      .select('id, class_id, qr_payload, status, session_date, created_at, expires_at')
      .eq('id', sessionId)
      .single();

    if (sessionError || !data) {
      throw new Error(sessionError?.message || 'Unable to load session');
    }

    return data as SessionRow;
  };

  const fetchClassNoById = async (classId?: string | null): Promise<string | null> => {
    if (!classId) return null;

    const { data, error } = await supabase
      .from('classes')
      .select('class_no')
      .eq('id', classId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch class_no by class_id', error);
      return null;
    }

    return data?.class_no ?? null;
  };

  const fetchStudentsForClass = async (classId: string | null, fallbackClassNo?: string) => {
    if (!classId && !fallbackClassNo) {
      setStudents([]);
      return;
    }

    let studentData: StudentRow[] | null = null;
    let lastError: Error | null = null;

    if (classId) {
      const { data, error: studentError } = await supabase
        .from('students')
        .select('id, reg_number, name')
        .eq('class_id', classId)
        .order('reg_number');

      lastError = studentError ? new Error(studentError.message || 'Failed to load students') : null;
      studentData = data || null;
    }

    if ((!studentData || studentData.length === 0) && fallbackClassNo) {
      const { data, error: studentError } = await supabase
        .from('students')
        .select('id, reg_number, name')
        .eq('class_no', fallbackClassNo)
        .order('reg_number');

      lastError = studentError ? new Error(studentError.message || 'Failed to load students') : lastError;
      studentData = data || studentData;
    }

    if (lastError) {
      throw lastError;
    }

    setStudents(studentData || []);
  };

  const refreshAttendance = async (sessionId: string) => {
    const { data, error: attendanceError } = await supabase
      .from('attendance_marks')
      .select('id, student_id, session_id, status, marked_at')
      .eq('session_id', sessionId)
      .order('marked_at', { ascending: false });

    if (attendanceError) {
      throw new Error(attendanceError.message || 'Failed to load attendance');
    }

    setAttendance(data || []);
  };

  const clearAttendanceMark = async (attendanceId: string, studentId: string) => {
    if (!session || isLocked) return;
    setActiveUpdateId(studentId);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('clear-attendance', {
        body: { attendance_id: attendanceId },
      });
      if (error) {
        const serverMessage = (data as any)?.error;
        throw new Error(serverMessage || error.message || 'Failed to clear mark');
      }
      await refreshAttendance(session.id);
      showToast('success', 'Attendance cleared successfully');
    } catch (err: any) {
      console.error('clear-attendance failed', err);
      setError(err.message || 'Failed to clear mark');
      showToast('error', err.message || 'Failed to clear mark');
    } finally {
      setActiveUpdateId(null);
    }
  };

  const markStudentPresent = async (studentId: string) => {
    if (!session || isLocked) return;
    setActiveUpdateId(studentId);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke('mark-attendance', {
        body: {
          student_id: studentId,
          session_id: session.id,
          class_id: session.class_id,
        },
      });
      if (error) {
        const serverMessage = (data as any)?.error;
        throw new Error(serverMessage || error.message || 'Failed to mark present');
      }
      await refreshAttendance(session.id);
      showToast('success', 'Student marked present');
    } catch (err: any) {
      console.error('mark-attendance failed', err);
      setError(err.message || 'Failed to mark present');
      showToast('error', err.message || 'Failed to mark present');
    } finally {
      setActiveUpdateId(null);
    }
  };

  const loadRosterAndAttendance = async (sessionRecord: SessionRow, classNoValue?: string) => {
    let fallbackClassNo = classNoValue ?? classNo.trim();
    if (!fallbackClassNo) {
      fallbackClassNo = (await fetchClassNoById(sessionRecord.class_id)) ?? '';
    }

    await fetchStudentsForClass(sessionRecord.class_id, fallbackClassNo || undefined);
    await refreshAttendance(sessionRecord.id);
  };

  useEffect(() => {
    if (!session?.class_id) return;

    loadRosterAndAttendance(session).catch((err) => {
      console.error('Failed to load roster', err);
      setError(err.message || 'Failed to load roster');
    });
  }, [session?.class_id]);

  const handleStartSession = async () => {
    const input = classNo.trim();
    if (!input) {
      setError('Please enter a class number');
      return;
    }

    setLoadingSession(true);
    setError(null);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('start-session', {
        body: {
          class_no: input,
          expires_in_minutes: 5,
        },
      });

      if (functionError) {
        console.error('start-session error', { data, functionError });
        const serverMessage = (data as any)?.error;
        throw new Error(serverMessage || functionError.message || 'Failed to start session');
      }

      if (!data || !data.session_id) {
        throw new Error(data?.error || 'Invalid response from start-session');
      }

      const freshSession = await fetchSessionRecord(data.session_id);
      setSession({ ...freshSession, status: freshSession.status ?? 'ACTIVE' });

      await loadRosterAndAttendance(freshSession, input);
    } catch (err: any) {
      console.error('Failed to start session', err);
      setSession(null);
      setStudents([]);
      setAttendance([]);
      setError(err.message || 'Failed to start session');
    } finally {
      setLoadingSession(false);
    }
  };

  // Faculty portal should NOT insert or update attendance rows.
  // Status is derived from attendance_marks inserted by student scans.

  const handleSubmit = async () => {
    if (!session || !user) return;

    setSubmitting(true);
    setError(null);

    try {
      const { data, error: submitError } = await supabase.functions.invoke('submit-approval', {
        body: { session_id: session.id },
      });

      if (submitError) {
        console.error('submit-approval error', { data, submitError });
        const serverMessage = (data as any)?.error;
        throw new Error(serverMessage || submitError.message || 'Failed to submit for approval');
      }

      const updatedSession = await fetchSessionRecord(session.id);
      setSession(updatedSession);
      await loadRosterAndAttendance(updatedSession, classNo.trim() || undefined);
      showToast('success', 'Attendance submitted for HOD approval');
    } catch (err: any) {
      console.error('Submit failed', err);
      setError(err.message || 'Failed to submit attendance');
      showToast('error', err.message || 'Failed to submit attendance');
    } finally {
      setSubmitting(false);
      setConfirmSubmitOpen(false);
    }
  };

  const handleReset = () => {
    setSession(null);
    setStudents([]);
    setAttendance([]);
    setClassNo('');
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {confirmSubmitOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold">
                !
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-gray-900">Submit attendance for HOD approval?</h2>
                <p className="text-sm text-gray-600 mt-1">
                  This will lock this session. Absentees are calculated automatically from students who did not scan.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <span>Class</span>
                <span className="font-semibold">{classNo || '—'}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>Present</span>
                <span className="font-semibold text-green-700">{presentCount}</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span>Not Marked</span>
                <span className="font-semibold text-gray-700">{notMarkedCount}</span>
              </div>
              <div className="flex items-center justify-between mt-2 pt-2 border-t">
                <span>Total students</span>
                <span className="font-semibold">{roster.length}</span>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmSubmitOpen(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit to HOD'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Generate QR & Take Attendance</h1>
        <p className="text-gray-600">Start a live session, show the QR, and finish attendance before sending to HOD.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 text-red-800">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!session ? (
        <div className="bg-white rounded-xl shadow-sm border p-8">
          <h2 className="text-xl font-semibold mb-6">Start Attendance Session</h2>
          <div className="flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Class Number</label>
              <input
                type="text"
                value={classNo}
                onChange={(e) => setClassNo(e.target.value)}
                placeholder="e.g., 353"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loadingSession}
              />
            </div>
            <button
              onClick={handleStartSession}
              disabled={loadingSession || !classNo.trim()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              <Play className="w-5 h-5" />
              {loadingSession ? 'Starting...' : 'Start Session'}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  <span className="ml-2 font-medium">{formatDate(session.session_date || session.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Expires:</span>
                  <span className="ml-2 font-medium">{formatDate(session.expires_at)}</span>
                </div>
                <div>
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`ml-2 px-2 py-1 rounded text-xs font-semibold ${
                      (session.status ?? 'ACTIVE') === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : (session.status ?? '').includes('SUBMITTED')
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {session.status ?? 'ACTIVE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="text-lg font-semibold mb-4">QR Code</h3>
              <div className="bg-gray-50 rounded-lg p-6 text-center min-h-[300px] flex flex-col items-center justify-center">
                {(session.status ?? 'ACTIVE') === 'ACTIVE' ? (
                  <>
                    <div className="mb-4">
                      <QRCodeSVG value={session.qr_payload} size={256} level="H" includeMargin />
                    </div>
                    <p className="text-xs text-gray-500 mb-2">Payload:</p>
                    <p className="text-xs text-gray-400 font-mono break-all max-w-xs">{session.qr_payload}</p>
                    <p className="text-sm text-gray-600 mt-4">Students scan this QR to mark attendance</p>
                  </>
                ) : (
                  <div className="text-gray-400">Session locked</div>
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
                  <span className="font-bold text-gray-900">{roster.length}</span>
                </div>
              </div>
            </div>

            {(session.status ?? 'ACTIVE') === 'ACTIVE' ? (
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => setConfirmSubmitOpen(true)}
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
            ) : (
              <button
                onClick={handleReset}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Start New Session
              </button>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Class Roster</h3>
                  <p className="text-sm text-gray-500">Statuses update automatically as students scan.</p>
                  
                </div>
                {(session.status ?? 'ACTIVE') === 'ACTIVE' && (
                  <button
                    onClick={() =>
                      session &&
                      loadRosterAndAttendance(session, classNo.trim() || undefined).catch((err) => {
                        console.error('Refresh failed', err);
                        setError(err.message || 'Failed to refresh roster');
                      })
                    }
                    className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                )}
              </div>

              <div className="overflow-auto max-h-[520px]">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Reg No.</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Name</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Status</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-700">Marked At</th>
                      {(session.status ?? 'ACTIVE') === 'ACTIVE' && (
                        <th className="px-4 py-3 text-left font-semibold text-gray-700">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {roster.map((entry) => {
                      const currentStatus = entry.status;
                      const disabled = isLocked || submitting || activeUpdateId === entry.student.id;

                      return (
                        <tr key={entry.student.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">{entry.student.reg_number}</td>
                          <td className="px-4 py-3 text-gray-700">{entry.student.name}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
                                currentStatus === 'PRESENT'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {currentStatus === 'PRESENT' && <CheckCircle className="w-3 h-3" />}
                              {currentStatus === 'NOT_MARKED' && <Clock className="w-3 h-3" />}
                              {currentStatus.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {entry.marked_at ? formatDate(entry.marked_at) : '—'}
                          </td>
                          {(session.status ?? 'ACTIVE') === 'ACTIVE' && (
                            <td className="px-4 py-3">
                              {currentStatus === 'PRESENT' ? (
                                <button
                                  onClick={() => entry.attendanceId && clearAttendanceMark(entry.attendanceId, entry.student.id)}
                                  disabled={disabled}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <XCircle className="w-3 h-3" />
                                  Clear
                                </button>
                              ) : (
                                <button
                                  onClick={() => markStudentPresent(entry.student.id)}
                                  disabled={disabled}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-600 bg-green-50 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Mark Present
                                </button>
                              )}
                            </td>
                          )}
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