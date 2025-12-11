// src/components/admin/ContentModeration.tsx
import { useEffect, useState } from "react";
import { Shield, AlertTriangle, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

interface ModerationItem {
  id: string;
  user_id: string;
  content: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
}

export default function ContentModeration() {
  const { user, loading } = useAuth() as any;
  const navigate = useNavigate();

  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) navigate("/login", { replace: true });
  }, [loading, user, navigate]);

  // Fetch moderation items
  useEffect(() => {
    fetchItems();
  }, []);

  async function fetchItems() {
    setLoadingItems(true);

    try {
      // Try fetching moderation table if exists
      const { data, error } = await supabase
        .from("moderation_queue")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setItems(data ?? []);
    } catch (err) {
      console.warn("moderation_queue table missing — using fallback empty UI.");
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  }

  async function updateStatus(id: string, newStatus: "approved" | "rejected") {
    try {
      const { error } = await supabase
        .from("moderation_queue")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      fetchItems();
    } catch (err) {
      console.error("Failed to update moderation item:", err);
      alert("Error updating content.");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header ---------------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Content Moderation</h2>
          <p className="text-gray-600">Review and moderate user-submitted content</p>
        </div>
        <div className="bg-purple-50 p-3 rounded-lg">
          <Shield className="w-8 h-8 text-purple-600" />
        </div>
      </div>

      {/* Body ------------------------------------------------------------ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">

        {loadingItems ? (
          <p className="text-gray-500 text-center py-8">Loading content...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-10">
            <AlertTriangle className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No content to review</p>
            <p className="text-gray-400 text-sm mt-1">
              When users submit reports or posts, they will appear here.
            </p>
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li
                key={item.id}
                className="border-b pb-4 last:border-b-0 flex items-start gap-4"
              >
                <div className="flex-1">
                  <p className="text-gray-900 font-medium mb-1">
                    User: {item.user_id}
                  </p>
                  <p className="text-gray-700">{item.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(item.created_at).toLocaleString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStatus(item.id, "approved")}
                    className="px-3 py-1 rounded bg-green-600 text-white hover:bg-green-700 flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => updateStatus(item.id, "rejected")}
                    className="px-3 py-1 rounded bg-red-600 text-white hover:bg-red-700 flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
