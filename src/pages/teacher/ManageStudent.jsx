import { useState, useEffect } from "react";
import "@/App.css";
import "../../styles/teacher/manage-student.css";
import "../../styles/teacher/manage-category.css";
import { useAuth } from "@/context/AuthContext.jsx";
import { fetchSubjectNames } from "@/utils/subjectFunctions.js";
import { fetchAllStudents } from "@/utils/studentFunctions.js";
import { ManageStudentHeader } from "./headers/ManageStudentHeader.jsx";
import { AddStudentPanel } from "./panels/AddStudentPanel.jsx";
import { EditStudentPanel } from "./panels/EditStudentPanel.jsx";
import { StudentListPanel } from "./panels/StudentListPanel.jsx";
import { StudentDetailPanel } from "./panels/StudentDetailPanel.jsx";

export function ManageStudent() {
    const { isAdmin, subjectIds } = useAuth();
    const [fetchSubject, setFetchSubject] = useState([]);
    const [fetchStudent, setFetchStudent] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState();
    const [showModal, setShowModal] = useState(false);
    const [editStudent, setEditStudent] = useState(null);
    const [editStudentSubjects, setEditStudentSubjects] = useState([]);

    useEffect(() => {
        loadStudents();
        loadSubjects();
    }, []);

    async function loadStudents() {
        const { data, error } = await fetchAllStudents();
        if (error) return alert(error.message);
        setFetchStudent(data);
        if (data.length > 0) setSelectedStudent(data[0]);
    }

    async function loadSubjects() {
        const { data, error } = await fetchSubjectNames();
        if (error) return alert(error.message);
        setFetchSubject(data);
    }

    return (
        <>
            <EditStudentPanel
                setEditStudent={setEditStudent}
                editStudent={editStudent}
                fetchSubject={fetchSubject}
                editStudentSubjects={editStudentSubjects}
                setEditStudentSubjects={setEditStudentSubjects}
                fetchStudents={loadStudents}
                isAdmin={isAdmin}
                subjectIds={subjectIds}
            />
            {isAdmin && (
                <AddStudentPanel
                    showModal={showModal}
                    fetchSubject={fetchSubject}
                    setShowModal={setShowModal}
                    fetchStudents={loadStudents}
                />
            )}

            <ManageStudentHeader setShowModal={setShowModal} isAdmin={isAdmin} />
            <div className="manage-student-container">
                <StudentListPanel
                    fetchStudent={fetchStudent}
                    fetchStudents={loadStudents}
                    selectedStudent={selectedStudent}
                    setSelectedStudent={setSelectedStudent}
                    setEditStudentSubjects={setEditStudentSubjects}
                    setEditStudent={setEditStudent}
                    isAdmin={isAdmin}
                    subjectIds={subjectIds}
                />
                <StudentDetailPanel selectedStudent={selectedStudent} />
            </div>
        </>
    );
}
