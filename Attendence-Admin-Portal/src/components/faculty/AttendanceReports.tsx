import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

/**
 * AttendanceReports - Deprecated
 * Redirects to GenerateQRPage which is the real attendance system
 */
export default function AttendanceReports() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/faculty/generate-qr', { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center text-gray-500">
        <div className="animate-pulse mb-2">Redirecting...</div>
        <p className="text-sm">Taking you to Generate QR page</p>
      </div>
    </div>
  );
}
