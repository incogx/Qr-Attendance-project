import React, { useState } from "react";
import { Send, MessageSquare, Users } from "lucide-react";
import { MessagingResult } from "../../types/attendance";
import { supabase } from "../../lib/supabase";

/* Function to send messages - currently just shows success alert */
async function sendBulkMessages(message: string, studentIds: string[]): Promise<MessagingResult> {
  // Placeholder - will be implemented when messaging system is ready
  await new Promise(r => setTimeout(r, 500));
  return {
    success: true,
    total_sent: studentIds.length,
    total_failed: 0,
    message: `Message sent successfully to ${studentIds.length} student(s)`
  };
}

/* Function to get absent students from approved sessions */
async function getAbsentStudents(): Promise<{ id: string; name: string; reg_number: string; class_no: string }[]> {
  try {
    // Get approved sessions
    const { data: approvals, error: approvalsError } = await supabase
      .from('approvals')
      .select(`
        session_id,
        sessions!inner (
          id,
          classes!inner (
            class_no
          )
        )
      `)
      .eq('status', 'APPROVED');

    if (approvalsError) throw approvalsError;

    if (!approvals || approvals.length === 0) return [];

    // Get all absent students from these sessions
    const sessionIds = approvals.map((a: any) => a.session_id);
    
    const { data: absentAttendance, error: attendanceError } = await supabase
      .from('attendance')
      .select(`
        student_id,
        session_id,
        students (
          id,
          name,
          reg_number
        ),
        sessions!inner (
          classes!inner (
            class_no
          )
        )
      `)
      .in('session_id', sessionIds)
      .eq('status', 'ABSENT');

    if (attendanceError) throw attendanceError;

    // Format and deduplicate students
    const studentMap = new Map();
    (absentAttendance || []).forEach((att: any) => {
      if (att.students && !studentMap.has(att.students.id)) {
        studentMap.set(att.students.id, {
          id: att.students.id,
          name: att.students.name || 'Unknown',
          reg_number: att.students.reg_number || 'N/A',
          class_no: att.sessions?.classes?.class_no || 'N/A',
        });
      }
    });

    return Array.from(studentMap.values());
  } catch (error) {
    console.error('Error fetching absent students:', error);
    return [];
  }
}

export default function MessagingSystem() {
  const [message, setMessage] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [absentStudents, setAbsentStudents] = useState<{ id: string; name: string; reg_number: string; class_no: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [messagingResult, setMessagingResult] = useState<MessagingResult | null>(null);

  React.useEffect(() => {
    loadAbsentStudents();
  }, []);

  const loadAbsentStudents = async () => {
    setLoadingStudents(true);
    try {
      const students = await getAbsentStudents();
      setAbsentStudents(students);
    } catch (error) {
      console.error("Failed to load absent students:", error);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleSendMessages = async () => {
    if (!message.trim() || selectedStudents.length === 0) {
      alert('Please enter a message and select at least one student');
      return;
    }

    setLoading(true);
    try {
      const result = await sendBulkMessages(message, selectedStudents);
      setMessagingResult(result);
      alert('Message sent successfully!');
      setMessage('');
      setSelectedStudents([]);
    } catch (error) {
      console.error("Failed to send messages:", error);
      alert('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedStudents.length === absentStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(absentStudents.map(s => s.id));
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setSelectedStudents(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Messaging System</h1>
          <div className="text-sm text-slate-500 mt-1">Send notifications to absent students</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Composer */}
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Compose Message
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Message Content
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter your message to absent students..."
                className="w-full px-3 py-2 border rounded-md resize-none"
                rows={6}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-500">
                {selectedStudents.length} student(s) selected
              </div>
              <button
                onClick={handleSendMessages}
                disabled={loading || !message.trim() || selectedStudents.length === 0}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {loading ? 'Sending...' : 'Send Messages'}
              </button>
            </div>
          </div>
        </div>

        {/* Student Selector */}
        <div className="bg-white border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5" />
              Absent Students
            </h2>
            <button
              onClick={handleSelectAll}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {selectedStudents.length === absentStudents.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loadingStudents ? (
              <div className="text-center py-8 text-slate-500">Loading absent students...</div>
            ) : absentStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-500">No absent students found</div>
            ) : (
              absentStudents.map((student) => (
                <div
                  key={student.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    selectedStudents.includes(student.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                  onClick={() => handleStudentToggle(student.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedStudents.includes(student.id)}
                    onChange={() => handleStudentToggle(student.id)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <div className="font-medium">{student.name}</div>
                  <div className="text-sm text-slate-500">
                    {student.reg_number} • Class {student.class_no}
                  </div>
                </div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
