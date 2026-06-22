import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

export function ProtectedRoute({ children, adminOnly = false }) {
    const { user, loading, isAdmin } = useAuth();

    if (loading) {
        return <div className="auth-loading">読み込み中...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !isAdmin) {
        return <Navigate to="/teacher/take-attendance" replace />;
    }

    return children;
}
