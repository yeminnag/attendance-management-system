import { useState, useEffect } from "react";
import "@/styles/teacher/manage-category.css";
import { fetchSubjectNames } from "@/utils/subjectFunctions.js";
import { fetchTeachers } from "@/utils/teacherFunctions.js";
import { ManageTeachersHeader } from "./headers/ManageTeachersHeader.jsx";
import { AddTeacherPanel } from "./panels/AddTeacherPanel.jsx";
import { EditTeacherPanel } from "./panels/EditTeacherPanel.jsx";
import { TeacherTable } from "./tables/TeacherTable.jsx";

export function ManageTeachers() {
    const [teachers, setTeachers] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editTeacher, setEditTeacher] = useState(null);

    useEffect(() => {
        loadTeachers();
        loadSubjects();
    }, []);

    async function loadTeachers() {
        const { data, error } = await fetchTeachers();
        if (error) return alert(error.message);
        setTeachers(data);
    }

    async function loadSubjects() {
        const { data, error } = await fetchSubjectNames();
        if (error) return alert(error.message);
        setSubjects(data);
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

            <div className="manage-category">
                <ManageTeachersHeader setShowModal={setShowModal} />
                <TeacherTable
                    teachers={teachers}
                    setEditTeacher={setEditTeacher}
                    fetchTeachers={loadTeachers}
                />
            </div>
        </>
    );
}
