import { useAuth } from "@/context/AuthContext.jsx";
import { deleteStudent, fetchStudentSubjectIds } from "@/utils/studentFunctions.js";

export function StudentListPanel({
    fetchStudent,
    fetchStudents,
    selectedStudent,
    setSelectedStudent,
    setEditStudentSubjects,
    setEditStudent,
    isAdmin,
    subjectIds,
}) {
    const { canManageStudentSubjects } = useAuth();

    async function removeStudent(id) {
        const { error } = await deleteStudent(id);
        if (error) return alert(error.message);
        fetchStudents();
    }

    async function openEditModal(student) {
        const { data, error } = await fetchStudentSubjectIds(student.id);

        if (error) return alert(error.message);

        const studentSubjectIds = data.map((s) => s.subject_id);
        if (!isAdmin && !canManageStudentSubjects(studentSubjectIds)) {
            return alert("この学生を編集する権限がありません");
        }

        setEditStudentSubjects(studentSubjectIds);
        setEditStudent(student);
    }

    return (
        <div className="student-list-panel">
            <ul>
                {fetchStudent.map((student) => {
                    const showActions = isAdmin || subjectIds.length > 0;

                    return (
                        <li
                            key={student.id}
                            className={selectedStudent?.id === student.id ? "active" : ""}
                            onClick={() => setSelectedStudent(student)}
                        >
                            {student.name}
                            <small>({student.student_number ? student.student_number : ""})</small>
                            {showActions && (
                                <div className="action-menu" onClick={(e) => e.stopPropagation()}>
                                    <button className="three-dots-btn">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400Z"/></svg>
                                    </button>
                                    <div className="action-tooltip">
                                        <button className="tooltip-btn edit-btn" onClick={() => openEditModal(student)}>
                                            編集
                                        </button>
                                        {isAdmin && (
                                            <button className="tooltip-btn delete-btn" onClick={() => removeStudent(student.id)}>
                                                削除
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}
