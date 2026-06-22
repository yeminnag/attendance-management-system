import { WEEKDAYS, toggleWeekday } from "@/utils/dateTimeFunctions.js";
import { updateSubject } from "@/utils/subjectFunctions.js";

export function EditCategoryPanel({ fetchSubjects, editSubject, setEditSubject }) {
    async function saveSubject() {
        const { error } = await updateSubject(editSubject);
        if (error) return alert(error.message);
        setEditSubject(null);
        fetchSubjects();
    }

    function toggleEditDay(day) {
        setEditSubject({
            ...editSubject,
          days: toggleWeekday(editSubject.days || [], day),

        });
    }

    return (
        <>
            {editSubject && (
                <div className="modal-overlay" onClick={() => setEditSubject(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="title">授業内容を更新</div>
                        <div className="form">
                            <div className="form-detail">
                                <div className="input-box">
                                    <label>授業名</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editSubject.name}
                                        onChange={(e) =>
                                            setEditSubject({ ...editSubject, name: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="input-box">
                                    <label>科目種類</label>
                                    <div className="radio-group">
                                        <input
                                            id="edit-compulsory"
                                            type="radio"
                                            value="必修"
                                            checked={editSubject.type === "必修"}
                                            onChange={(e) =>
                                                setEditSubject({ ...editSubject, type: e.target.value })
                                            }
                                        />
                                        <label htmlFor="edit-compulsory">必修</label>
                                        <input
                                            id="edit-elective"
                                            type="radio"
                                            value="選択"
                                            checked={editSubject.type === "選択"}
                                            onChange={(e) =>
                                                setEditSubject({ ...editSubject, type: e.target.value })
                                            }
                                        />
                                        <label htmlFor="edit-elective">選択</label>
                                    </div>
                                </div>
                            </div>
                            <h4>日時情報</h4>
                            <div className="date-time">
                                <div className="input-box">
                                    <label>開始</label>
                                    <input
                                        type="time"
                                        className="input-field time"
                                        value={editSubject.start_time || ""}
                                        onChange={(e) =>
                                            setEditSubject({ ...editSubject, start_time: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="input-box">
                                    <label>終了</label>
                                    <input
                                        type="time"
                                        className="input-field time"
                                        value={editSubject.end_time || ""}
                                        onChange={(e) =>
                                            setEditSubject({ ...editSubject, end_time: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="input-box">
                                    <label>日程</label>
                                    <div className="days-group">
                                        {WEEKDAYS.map((day) => (
                                            <button
                                                key={day}
                                                type="button"
                                                className={
                                                    editSubject.days?.includes(day)
                                                        ? "day-btn active"
                                                        : "day-btn"
                                                }
                                                onClick={() => toggleEditDay(day)}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="form-btn">
                                <button onClick={saveSubject}>更新</button>
                                <button id="cancel" onClick={() => setEditSubject(null)}>
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

