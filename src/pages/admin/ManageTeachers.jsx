import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "../../../supabase.js";
import "@/styles/teacher/manage-category.css";
import { fetchSubjectNames } from "@/utils/subjectFunctions.js";
import { fetchTeachers } from "@/utils/teacherFunctions.js";
import { ManageTeachersHeader } from "./headers/ManageTeachersHeader.jsx";
import { AddTeacherPanel } from "./panels/AddTeacherPanel.jsx";
import { EditTeacherPanel } from "./panels/EditTeacherPanel.jsx";
import { TeacherAnalyticsPanel } from "./panels/TeacherAnalyticsPanel.jsx";
import { TeacherTable } from "./tables/TeacherTable.jsx";

export function ManageTeachers() {
    const location = useLocation();
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [studentSubjects, setStudentSubjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editTeacher, setEditTeacher] = useState(null);
    const [analyticsTeacher, setAnalyticsTeacher] = useState(null);

    useEffect(() => {
        loadTeachers();
        loadSubjects();
        loadAnalyticsData();
    }, []);

    async function loadTeachers() {
        const { data, error } = await fetchTeachers();
        if (error) return alert(error.message);
        setTeachers(data);

        const openTeacherId = location.state?.openAnalyticsTeacherId;
        if (openTeacherId) {
            const teacher = (data ?? []).find((row) => row.id === openTeacherId);
            if (teacher) setAnalyticsTeacher(teacher);
        }
    }

    async function loadSubjects() {
        const { data, error } = await fetchSubjectNames();
        if (error) return alert(error.message);
        setSubjects(data);
    }

    async function loadAnalyticsData() {
        const [{ data: attendanceData }, { data: enrollmentData }] = await Promise.all([
            supabase.from("attendance").select("*"),
            supabase
                .from("student_subjects")
                .select("subject_id, students(id, name, student_number, email)"),
        ]);

        setAttendance(attendanceData ?? []);
        setStudentSubjects(enrollmentData ?? []);
    }

    return (
        <>
            <AddTeacherPanel
                showModal={showModal}
                setShowModal={setShowModal}
                subjects={subjects}
                fetchTeachers={loadTeachers}
            />
            <EditTeacherPanel
                editTeacher={editTeacher}
                setEditTeacher={setEditTeacher}
                subjects={subjects}
                fetchTeachers={loadTeachers}
            />
            <TeacherAnalyticsPanel
                teacher={analyticsTeacher}
                attendance={attendance}
                studentSubjects={studentSubjects}
                onClose={() => setAnalyticsTeacher(null)}
            />

            <div className="manage-category">
                <ManageTeachersHeader setShowModal={setShowModal} />
                <TeacherTable
                    teachers={teachers}
                    setEditTeacher={setEditTeacher}
                    setAnalyticsTeacher={setAnalyticsTeacher}
                    fetchTeachers={loadTeachers}
                />
            </div>
        </>
    );
}
