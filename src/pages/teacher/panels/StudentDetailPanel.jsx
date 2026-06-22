import { useState, useEffect } from "react";
import { buildAttendanceExport, downloadAttendanceExport } from "@/utils/exportAttendance.js";
import {
    EDITABLE_ATTENDANCE_STATUSES,
    getAttendanceRate,
    fetchStudentAttendance,
    updateAttendanceStatus,
} from "@/utils/attendanceFunctions.js";
import { fetchStudentSubjectsWithDetails } from "@/utils/studentFunctions.js";
import { useAuth } from "@/context/AuthContext.jsx";

export function StudentDetailPanel({ selectedStudent }) {
    const { canEditSubject } = useAuth();
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [ attendance, setAttendance ] = useState([]);
    const [ studentSubjects, setStudentSubjects ] = useState([]);
    const [endDate, setEndDate] = useState("");
    const [startDate, setStartDate] = useState("");

    async function loadStudentSubjects(studentId) {
        const { data, error } = await fetchStudentSubjectsWithDetails(studentId);
        if (error) return alert(error.message);

        const unique = Object.values(
            (data ?? []).reduce((acc, row) => {
                acc[row.subject_id] = acc[row.subject_id] || row;
                return acc;
            }, {})
        );
        setStudentSubjects(unique);
    }

    async function loadAttendance(studentId) {
        const { data, error } = await fetchStudentAttendance(studentId);
        if (error) return alert(error.message);
        setAttendance(data ?? []);
    }

    useEffect(() => {
        if (selectedStudent) {
            loadStudentSubjects(selectedStudent.id);
            loadAttendance(selectedStudent.id);
        }
    }, [selectedStudent]);

    const visibleSubjects = studentSubjects;
    const canEditSelectedSubject = selectedSubject
        ? canEditSubject(selectedSubject.subject_id)
        : false;
    
    function getSubjectAttendance(subjectId) {
        let subjectAttendance = attendance.filter(
            a => a.subject_id === subjectId
        );

        if (startDate) {
            subjectAttendance = subjectAttendance.filter(
                a => a.date >= startDate
            );
        }

        if (endDate) {
            subjectAttendance = subjectAttendance.filter(
                a => a.date <= endDate
            );
        }

        return subjectAttendance.sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );
    }
    function getOverallPercentage() {
        if (visibleSubjects.length === 0) return 0;
        const total = visibleSubjects.reduce((sum, s) => {
            return sum + getAttendancePercentage(s.subject_id);
        }, 0);
        return Math.round(total / visibleSubjects.length);
    }
    function getAttendancePercentage(subjectId) {
        let subjectAttendance = attendance.filter(a => a.subject_id === subjectId);
        
        if (startDate) subjectAttendance = subjectAttendance.filter(a => a.date >= startDate);
        if (endDate) subjectAttendance = subjectAttendance.filter(a => a.date <= endDate);
        
        if (subjectAttendance.length === 0) return 0;
        return getAttendanceRate(subjectAttendance);
    }
    async function updateAttendance(attendanceId, newStatus, subjectId) {
        if (!canEditSubject(subjectId)) return;

        const { error } = await updateAttendanceStatus(attendanceId, newStatus);

        if (error) {
            console.error(error);
            return;
        }

        setAttendance(prev =>
            prev.map(record =>
                record.id === attendanceId
                    ? { ...record, status: newStatus }
                    : record
            )
        );
    }

    function handleDownload(format) {
        if (!selectedStudent) return;

        const exportData = buildAttendanceExport({
            student: selectedStudent,
            studentSubjects: visibleSubjects,
            attendance,
            startDate,
            endDate,
        });

        downloadAttendanceExport(exportData, format);
    }

    return(
        <div className="student-detail-panel">
            <div className="student-details-container">
                {selectedStudent ? (
                    <>
                        <div className="student-info">
                            <h2>{selectedStudent.name}</h2>
                            <div className="date-filter">
                                <div className="input-box">
                                    <label>から </label>
                                    <input 
                                        type="date" 
                                        className="input-field"
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                    />
                                </div>
                                <div className="input-box">
                                    <label>まで </label>
                                    <input 
                                        type="date"
                                        className="input-field"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                    />
                                </div>
                                <button onClick={() => { setStartDate(""); setEndDate(""); }}>クリア</button>
                            </div>
                        </div>

                        <div className="attendance-download-bar">
                            <span className="attendance-download-label">ダウンロード</span>
                            <button type="button" onClick={() => handleDownload("csv")}>CSV</button>
                            <button type="button" onClick={() => handleDownload("tsv")}>TSV</button>
                            <button type="button" onClick={() => handleDownload("json")}>JSON</button>
                        </div>

                        <table className="table-layout student-table">
                            <thead>
                                <tr>
                                    <th>授業名</th>
                                    <th>科目</th>
                                    <th>出席率</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleSubjects.map((s) => (
                                    <tr
                                        key={s.subject_id}
                                        onClick={() => setSelectedSubject(s)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td>{s.subjects.name}</td>
                                        <td>{s.subjects.type}</td>
                                        <td>{getAttendancePercentage(s.subject_id)}%</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2}>総合出席率</td>
                                    <td>{getOverallPercentage()}%</td>
                                </tr>
                            </tfoot>
                        </table>
                        {selectedSubject && (
                            <div className="subject-attendance-detail">
                                <h3>
                                    {selectedSubject.subjects.name} 出席歴
                                </h3>

                                <table className="table-layout">
                                    <thead>
                                        <tr>
                                            <th>日程</th>
                                            <th>ステータス</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {getSubjectAttendance(selectedSubject.subject_id).map(record => (
                                            <tr key={record.id}>
                                                <td>{record.date}</td>
                                                <td>
                                                    {canEditSelectedSubject ? (
                                                        <select
                                                            className="attendance-edit"
                                                            value={record.status}
                                                            onChange={(e) =>
                                                                updateAttendance(
                                                                    record.id,
                                                                    e.target.value,
                                                                    selectedSubject.subject_id
                                                                )
                                                            }
                                                        >
                                                            {EDITABLE_ATTENDANCE_STATUSES.map((status) => (
                                                                <option key={status} value={status}>
                                                                    {status}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    ) : (
                                                        <span>{record.status}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                ) : (
                    <p>学生を選択してください</p>
                )}
            </div>
        </div>
    )
}