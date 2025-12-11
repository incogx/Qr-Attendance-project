import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { submitSessionForApproval, getPendingApprovals } from '../lib/attendanceService';

export default function DebugApprovals() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    // Get current user
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    setUser(currentUser);

    if (currentUser) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      setProfile(profileData);
    }

    // Get all sessions
    const { data: sessionsData } = await supabase
      .from('sessions')
      .select('*, classes(*)')
      .order('created_at', { ascending: false })
      .limit(10);
    setSessions(sessionsData || []);

    // Get all approvals
    const { data: approvalsData } = await supabase
      .from('approvals')
      .select('*')
      .order('submitted_at', { ascending: false });
    setApprovals(approvalsData || []);
  }

  async function testSubmit(sessionId: string) {
    if (!user) {
      alert('Not logged in');
      return;
    }
    try {
      await submitSessionForApproval(sessionId, user.id);
      alert('Submitted successfully!');
      loadData();
    } catch (err: any) {
      alert('Error: ' + err.message);
      console.error(err);
    }
  }

  async function testFetch() {
    try {
      const data = await getPendingApprovals();
      console.log('Pending approvals:', data);
      alert(`Found ${data.length} pending approvals. Check console for details.`);
    } catch (err: any) {
      alert('Error: ' + err.message);
      console.error(err);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Debug: Approval Workflow</h1>

      {/* User Info */}
      <div className="bg-blue-50 p-4 rounded mb-4">
        <h2 className="font-semibold">Current User</h2>
        <p>ID: {user?.id}</p>
        <p>Email: {user?.email}</p>
        <p>Role: {profile?.role}</p>
      </div>

      {/* Test Buttons */}
      <div className="bg-gray-50 p-4 rounded mb-4">
        <button
          onClick={testFetch}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Fetch Pending Approvals (Check Console)
        </button>
      </div>

      {/* Sessions */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-2">Recent Sessions</h2>
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Class</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Date</th>
                <th className="border p-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td className="border p-2 text-xs">{session.id.slice(0, 8)}</td>
                  <td className="border p-2">{(session.classes as any)?.class_no}</td>
                  <td className="border p-2">
                    <span className={`px-2 py-1 rounded text-xs ${
                      session.status === 'ACTIVE' ? 'bg-green-100' :
                      session.status === 'SUBMITTED' ? 'bg-yellow-100' :
                      'bg-gray-100'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td className="border p-2 text-sm">{session.session_date}</td>
                  <td className="border p-2">
                    {session.status === 'ACTIVE' && (
                      <button
                        onClick={() => testSubmit(session.id)}
                        className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                      >
                        Submit for Approval
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approvals */}
      <div>
        <h2 className="text-xl font-bold mb-2">All Approvals</h2>
        <div className="overflow-x-auto">
          <table className="w-full border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">ID</th>
                <th className="border p-2">Session ID</th>
                <th className="border p-2">Status</th>
                <th className="border p-2">Submitted By</th>
                <th className="border p-2">Submitted At</th>
              </tr>
            </thead>
            <tbody>
              {approvals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="border p-4 text-center text-gray-500">
                    No approvals found
                  </td>
                </tr>
              ) : (
                approvals.map((approval) => (
                  <tr key={approval.id}>
                    <td className="border p-2 text-xs">{approval.id.slice(0, 8)}</td>
                    <td className="border p-2 text-xs">{approval.session_id.slice(0, 8)}</td>
                    <td className="border p-2">
                      <span className={`px-2 py-1 rounded text-xs ${
                        approval.status === 'PENDING' ? 'bg-yellow-100' :
                        approval.status === 'APPROVED' ? 'bg-green-100' :
                        'bg-red-100'
                      }`}>
                        {approval.status}
                      </span>
                    </td>
                    <td className="border p-2 text-xs">{approval.submitted_by?.slice(0, 8)}</td>
                    <td className="border p-2 text-sm">{new Date(approval.submitted_at).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
