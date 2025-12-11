/**
 * Attendance service for live QR session management
 * Updated to match new schema: students, sessions, classes, attendance
 */

import { supabase } from './supabase';

export interface Student {
  id: string;
  reg_number: string;
  email?: string;
  name?: string;
  roll_number?: string;
  class_no?: string;
  department?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  session_id: string;
  marked_at: string;
  status?: 'PRESENT' | 'ABSENT';
  students?: {
    reg_number: string;
    name: string;
  };
}

export interface Session {
  id: string;
  class_id: string;
  qr_payload: string;
  session_date: string;
  start_time?: string;
  end_time?: string;
  expires_at?: string;
  status: 'ACTIVE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
}

export interface ClassInfo {
  id: string;
  class_no: string;
  code?: string;
  name?: string;
  faculty_id?: string;
  instructor_name?: string;
  department?: string;
}

/**
 * Start a new attendance session
 */
export async function startSession(
  classId: string,
  qrPayload: string
): Promise<Session> {
  const { data, error } = await supabase
    .from('sessions')
    .insert([
      {
        class_id: classId,
        qr_payload: qrPayload,
        status: 'ACTIVE',
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all students for a class
 */
export async function getClassStudents(classNo: string): Promise<Student[]> {
  console.log('Fetching students for class:', classNo);

  const { data, error } = await supabase
    .from('students')
    .select('id, reg_number, email, name, roll_number, class_no, department')
    .ilike('class_no', classNo.trim());

  console.log('Query result:', { data, error, count: data?.length });

  if (error) throw error;
  return data || [];
}

/**
 * Get class info
 */
export async function getClassInfo(classId: string): Promise<ClassInfo | null> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (error) {
    console.error('Failed to get class info:', error);
    return null;
  }
  return data;
}

/**
 * Get attendance records for a session with student details
 */
export async function getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance')
    .select(`
      *,
      students (
        reg_number,
        name
      )
    `)
    .eq('session_id', sessionId)
    .order('marked_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Toggle attendance status between PRESENT and ABSENT
 */
export async function toggleAttendanceStatus(
  attendanceId: string,
  newStatus: 'PRESENT' | 'ABSENT'
): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .update({ status: newStatus })
    .eq('id', attendanceId);

  if (error) throw error;
}

/**
 * Mark a student present
 */
export async function markStudentPresent(
  studentId: string,
  classId: string,
  sessionId: string
): Promise<void> {
  const { error } = await supabase
    .from('attendance')
    .insert([
      {
        student_id: studentId,
        class_id: classId,
        session_id: sessionId,
      },
    ]);

  if (error) {
    // If record already exists for this session, ignore
    if (error.code === '23505') {
      console.log('Student already marked present for this session');
      return;
    }
    throw error;
  }
}

/**
 * Get active session by QR payload
 */
export async function getSessionByQRPayload(qrPayload: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('qr_payload', qrPayload)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Get active session for a class
 */
export async function getActiveSessionForClass(classId: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('class_id', classId)
    .eq('status', 'ACTIVE')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/**
 * Submit session for HOD approval
 */
export async function submitSessionForApproval(
  sessionId: string,
  facultyId: string
): Promise<void> {
  console.log('Submitting session for approval:', { sessionId, facultyId });

  // Update session status to SUBMITTED
  const { error: sessionError } = await supabase
    .from('sessions')
    .update({ 
      status: 'SUBMITTED', 
      end_time: new Date().toISOString().split('T')[1] 
    })
    .eq('id', sessionId);

  if (sessionError) {
    console.error('Error updating session:', sessionError);
    throw sessionError;
  }

  console.log('Session updated to SUBMITTED');

  // Create approval request
  const { data: approvalData, error: approvalError } = await supabase
    .from('approvals')
    .insert([{
      session_id: sessionId,
      submitted_by: facultyId,
      status: 'PENDING',
    }])
    .select();

  if (approvalError) {
    console.error('Error creating approval:', approvalError);
    throw approvalError;
  }

  console.log('Approval created:', approvalData);
}

/**
 * Get pending approvals for HOD
 */
export async function getPendingApprovals(): Promise<any[]> {
  console.log('[getPendingApprovals] Starting fetch...');
  
  // First, check if approvals exist at all (without RLS filtering)
  const { data: allApprovals, error: allError } = await supabase
    .from('approvals')
    .select('*');
  
  console.log('[getPendingApprovals] Raw approvals count:', allApprovals?.length || 0, 'Error:', allError?.message);

  if (allError) {
    console.error('[getPendingApprovals] Error fetching raw approvals:', allError);
  }

  // Then fetch with joins and PENDING filter
  const { data, error } = await supabase
    .from('approvals')
    .select(`
      id,
      session_id,
      submitted_at,
      status,
      comments,
      sessions!inner (
        id,
        session_date,
        start_time,
        qr_payload,
        classes!inner (
          class_no,
          name,
          instructor_name
        )
      )
    `)
    .eq('status', 'PENDING')
    .order('submitted_at', { ascending: false });

  console.log('[getPendingApprovals] Pending with joins:', data?.length || 0, 'Error:', error?.message);

  if (error) {
    console.error('[getPendingApprovals] Error with joins:', error);
    throw error;
  }
  
  if (data && data.length > 0) {
    console.log('[getPendingApprovals] Sample approval:', data[0]);
  }

  return data || [];
}

/**
 * Approve or reject attendance session
 */
export async function reviewApproval(
  approvalId: string,
  hodId: string,
  status: 'APPROVED' | 'REJECTED',
  comments?: string
): Promise<void> {
  // Update approval record
  const { error: approvalError } = await supabase
    .from('approvals')
    .update({
      status,
      reviewed_by: hodId,
      reviewed_at: new Date().toISOString(),
      comments: comments || null,
    })
    .eq('id', approvalId);

  if (approvalError) throw approvalError;

  // Update session status
  const { data: approval } = await supabase
    .from('approvals')
    .select('session_id')
    .eq('id', approvalId)
    .single();

  if (approval) {
    const { error: sessionError } = await supabase
      .from('sessions')
      .update({ status })
      .eq('id', approval.session_id);

    if (sessionError) throw sessionError;
  }
}

/**
 * Get student by reg number
 */
export async function getStudentByRegNumber(regNumber: string): Promise<Student | null> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('reg_number', regNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
}

