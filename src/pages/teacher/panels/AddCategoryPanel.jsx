import { useState } from "react";
import { WEEKDAYS, toggleWeekday } from "@/utils/dateTimeFunctions.js";
import { createSubject, hasSubjectTimeConflict } from "@/utils/subjectFunctions.js";



export function AddCategoryPanel({ showModal, setShowModal, fetchSubjects }) {

    const [addSubject, setAddSubject] = useState("");
    const [courseName, setCourseName] = useState("");
    const [addSubjectType, setAddSubjectType] = useState("必修");
    const [startTime, setStartTime] = useState("");
    const [endTime, setEndTime] = useState("");
    const [days, setDays] = useState([]);

    async function addSubjects() {
        if (!addSubject || !addSubjectType) {
            return alert("授業名を入力してください");
        }try{
            const hasConflict = await hasSubjectTimeConflict({
                start_time: startTime,
                end_time: endTime,
                days,
            });
            if (hasConflict) return alert("その時間帯には既に授業があります");
        } catch (err) {
            return alert(err.message);
        }

        const { error } = await createSubject({
            name: addSubject,
            course_name: courseName,
            type: addSubjectType,
            start_time: startTime,
            end_time: endTime,
            days,
        });
        if (error) return alert(error.message);

        setAddSubject("");
        setCourseName("");
        setShowModal(false);
        fetchSubjects?.();
    }

    return (
        <>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="title">授業内容を追加</div>
                        <div className="form">
                            <div className="form-detail">
                                <div className="input-box">
                                    <label htmlFor="subject">授業名</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="グラフィック応用 一限目"
                                        name="subject"
                                        value={addSubject}
                                        onChange={(e) => setAddSubject(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="input-box">
                                    <label htmlFor="course_name">科目名</label>
                                    <input
                                        type="text"
                                        id="course_name"
                                        className="input-field"
                                        placeholder="グラフィック応用"
                                        value={courseName}
                                        onChange={(e) => setCourseName(e.target.value)}
                                    />
                                </div>

                                <div className="input-box">
                                    <label>科目種類</label>
                                    <div className="radio-group">
                                        <input
                                            id="compulsory"
                                            type="radio"
                                            value="必修"
                                            checked={addSubjectType === "必修"}
                                            onChange={(e) => setAddSubjectType(e.target.value)}
                                        />

                                        <label htmlFor="compulsory">必修</label>
                                        <input
                                            id="elective"
                                            type="radio"
                                            value="選択"
                                            checked={addSubjectType === "選択"}
                                            onChange={(e) => setAddSubjectType(e.target.value)}
                                        />
                                        <label htmlFor="elective">選択</label>
                                    </div>
                                </div>
                            </div>
                            <h4>日時情報</h4>
                            <div className="date-time">
                                <div className="input-box">
                                    <label htmlFor="start_time">開始</label>
                                    <input
                                        id="start_time"
                                        type="time"
                                        className="input-field time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                    />
                                </div>
                                <div className="input-box">
                                    <label htmlFor="end_time">終了</label>
                                    <input
                                        id="end_time"
                                        type="time"
                                        className="input-field time"
                                        value={endTime}
                                        onChange={(e) => setEndTime(e.target.value)}
                                    />
                                </div>
                                <div className="input-box">
                                    <label>日程</label>
                                    <div className="days-group">
                                        {WEEKDAYS.map((day) => (
                                            <button
                                                key={day}
                                                type="button"
                                                className={days.includes(day) ? "day-btn active" : "day-btn"}
                                                onClick={() => setDays((prev) => toggleWeekday(prev, day))}
                                            >
                                                {day}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="form-btn">
                                <button onClick={addSubjects}>追加</button>
                                <button onClick={() => setShowModal(false)} id="cancel"> キャンセル </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

