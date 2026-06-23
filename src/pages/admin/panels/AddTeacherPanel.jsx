import { useState } from "react";
import { normalizeUsername, validateUsername } from "@/utils/teacherAuth.js";
import {
    createTeacherWithAuth,
    isUsernameTaken,
} from "@/utils/teacherFunctions.js";
import { toggleListSelection } from "@/utils/subjectFunctions.js";

export function AddTeacherPanel({ showModal, setShowModal, subjects, fetchTeachers }) {
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [assignedSubjects, setAssignedSubjects] = useState([]);

    function resetForm() {
        setName("");
        setUsername("");
        setPassword("");
        setAssignedSubjects([]);
    }

    async function addTeacher() {
        const normalizedUsername = normalizeUsername(username);
        const usernameError = validateUsername(normalizedUsername);

        if (!name || !normalizedUsername || !password) {
            return alert("名前、ユーザー名、パスワードを入力してください");
        }

        if (usernameError) return alert(usernameError);

        if (password.length < 6) {
            return alert("パスワードは6文字以上にしてください");
        }

        if (await isUsernameTaken(normalizedUsername)) {
            return alert("このユーザー名は既に使われています");
        }

        const { data, error } = await createTeacherWithAuth({
            name,
            username: normalizedUsername,
            password,
            subjectIds: assignedSubjects,
        });

        if (error) return alert(error.message);

        resetForm();
        setShowModal(false);
        fetchTeachers();

        const recoveredNote = data.recovered
            ? "\n（以前の登録の残りを修復しました）"
            : "";
        alert(
            `教員を追加しました。${recoveredNote}\nユーザー名: ${data.username}\n担当授業: ${data.assignedCount}件`
        );
    }

    return (
        <>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="title">教員を追加</div>
                        <div className="form">
                            <div className="form-detail">
                                <div className="input-box">
                                    <label>名前</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="input-box">
                                    <label>ユーザー名</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        placeholder="yomi-teacher-01"
                                    />
                                </div>
                                <div className="input-box">
                                    <label>パスワード</label>
                                    <input
                                        type="password"
                                        className="input-field"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
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
                                <button onClick={addTeacher}>追加</button>
                                <button id="cancel" onClick={() => setShowModal(false)}>
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
