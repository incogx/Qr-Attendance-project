import { useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { User, Mail, Calendar, Book } from "lucide-react";

export default function ProfilePage() {
  const { user, profile, loading } = useAuth() as any;
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }
  }, [loading, user, navigate]);

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  const role = profile?.role || "Unknown";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile</h2>
        <p className="text-gray-600">View your account information</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Header with gradient */}
        <div className="h-32 bg-gradient-to-r from-purple-600 to-purple-500"></div>

        {/* Content */}
        <div className="px-6 pb-6">
          {/* Avatar and Name */}
          <div className="flex items-end gap-4 -mt-16 mb-6">
            <div
              className="w-32 h-32 rounded-full ring-4 ring-white flex items-center justify-center flex-shrink-0"
              style={{
                fontSize: "52px",
                background:
                  "linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(139,92,246,1) 100%)",
                color: "white",
              }}
            >
              {(profile?.full_name || user?.email || "U")
                .split(" ")
                .map((n: string) => n[0]?.toUpperCase())
                .join("")}
            </div>
            <div className="pb-4">
              <h1 className="text-2xl font-bold text-gray-900">
                {profile?.full_name || user?.email || "User"}
              </h1>
              <p className="text-gray-600">{role}</p>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {/* Email */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Email</p>
                <p className="text-gray-900 font-medium break-all">
                  {user?.email || "N/A"}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Book className="w-6 h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Role</p>
                <p className="text-gray-900 font-medium">{role}</p>
              </div>
            </div>

            {/* Join Date */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Calendar className="w-6 h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">Account Created</p>
                <p className="text-gray-900 font-medium">{joinDate}</p>
              </div>
            </div>

            {/* User ID */}
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6 text-orange-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500">User ID</p>
                <p className="text-gray-900 font-medium text-sm font-mono break-all">
                  {user?.id?.slice(0, 12)}...
                </p>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t my-8"></div>

          {/* Additional Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Account Information</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Account Status</p>
                <p className="text-gray-900 font-medium mt-1">
                  <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                    Active
                  </span>
                </p>
              </div>

              <div>
                <p className="text-gray-500">Verification Status</p>
                <p className="text-gray-900 font-medium mt-1">
                  <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                    Verified
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
          >
            Go Back
          </button>
          <button
            onClick={() =>
              navigate(
                window.location.pathname.includes("/admin")
                  ? "/admin/settings"
                  : window.location.pathname.includes("/hod")
                    ? "/hod/settings"
                    : "/faculty/settings"
              )
            }
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
          >
            Edit Settings
          </button>
        </div>
      </div>
    </div>
  );
}
