import { useEffect, useState } from "react";
import { toggleListSelection } from "@/utils/subjectFunctions.js";
import {
    replaceTeacherSubjects,
    updateTeacherProfile,
} from "@/utils/teacherFunctions.js";

export function EditTeacherPanel({ editTeacher, setEditTeacher, subjects, fetchTeachers }) {
    const [assignedSubjects, setAssignedSubjects] = useState([]);

    useEffect(() => {
        if (!editTeacher) return;
        setAssignedSubjects(
            (editTeacher.teacher_subjects ?? []).map((ts) => ts.subject_id)
        );
    }, [editTeacher]);

    async function saveTeacher() {
        const { error: profileError } = await updateTeacherProfile(editTeacher.id, {
            name: editTeacher.name,
        });

        if (profileError) return alert(profileError.message);

        const { error: assignError } = await replaceTeacherSubjects(
            editTeacher.id,
            assignedSubjects
        );
        if (assignError) return alert(assignError.message);

        setEditTeacher(null);
        fetchTeachers();
    }

    return (
        <>
            {editTeacher && (
                <div className="modal-overlay" onClick={() => setEditTeacher(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="title">教員を更新</div>
                        <div className="form">
                            <div className="form-detail">
                                <div className="input-box">
                                    <label>名前</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editTeacher.name}
                                        onChange={(e) =>
                                            setEditTeacher({ ...editTeacher, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="input-box">
                                    <label>ユーザー名</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editTeacher.username ?? "—"}
                                        disabled
                                    />
                                </div>
                            </div>
                            <h4>担当授業</h4>
                            <div className="form-button">
                                <div className="input-box">
                                    <label>授業選択</label>
                                    <div className="days-group">
                                        {subjects.map((subject) => (
                                            <button
                                                key={subject.id}
                                                type="button"
                                                className={
                                                    assignedSubjects.includes(subject.id)
                                                        ? "day-btn active"
                                                        : "day-btn"
                                                }
                                                onClick={() =>
                                                    setAssignedSubjects((prev) =>
                                                        toggleListSelection(prev, subject.id)
                                                    )
                                                }
                                            >
                                                {subject.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="form-btn">
                                <button onClick={saveTeacher}>更新</button>
                                <button id="cancel" onClick={() => setEditTeacher(null)}>
                                    キャンセル
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
