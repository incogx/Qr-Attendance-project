// src/components/admin/NotificationCenter.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, CheckCircle, Info } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

interface Notification {
  id: string;
  message: string;
  type: "info" | "success" | "warning";
  created_at: string;
}

export default function NotificationCenter() {
  const { user, loading } = useAuth() as any;
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoadingNotifs(true);

    try {
      // If you ever add a "notifications" table in Supabase, just change this query
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setNotifications(data ?? []);
    } catch (err) {
      console.warn("Notifications table does not exist yet — using empty fallback.");
      setNotifications([]);
    } finally {
      setLoadingNotifs(false);
    }
  }

  function renderIcon(type: string) {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "info":
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  }

  return (
    <div className="space-y-6">

      {/* Page Heading */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Notifications</h2>
          <p className="text-gray-600">View recent system messages and updates</p>
        </div>

        <button
          onClick={fetchNotifications}
          className="px-4 py-2 rounded border border-gray-200 bg-white hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {/* Notifications Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        {loadingNotifs ? (
          <p className="text-gray-500 text-center py-6">Loading notifications...</p>
        ) : notifications.length === 0 ? (
          <div className="text-center py-10">
            <Bell className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No notifications yet</p>
            <p className="text-gray-400 text-sm mt-1">
              Notifications will appear here when the system sends updates.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {notifications.map((notif) => (
              <li
                key={notif.id}
                className="flex items-start gap-3 border-b pb-3 last:border-b-0"
              >
                <div>{renderIcon(notif.type)}</div>

                <div className="flex-1">
                  <p className="text-gray-800">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.created_at).toLocaleString()}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

      </div>
    </div>
  );
}
