export type AttendanceStatus =
  | 'DRAFT'
  | 'SUBMITTED_TO_HOD'
  | 'CHANGES_REQUESTED'
  | 'HOD_APPROVED'
  | 'SENT_TO_ADMIN'
  | 'ADMIN_FINALIZED';

export type UserRole = 'ADMIN' | 'HOD' | 'FACULTY' | 'STUDENT';

export interface AttendanceReport {
  id: string;
  faculty_id: string;
  department_id: string;
  class_id: string;
  date: string; // YYYY-MM-DD
  semester: string;
  status: AttendanceStatus;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  approved_at?: string;
  finalized_at?: string;
  hod_comments?: string;
  admin_comments?: string;
}

export interface AttendanceEntry {
  id: string;
  report_id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  present: boolean;
  marked_at?: string;
}

export interface FacultyRequest {
  id: string;
  requested_by_hod_id: string;
  full_name: string;
  email: string;
  department: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  created_at: string;
  approved_at?: string;
}

export interface MessagingResult {
  student_id: string;
  success: boolean;
  message: string;
  sent_at: string;
}
