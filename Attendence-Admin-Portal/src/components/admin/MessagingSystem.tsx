import { useState, useEffect } from "react";
import { Send, MessageSquare, Users, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

type StudentWithPhone = { 
  id: string; 
  name: string; 
  reg_number: string; 
  class_no: string;
  phone?: string;
};

type MessageStatus = {
  studentId: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  message?: string;
};

/* Function to get absent students from approved sessions */
async function getAbsentStudents(): Promise<StudentWithPhone[]> {
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

    // Get all absent students from these sessions with phone numbers
    const sessionIds = approvals.map((a: any) => a.session_id);
    
    const { data: absentAttendance, error: attendanceError } = await supabase
      .from('attendance_marks')
      .select(`
        student_id,
        session_id,
        students (
          id,
          name,
          reg_number,
          phone
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
          phone: att.students.phone || '',
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
  const [absentStudents, setAbsentStudents] = useState<StudentWithPhone[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [sendingPhoneNumber, setSendingPhoneNumber] = useState('');
  const [showPhonePrompt, setShowPhonePrompt] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState<Map<string, MessageStatus>>(new Map());

  const handleSendMessages = async () => {
    if (!message.trim() || selectedStudents.length === 0) {
      alert('Please enter a message and select at least one student');
      return;
    }

    setShowPhonePrompt(true);
  };

  const proceedWithSending = async () => {
    if (!sendingPhoneNumber.trim()) {
      alert('Please enter the phone number to send messages from');
      return;
    }

    setShowPhonePrompt(false);
    setLoading(true);
    setMessageStatuses(new Map());

    try {
      let successCount = 0;
      let failureCount = 0;

      for (const studentId of selectedStudents) {
        const student = absentStudents.find(s => s.id === studentId);
        if (!student) continue;

        // Update status to sending
        setMessageStatuses(prev => {
          const updated = new Map(prev);
          updated.set(studentId, {
            studentId,
            status: 'sending',
            message: `Sending to ${student.name}...`
          });
          return updated;
        });

        try {
          // Simulate message sending (replace with real SMS/WhatsApp API later)
          await new Promise(r => setTimeout(r, 800));

          // Update status to sent
          setMessageStatuses(prev => {
            const updated = new Map(prev);
            updated.set(studentId, {
              studentId,
              status: 'sent',
              message: `✓ Message sent to ${student.name}`
            });
            return updated;
          });
          successCount++;
        } catch (error) {
          // Update status to failed
          setMessageStatuses(prev => {
            const updated = new Map(prev);
            updated.set(studentId, {
              studentId,
              status: 'failed',
              message: `✗ Failed to send to ${student.name}`
            });
            return updated;
          });
          failureCount++;
        }
      }

      // Show final summary
      setTimeout(() => {
        alert(`Messages processed!\nSent: ${successCount}\nFailed: ${failureCount}`);
        setMessage('');
        setSelectedStudents([]);
        setSendingPhoneNumber('');
        setMessageStatuses(new Map());
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

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

  // Load absent students on mount
  useEffect(() => {
    loadAbsentStudents();
  }, []);

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

          {/* Message Status Display */}
          {messageStatuses.size > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="font-medium text-slate-900 mb-3">Sending Status</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {Array.from(messageStatuses.values()).map((status) => (
                  <div key={status.studentId} className="flex items-center gap-2 text-sm">
                    {status.status === 'sending' && (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                        <span className="text-blue-600">{status.message}</span>
                      </>
                    )}
                    {status.status === 'sent' && (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">{status.message}</span>
                      </>
                    )}
                    {status.status === 'failed' && (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <span className="text-red-600">{status.message}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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
                    {student.phone && (
                      <div className="text-xs text-slate-400 mt-1">
                        📱 {student.phone}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Phone Number Prompt Modal */}
      {showPhonePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg p-6 w-[min(500px,94%)] shadow-xl">
            <h2 className="text-lg font-semibold mb-4">Enter Phone Number</h2>
            <p className="text-sm text-slate-600 mb-4">
              Which phone number should we send these messages from?
            </p>
            
            <input
              type="tel"
              value={sendingPhoneNumber}
              onChange={(e) => setSendingPhoneNumber(e.target.value)}
              placeholder="e.g., +91 9876543210 or your service number"
              className="w-full px-4 py-2 border rounded-lg mb-4 text-sm"
              autoFocus
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowPhonePrompt(false);
                  setSendingPhoneNumber('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={proceedWithSending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Messages
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
