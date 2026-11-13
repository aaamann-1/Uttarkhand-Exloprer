import { Navigate } from "react-router-dom";
import { useAdminSession } from "../../services/adminAuth";

export default function ProtectedRoute({ children }) {
  const { loggedIn, loading } = useAdminSession();
  if (loading) return <div className="min-h-screen bg-ink-950 flex items-center justify-center text-mist-400 font-body text-sm">Checking admin session…</div>;
  if (!loggedIn) return <Navigate to="/admin/login" replace />;
  return children;
}
