/**
 * Mobile scan API endpoint handler
 * Validates QR code value before marking attendance
 */

import { supabase } from './supabase';

/**
 * Handle mobile scan - validate QR code and mark attendance
 * Mobile app POSTs: { reg_number, name, class_no, qr_code_value, scanned_qr_data }
 */
export async function handleMobileScan(payload: {
  reg_number: string;
  name?: string;
  class_no: string;
  qr_code_value: string;
  scanned_qr_data: string;
}): Promise<{ success: boolean; message: string }> {
  try {
    // Validate: scanned_qr_data must match qr_code_value
    if (payload.scanned_qr_data !== payload.qr_code_value) {
      return {
        success: false,
        message: `Invalid QR code. Expected: ${payload.qr_code_value}, Got: ${payload.scanned_qr_data}`,
      };
    }

    // Find student by reg_number
    const { data: student } = await supabase
      .from('students')
      .select('id, name')
      .eq('reg_number', payload.reg_number)
      .maybeSingle();

    if (!student) {
      return {
        success: false,
        message: `Student ${payload.reg_number} not found`,
      };
    }

    // Find class by class_no
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .ilike('class_no', payload.class_no.trim())
      .limit(1)
      .maybeSingle();

    if (!classData) {
      return {
        success: false,
        message: `Class ${payload.class_no} not found`,
      };
    }

    // Find active session by qr_payload (which should match scanned_qr_data after validation)
    const { data: session } = await supabase
      .from('sessions')
      .select('id')
      .eq('qr_payload', payload.scanned_qr_data)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (!session) {
      return {
        success: false,
        message: `No active session found for this QR code`,
      };
    }

    // Check if student already marked for this session
    const { data: existing } = await supabase
      .from('attendance_marks')
      .select('id')
      .eq('session_id', session.id)
      .eq('student_id', student.id)
      .maybeSingle();

    if (existing) {
      return {
        success: true,
        message: `${student.name || student.reg_number} already marked present`,
      };
    }

    // Mark attendance
    const { error } = await supabase
      .from('attendance_marks')
      .insert([
        {
          student_id: student.id,
          class_id: classData.id,
          session_id: session.id,
          status: 'PRESENT',
        },
      ]);

    if (error) throw error;

    return {
      success: true,
      message: `Attendance marked for ${student.name || student.reg_number}`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error.message || 'Failed to mark attendance',
    };
  }
}

/**
 * Test function - simulate a student scanning
 */
export async function testScan(
  regNumber: string,
  name: string,
  classNo: string,
  qrPayload: string
): Promise<void> {
  const result = await handleMobileScan({
    reg_number: regNumber,
    name,
    class_no: classNo,
    qr_code_value: qrPayload,
    scanned_qr_data: qrPayload, // In test, assume QR is valid
  });
  console.log('Scan result:', result);
}
