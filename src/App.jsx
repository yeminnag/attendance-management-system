import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Login } from "./pages/Login.jsx";
import { Home } from "./pages/Home.jsx";
import { Layout } from "./components/Layout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AttendanceSessionProvider } from "./context/AttendanceSessionContext.jsx";

const TakeAttendance = lazy(() =>
    import("./pages/teacher/TakeAttendance.jsx").then((module) => ({
        default: module.TakeAttendance,
    }))
);
const ManageStudent = lazy(() =>
    import("./pages/teacher/ManageStudent.jsx").then((module) => ({
        default: module.ManageStudent,
    }))
);
const ManageCategory = lazy(() =>
    import("./pages/teacher/ManageCategory.jsx").then((module) => ({
        default: module.ManageCategory,
    }))
);
const ManageTeachers = lazy(() =>
    import("./pages/admin/ManageTeachers.jsx").then((module) => ({
        default: module.ManageTeachers,
    }))
);
const Messages = lazy(() =>
    import("./pages/Messages.jsx").then((module) => ({ default: module.Messages }))
);

function PageFallback() {
    return <div className="auth-loading">読み込み中...</div>;
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/*"
                        element={
                            <ProtectedRoute>
                                <AttendanceSessionProvider>
                                    <Layout>
                                        <Suspense fallback={<PageFallback />}>
                                            <Routes>
                                                <Route path="/" element={<Home />} />
                                                <Route path="/messages" element={<Messages />} />
                                                <Route
                                                    path="/teacher/take-attendance"
                                                    element={<TakeAttendance />}
                                                />
                                                <Route
                                                    path="/teacher/manage-category"
                                                    element={<ManageCategory />}
                                                />
                                                <Route
                                                    path="/teacher/manage-student"
                                                    element={<ManageStudent />}
                                                />
                                                <Route
                                                    path="/admin/teachers"
                                                    element={
                                                        <ProtectedRoute adminOnly>
                                                            <ManageTeachers />
                                                        </ProtectedRoute>
                                                    }
                                                />
                                                <Route
                                                    path="*"
                                                    element={
                                                        <Navigate to="/teacher/take-attendance" replace />
                                                    }
                                                />
                                            </Routes>
                                        </Suspense>
                                    </Layout>
                                </AttendanceSessionProvider>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
