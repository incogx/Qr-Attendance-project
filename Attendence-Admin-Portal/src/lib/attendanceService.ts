/**
 * Attendance Service - Wrapper for Edge Functions
 * Uses ONLY Edge Functions from supabase/functions/
 * Database: sessions, students, classes, attendance_marks, approvals
 */

import { supabase } from './supabase';

/* ========================
   TYPE DEFINITIONS
======================== */

export interface Student {
  id: string;
  reg_number: string;
  name?: string;
  email?: string;
  department?: string;
  class_id?: string;
  class_no?: string;
}

export interface AttendanceRecord {
  id: string;
  student_id: string;
  class_id: string;
  session_id: string;
  status: 'PRESENT' | 'ABSENT';
  marked_at: string;
  students?: {
    reg_number: string;
    name: string;
  };
}

export interface Session {
  id: string;
  class_id: string;
  qr_payload: string;
  status: 'ACTIVE' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  session_date?: string;
  start_time?: string;
  end_time?: string;
  expires_at?: string;
  created_at: string;
  created_by?: string;
}

export interface ClassInfo {
  id: string;
  class_no: string;
  department?: string;
}

export interface RosterItem {
  student: {
    id: string;
    reg_number: string;
    name?: string | null;
  };
  attendanceId?: string;
  status: 'PRESENT' | 'NOT_MARKED';
  marked_at?: string | null;
}

/* ========================
   EDGE FUNCTION WRAPPERS
======================== */

/**
 * Start a new attendance session via Edge Function
 * Calls: supabase/functions/start-session
 */
export async function startSession(
  classId: string,
  qrPayload: string
): Promise<Session> {
  // Get class_no from class_id first
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('class_no')
    .eq('id', classId)
    .single();

  if (classError || !classData) {
    throw new Error('Class not found');
  }

  // Call start-session Edge Function
  const { data, error } = await supabase.functions.invoke('start-session', {
    body: {
      class_no: classData.class_no,
      expires_in_minutes: 5,
    },
  });

  if (error) {
    console.error('start-session error:', error);
    throw new Error(error.message || 'Failed to start session');
  }

  if (!data || !data.session_id) {
    throw new Error('Invalid response from start-session');
  }

  // Return the session data in expected format
  return {
    id: data.session_id,
    class_id: classId,
    qr_payload: data.qr_payload,
    status: 'ACTIVE',
    expires_at: data.expires_at,
    created_at: new Date().toISOString(),
  };
}

/* ========================
   DATABASE QUERIES
======================== */

/**
 * Get all students for a class by class_no
 */
export async function getClassStudents(classNo: string): Promise<Student[]> {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_no', classNo)
    .order('reg_number');

  if (error) throw error;
  return data || [];
}

/**
 * Get class info by class_id
 */
export async function getClassInfo(classId: string): Promise<ClassInfo | null> {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', classId)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get attendance records for a session with student details
 */
export async function getSessionAttendance(sessionId: string): Promise<AttendanceRecord[]> {
  const { data, error } = await supabase
    .from('attendance_marks')
    .select(`
      id,
      student_id,
      class_id,
      session_id,
      status,
      marked_at,
      students!attendance_marks_student_id_fkey (
        id,
        reg_number,
        name,
        email
      )
    `)
    .eq('session_id', sessionId)
    .order('marked_at', { ascending: false });

  if (error) {
    console.error('Error fetching session attendance:', error);
    throw error;
  }
  
  return data || [];
}

/**
 * Get full roster for a class with session status via LEFT JOIN semantics
 * Returns all students in the class; if a row exists in attendance_marks for the session,
 * status is PRESENT, else NOT_MARKED.
 */
export async function getRosterWithSessionStatus(
  classId: string,
  sessionId: string
): Promise<RosterItem[]> {
  const { data, error } = await supabase
    .from('students')
    .select(`
      id,
      reg_number,
      name,
      attendance_marks!left(
        id,
        session_id,
        status,
        marked_at
      )
    `)
    .eq('class_id', classId)
    .eq('attendance_marks.session_id', sessionId)
    .order('reg_number', { ascending: true });

  if (error) throw error;

  const rows = (data as any[]) || [];
  return rows.map((s) => {
    const mark = Array.isArray(s.attendance_marks) ? s.attendance_marks[0] : null;
    const isPresent = mark && mark.status === 'PRESENT';
    return {
      student: {
        id: s.id,
        reg_number: s.reg_number,
        name: s.name ?? null,
      },
      attendanceId: mark?.id,
      status: isPresent ? 'PRESENT' : 'NOT_MARKED',
      marked_at: mark?.marked_at ?? null,
    } as RosterItem;
  });
}

/**
 * Mark a student present manually (for faculty override)
 */
export async function markStudentPresent(
  studentId: string,
  classId: string,
  sessionId: string
): Promise<void> {
  // Check if already marked
  const { data: existing } = await supabase
    .from('attendance_marks')
    .select('id')
    .eq('student_id', studentId)
    .eq('session_id', sessionId)
    .maybeSingle();

  if (existing) {
    console.log('Student already marked present for this session');
    return;
  }

  const { error } = await supabase
    .from('attendance_marks')
    .insert([
      {
        student_id: studentId,
        class_id: classId,
        session_id: sessionId,
        status: 'PRESENT',
      },
    ]);

  if (error) throw error;
}

/**
 * Toggle attendance status between PRESENT and ABSENT
 */
export async function toggleAttendanceStatus(
  attendanceId: string,
  newStatus: 'PRESENT' | 'ABSENT'
): Promise<void> {
  const { error } = await supabase
    .from('attendance_marks')
    .update({ status: newStatus })
    .eq('id', attendanceId);

  if (error) throw error;
}

/**
 * Submit session for HOD approval
 */
export async function submitSessionForApproval(
  sessionId: string,
  facultyId: string
): Promise<void> {
  // Update session status to SUBMITTED
  const { error: sessionError } = await supabase
    .from('sessions')
    .update({ 
      status: 'SUBMITTED', 
      end_time: new Date().toISOString()
    })
    .eq('id', sessionId);

  if (sessionError) {
    console.error('Error updating session:', sessionError);
    throw sessionError;
  }

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

  console.log('Session submitted for approval:', approvalData);
}

/**
 * Get pending approvals for HOD
 */
export async function getPendingApprovals(): Promise<any[]> {
  const { data, error } = await supabase
    .from('approvals')
    .select(`
      *,
      sessions (
        id,
        class_id,
        session_date,
        start_time,
        end_time,
        classes (
          class_no,
          department
        )
      ),
      submitted_by_profile:profiles!submitted_by (
        full_name,
        email
      )
    `)
    .eq('status', 'PENDING')
    .order('submitted_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Approve or reject attendance session
 */
export async function reviewApproval(
  approvalId: string,
  reviewerId: string,
  status: 'APPROVED' | 'REJECTED',
  comments?: string
): Promise<void> {
  // Update approval
  const { error: approvalError } = await supabase
    .from('approvals')
    .update({
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      status,
      comments,
    })
    .eq('id', approvalId);

  if (approvalError) throw approvalError;

  // Get session_id
  const { data: approval } = await supabase
    .from('approvals')
    .select('session_id')
    .eq('id', approvalId)
    .single();

  if (!approval) throw new Error('Approval not found');

  // Update session status
  const { error: sessionError } = await supabase
    .from('sessions')
    .update({ status })
    .eq('id', approval.session_id);

  if (sessionError) throw sessionError;
}
