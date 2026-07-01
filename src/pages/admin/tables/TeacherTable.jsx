import { deleteTeacherProfile } from "@/utils/teacherFunctions.js";

export function TeacherTable({ teachers, setEditTeacher, setAnalyticsTeacher, fetchTeachers }) {
    async function removeTeacher(id) {
        if (!confirm("この教員を削除しますか？")) return;

        const { error } = await deleteTeacherProfile(id);
        if (error) return alert(error.message);
        fetchTeachers();
    }

    return (
        <table className="table-layout subject" style={{ margin: "16px 24px" }}>
            <thead>
                <tr>
                    <th>名前</th>
                    <th>ユーザー名</th>
                    <th>担当授業</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>
                {teachers.length === 0 ? (
                    <tr>
                        <td colSpan={4} className="empty-row">
                            教員が登録されていません
                        </td>
                    </tr>
                ) : (
                    teachers.map((teacher) => (
                        <tr key={teacher.id}>
                            <td>
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => setAnalyticsTeacher(teacher)}
                                >
                                    {teacher.name}
                                </button>
                            </td>
                            <td>{teacher.username ?? "—"}</td>
                            <td>
                                {(teacher.teacher_subjects ?? [])
                                    .map((ts) => ts.subjects?.name)
                                    .filter(Boolean)
                                    .join("、") || "—"}
                            </td>
                            <td>
                                <div className="action-menu">
                                    <button className="three-dots-btn">
                                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#e3e3e3"><path d="M240-400q-33 0-56.5-23.5T160-480q0-33 23.5-56.5T240-560q33 0 56.5 23.5T320-480q0 33-23.5 56.5T240-400Zm240 0q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm240 0q-33 0-56.5-23.5T640-480q0-33 23.5-56.5T720-560q33 0 56.5 23.5T800-480q0 33-23.5 56.5T720-400Z"/></svg>
                                    </button>
                                    <div className="action-tooltip">
                                        <button
                                            className="tooltip-btn edit-btn"
                                            onClick={() => setEditTeacher(teacher)}
                                        >
                                            編集
                                        </button>
                                        <button
                                            className="tooltip-btn delete-btn"
                                            onClick={() => removeTeacher(teacher.id)}
                                        >
                                            削除
                                        </button>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    );
}
