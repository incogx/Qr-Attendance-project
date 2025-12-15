import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminPortal from "./pages/AdminPortal";
import HodPortal from "./pages/HodPortal";
import FacultyPortal from "./pages/FacultyPortal";
import DebugApprovals from "./pages/DebugApprovals";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import RedirectToRole from "./components/RedirectToRole";
import LoginForm from "./components/Auth/LoginForm";
import { AuthProvider } from "./contexts/AuthContext";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <RedirectToRole />
        <Routes>
          <Route path="/" element={<RedirectToRole />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/debug/approvals" element={<DebugApprovals />} />
          <Route path="/admin/*" element={<AdminPortal />} />
          <Route path="/hod/*" element={<HodPortal />} />
          <Route path="/faculty/*" element={<FacultyPortal />} />
          <Route path="/no-access" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1><p className="text-gray-600">You don't have permission to access this page.</p></div></div>} />
          <Route path="*" element={<div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-3xl font-bold text-gray-900 mb-2">Page Not Found</h1><p className="text-gray-600">The page you're looking for doesn't exist.</p></div></div>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
