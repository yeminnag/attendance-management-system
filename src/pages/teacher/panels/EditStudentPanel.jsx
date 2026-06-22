import { useEffect, useState } from "react";
import { StationPicker, CommuteStationsPicker } from "@/components/StationPicker.jsx";
import { buildCommutePayload } from "@/services/stationService.js";
import { toggleListSelection } from "@/utils/subjectFunctions.js";
import {
    fetchStudentSubjectIds,
    mergeSubjectIdsForTeacherUpdate,
    setStudentSubjects,
    updateStudent,
} from "@/utils/studentFunctions.js";

export function EditStudentPanel({
    setEditStudent,
    editStudent,
    fetchSubject,
    editStudentSubjects,
    setEditStudentSubjects,
    fetchStudents,
    isAdmin,
    subjectIds,
}) {
    const [nearestStation, setNearestStation] = useState(null);
    const [commuteStations, setCommuteStations] = useState([]);

    useEffect(() => {
        if (!editStudent) return;
        setNearestStation(editStudent.nearest_station ?? null);
        setCommuteStations(editStudent.commute_stations ?? []);
    }, [editStudent]);

    async function updateStudent() {
        const commutePayload = isAdmin ? buildCommutePayload(nearestStation, commuteStations) : {};

        const updateData = isAdmin
            ? {
                name: editStudent.name,
                student_number: editStudent.student_number,
                email: editStudent.email,
                ...commutePayload,
            }
            : {
                name: editStudent.name,
                student_number: editStudent.student_number,
            };

        const { error } = await updateStudent(editStudent.id, updateData);

        if (error) return alert(error.message);

        let finalSubjectIds = editStudentSubjects;

        if (!isAdmin) {
            const { data: existing, error: existingError } = await fetchStudentSubjectIds(
                editStudent.id
            );

            if (existingError) return alert(existingError.message);

            finalSubjectIds = mergeSubjectIdsForTeacherUpdate({
                existingSubjectIds: (existing ?? []).map((row) => row.subject_id),
                editedSubjectIds: editStudentSubjects,
                teacherSubjectIds: subjectIds,
            });
        }

        const { error: subjectError } = await setStudentSubjects(
            editStudent.id,
            finalSubjectIds
        );
        if (subjectError) return alert(subjectError.message);

        setEditStudent(null);
        setEditStudentSubjects([]);
        fetchStudents();
    }

    function toggleEditStudentSubject(subjectId) {
        if (!isAdmin && !subjectIds.includes(String(subjectId))) return;

        setEditStudentSubjects((prev) => toggleListSelection(prev, subjectId));    }

    const visibleSubjects = isAdmin
        ? fetchSubject
        : fetchSubject.filter((s) => subjectIds.includes(String(s.id)));

    const previewLines = buildCommutePayload(nearestStation, commuteStations).commute_lines;

    return (
        <>
            {editStudent && (
                <div className="modal-overlay" onClick={() => setEditStudent(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="title">学生内容を更新</div>
                        <div className="form">
                            <div className="form-detail">
                                <div className="input-box">
                                    <label>名前</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editStudent.name}
                                        onChange={(e) =>
                                            setEditStudent({ ...editStudent, name: e.target.value })
                                        }
                                    />
                                </div>
                                {isAdmin && (
                                    <div className="input-box">
                                        <label>メール</label>
                                        <input
                                            type="email"
                                            className="input-field"
                                            value={editStudent.email || ""}
                                            onChange={(e) =>
                                                setEditStudent({ ...editStudent, email: e.target.value })
                                            }
                                        />
                                    </div>
                                )}
                            </div>
                            <h4>詳細情報</h4>
                            <div className="form-button">
                                <div className="input-box">
                                    <label>学生番号</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={editStudent.student_number || ""}
                                        onChange={(e) =>
                                            setEditStudent({
                                                ...editStudent,
                                                student_number: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                {isAdmin && (
                                    <>
                                        <div className="input-box station-field">
                                            <StationPicker
                                                label="最寄駅"
                                                value={nearestStation}
                                                onChange={setNearestStation}
                                                placeholder="例: 新宿"
                                            />
                                        </div>
                                        <div className="input-box station-field">
                                            <CommuteStationsPicker
                                                label="通い駅（通学ルート）"
                                                value={commuteStations}
                                                onChange={setCommuteStations}
                                            />
                                        </div>
                                        {previewLines.length > 0 && (
                                            <div className="commute-lines-preview">
                                                <label>利用路線</label>
                                                <div className="commute-lines-tags">
                                                    {previewLines.map((line) => (
                                                        <span key={line} className="commute-line-tag">{line}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="input-box">
                                    <label>{isAdmin ? "受講選択" : "担当授業"}</label>
                                    <div className="days-group">
                                        {visibleSubjects.map((subject) => (
                                            <button
                                                key={subject.id}
                                                type="button"
                                                className={
                                                    editStudentSubjects.includes(subject.id)
                                                        ? "day-btn active"
                                                        : "day-btn"
                                                }
                                                onClick={() => toggleEditStudentSubject(subject.id)}
                                            >
                                                {subject.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="form-btn">
                                <button onClick={updateStudent}>更新</button>
                                <button id="cancel" onClick={() => setEditStudent(null)}>
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
