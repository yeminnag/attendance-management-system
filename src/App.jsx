import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { TakeAttendance } from "./pages/teacher/TakeAttendance.jsx";
import { ManageStudent } from "./pages/teacher/ManageStudent.jsx";
import { ManageCategory } from "./pages/teacher/ManageCategory.jsx";
import { ManageTeachers } from "./pages/admin/ManageTeachers.jsx";
import { Home } from "./pages/Home.jsx";
import { Login } from "./pages/Login.jsx";
import { Messages } from "./pages/Messages.jsx";
import { Layout } from "./components/Layout.jsx";
import { ProtectedRoute } from "./components/ProtectedRoute.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AttendanceSessionProvider } from "./context/AttendanceSessionContext.jsx";
import { TrainDelayProvider } from "./context/TrainDelayContext.jsx";

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
                                    <TrainDelayProvider>
                                        <Layout>
                                            <Routes>
                                                <Route path="/" element={<Home />} />
                                                <Route path="/messages" element={<Messages />} />
                                                <Route path="/teacher/take-attendance" element={<TakeAttendance />} />
                                                <Route path="/teacher/manage-category" element={<ManageCategory />} />
                                                <Route path="/teacher/manage-student" element={<ManageStudent />} />
                                                <Route
                                                    path="/admin/teachers"
                                                    element={
                                                        <ProtectedRoute adminOnly>
                                                            <ManageTeachers />
                                                        </ProtectedRoute>
                                                    }
                                                />
                                                <Route path="*" element={<Navigate to="/teacher/take-attendance" replace />} />
                                            </Routes>
                                        </Layout>
                                    </TrainDelayProvider>
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
