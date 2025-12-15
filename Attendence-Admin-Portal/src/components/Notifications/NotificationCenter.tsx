// src/components/faculty/NotificationCenter.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle, XCircle, AlertCircle, Clock, Loader, Eye } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

interface SessionNotification {
  id: string;
  session_id: string;
  class_id: string;
  class_no: string;
  session_date: string;
  status: "APPROVED" | "REJECTED" | "SUBMITTED" | "PENDING";
  message: string;
  created_at: string;
  reason?: string;
}

export default function NotificationCenter() {
  const { user, loading } = useAuth() as any;
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<SessionNotification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  async function fetchNotifications() {
    setLoadingNotifs(true);
    setError(null);

    try {
      // Get sessions created by this faculty with approval status
      const { data: sessionsData, error: sessionError } = await supabase
        .from("sessions")
        .select("id, class_id, session_date, status, created_at, classes(class_no)")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (sessionError) {
        console.error("Session error:", sessionError);
        throw sessionError;
      }

      // Get approval records for these sessions (if table exists)
      const sessionIds = (sessionsData || []).map((s: any) => s.id);
      let approvalsData: any[] = [];

      if (sessionIds.length > 0) {
        try {
          const { data: approvals, error: approvalError } = await supabase
            .from("approvals")
            .select("id, session_id, status, comments, reviewed_at")
            .in("session_id", sessionIds)
            .order("reviewed_at", { ascending: false });

          if (approvalError) {
            console.warn("Approvals table not found or error:", approvalError.message);
          } else {
            approvalsData = approvals || [];
          }
        } catch (approvalErr) {
          console.warn("Could not fetch approvals:", approvalErr);
        }
      }

      // Map sessions to notifications
      const notifs = (sessionsData || []).map((session: any) => {
        const approval = approvalsData.find((a) => a.session_id === session.id);

        return {
          id: session.id,
          session_id: session.id,
          class_id: session.class_id,
          class_no: session.classes?.class_no || "Unknown",
          session_date: session.session_date,
          status: approval?.status || session.status || "PENDING",
          message:
            approval?.status === "APPROVED"
              ? `Attendance approved for ${session.classes?.class_no}`
              : approval?.status === "REJECTED"
                ? `Attendance rejected for ${session.classes?.class_no}`
                : `Attendance submitted for approval - ${session.classes?.class_no}`,
          created_at: approval?.reviewed_at || session.created_at,
          reason: approval?.comments,
        };
      });

      setNotifications(notifs);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      setError("Failed to load notifications. Please try again.");
      setNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  }

  function renderIcon(status: string) {
    switch (status) {
      case "APPROVED":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "REJECTED":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "SUBMITTED":
        return <Clock className="w-5 h-5 text-yellow-600" />;
      default:
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case "APPROVED":
        return "bg-green-50 border-green-200 text-green-800";
      case "REJECTED":
        return "bg-red-50 border-red-200 text-red-800";
      case "SUBMITTED":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-blue-50 border-blue-200 text-blue-800";
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h2>
          <p className="text-gray-600">
            Attendance approval status and system updates
          </p>
        </div>

        <button
          onClick={fetchNotifications}
          className="flex items-center gap-2 px-4 py-2 rounded border border-gray-200 bg-white hover:bg-gray-50"
        >
          {loadingNotifs ? (
            <>
              <Loader className="w-4 h-4 animate-spin" />
              Loading...
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Refresh
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Notifications Container */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loadingNotifs && notifications.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-6 h-6 animate-spin text-blue-600 mr-3" />
            <p className="text-gray-500">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Attendance approval updates will appear here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-6 border-l-4 ${getStatusColor(notif.status)}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {renderIcon(notif.status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900">
                          {notif.class_no}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            notif.status === "APPROVED"
                              ? "bg-green-100 text-green-800"
                              : notif.status === "REJECTED"
                                ? "bg-red-100 text-red-800"
                                : notif.status === "SUBMITTED"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {notif.status}
                        </span>
                      </div>

                      <p className="text-gray-700 mt-2">{notif.message}</p>

                      {notif.reason && (
                        <p className="text-gray-600 text-sm mt-2">
                          <strong>Reason:</strong> {notif.reason}
                        </p>
                      )}

                      <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                        <span>
                          Date: {new Date(notif.session_date).toLocaleDateString()}
                        </span>
                        <span>
                          {new Date(notif.created_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      navigate(`/faculty/attendance/${notif.session_id}`)
                    }
                    className="flex-shrink-0 px-3 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm flex items-center gap-2 whitespace-nowrap"
                  >
                    <Eye className="w-4 h-4" />
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Stats */}
      {notifications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700 text-sm">Approved</p>
            <p className="text-2xl font-bold text-green-900 mt-2">
              {
                notifications.filter((n) => n.status === "APPROVED")
                  .length
              }
            </p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-sm">Rejected</p>
            <p className="text-2xl font-bold text-red-900 mt-2">
              {
                notifications.filter((n) => n.status === "REJECTED")
                  .length
              }
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-700 text-sm">Pending</p>
            <p className="text-2xl font-bold text-yellow-900 mt-2">
              {
                notifications.filter((n) => n.status === "SUBMITTED")
                  .length
              }
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-700 text-sm">Total</p>
            <p className="text-2xl font-bold text-blue-900 mt-2">
              {notifications.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
