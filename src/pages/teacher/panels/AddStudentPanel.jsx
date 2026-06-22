import { useState } from "react";
import { StationPicker, CommuteStationsPicker } from "@/components/StationPicker.jsx";
import { buildCommutePayload } from "@/services/stationService.js";
import { toggleListSelection } from "@/utils/subjectFunctions.js";
import { createStudent, setStudentSubjects } from "@/utils/studentFunctions.js";

export function AddStudentPanel({ showModal, setShowModal, fetchSubject, fetchStudents }) {

    const [newStudentName, setNewStudentName] = useState("");
    const [newStudentNumber, setNewStudentNumber] = useState("");
    const [newStudentSubjects, setNewStudentSubjects] = useState([]);
    const [newStudentEmail, setNewStudentEmail] = useState("");
    const [nearestStation, setNearestStation] = useState(null);
    const [commuteStations, setCommuteStations] = useState([]);
    function resetForm() {
        setNewStudentName("");
        setNewStudentNumber("");
        setNewStudentEmail("");
        setNewStudentSubjects([]);
        setNearestStation(null);
        setCommuteStations([]);
    }

    async function addStudent() {
        if (!newStudentName) return alert("学生名を入力してください");
        const commutePayload = buildCommutePayload(nearestStation, commuteStations);
        const { data, error } = await createStudent({
            name: newStudentName,
            student_number: newStudentNumber,
            email: newStudentEmail,
            commutePayload,
        });

        if (error) return alert(error.message);
        if (newStudentSubjects.length > 0) {
            const { error: subjectError } = await setStudentSubjects(data.id, newStudentSubjects);
            if (subjectError) return alert(subjectError.message);
        }
        resetForm();
        setShowModal(false);
        fetchStudents();
    }
    const previewLines = buildCommutePayload(nearestStation, commuteStations).commute_lines;

    return (
        <>
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="title">学生内容を追加</div>
                        <div className="form">
                            <div className="form-detail">
                                <div className="input-box">
                                    <label>名前</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={newStudentName}
                                        onChange={(e) => setNewStudentName(e.target.value)}
                                    />
                                </div>
                                <div className="input-box">
                                    <label>メール</label>
                                    <input
                                        type="email"
                                        className="input-field"
                                        value={newStudentEmail}
                                        onChange={(e) => setNewStudentEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                            <h4>詳細情報</h4>
                            <div className="form-button">
                                <div className="input-box">
                                    <label>学生番号</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={newStudentNumber}
                                        onChange={(e) => setNewStudentNumber(e.target.value)}
                                    />
                                </div>
                                <div className="input-box station-field">
                                    <StationPicker
                                        label="最寄駅"
                                        value={nearestStation}
                                        onChange={setNearestStation}
                                    />
                                </div>
                                <div className="input-box station-field">
                                    <CommuteStationsPicker
                                        label="通い駅"
                                        value={commuteStations}
                                        onChange={setCommuteStations}
                                    />
                                </div>
                                {previewLines.length > 0 && (
                                    <div className="commute-lines-preview">
                                        <label>利用路線</label>
                                        <div className="commute-lines-tags">
                                            {previewLines.map((line) => (
                                                <span key={line} className="commute-line-tag">
                                                    {line}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                <div className="input-box">
                                    <label>受講選択</label>
                                    <div className="days-group">
                                        {fetchSubject.map((subject) => (
                                            <button
                                                key={subject.id}
                                                type="button"
                                                className={
                                                    newStudentSubjects.includes(subject.id)
                                                        ? "day-btn active"
                                                        : "day-btn"
                                                }
                                                onClick={() =>
                                                    setNewStudentSubjects((prev) =>
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
                                <button onClick={addStudent}>追加</button>
                                <button id="cancel" onClick={() => setShowModal(false)}>キャンセル</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );

}

