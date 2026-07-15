import { useState, useEffect } from "react";
import { buildAttendanceExport, downloadAttendanceExport } from "@/utils/exportAttendance.js";
import {
    EDITABLE_ATTENDANCE_STATUSES,
    getAttendanceRate,
    fetchStudentAttendance,
    updateAttendanceStatus,
} from "@/utils/attendanceFunctions.js";
import { fetchStudentSubjectsWithDetails } from "@/utils/studentFunctions.js";
import {
    filterAttendanceBySubjectIds,
    groupEnrollmentByCourse,
} from "@/utils/subjectGroupFunctions.js";
import { useAuth } from "@/context/AuthContext.jsx";

export function StudentDetailPanel({ selectedStudent }) {
    const { canEditSubject } = useAuth();
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [attendance, setAttendance] = useState([]);
    const [courseGroups, setCourseGroups] = useState([]);
    const [endDate, setEndDate] = useState("");
    const [startDate, setStartDate] = useState("");

    async function loadStudentSubjects(studentId) {
        const { data, error } = await fetchStudentSubjectsWithDetails(studentId);
        if (error) return alert(error.message);

        setCourseGroups(groupEnrollmentByCourse(data ?? []));
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
            setSelectedCourse(null);
        }
    }, [selectedStudent]);

    const canEditSelectedCourse = selectedCourse
        ? selectedCourse.subjectIds.some((subjectId) => canEditSubject(subjectId))
        : false;

    function filterByDateRange(records) {
        let filtered = records;
        if (startDate) filtered = filtered.filter((a) => a.date >= startDate);
        if (endDate) filtered = filtered.filter((a) => a.date <= endDate);
        return filtered;
    }

    function getCourseAttendance(subjectIds) {
        return filterByDateRange(filterAttendanceBySubjectIds(attendance, subjectIds)).sort(
            (a, b) => new Date(b.date) - new Date(a.date)
        );
    }

    function getOverallPercentage() {
        if (courseGroups.length === 0) return 0;
        const total = courseGroups.reduce((sum, course) => {
            return sum + getAttendancePercentage(course.subjectIds);
        }, 0);
        return Math.round(total / courseGroups.length);
    }

    function getAttendancePercentage(subjectIds) {
        const subjectAttendance = filterByDateRange(
            filterAttendanceBySubjectIds(attendance, subjectIds)
        );
        if (subjectAttendance.length === 0) return 0;
        return getAttendanceRate(subjectAttendance);
    }

    async function updateAttendance(attendanceId, newStatus, subjectId) {
        if (!canEditSubject(subjectId)) return;

        const { error } = await updateAttendanceStatus(attendanceId, newStatus);

        if (error) {
            return;
        }

        setAttendance((prev) =>
            prev.map((record) =>
                record.id === attendanceId ? { ...record, status: newStatus } : record
            )
        );
    }

    function handleDownload(format) {
        if (!selectedStudent) return;

        const exportData = buildAttendanceExport({
            student: selectedStudent,
            courseGroups,
            attendance,
            startDate,
            endDate,
        });

        downloadAttendanceExport(exportData, format);
    }

    return (
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
                                <button
                                    onClick={() => {
                                        setStartDate("");
                                        setEndDate("");
                                    }}
                                >
                                    クリア
                                </button>
                            </div>
                        </div>

                        <div className="attendance-download-bar">
                            <span className="attendance-download-label">ダウンロード</span>
                            <button type="button" onClick={() => handleDownload("csv")}>
                                CSV
                            </button>
                            <button type="button" onClick={() => handleDownload("tsv")}>
                                TSV
                            </button>
                            <button type="button" onClick={() => handleDownload("json")}>
                                JSON
                            </button>
                        </div>

                        <table className="table-layout student-table">
                            <thead>
                                <tr>
                                    <th>科目名</th>
                                    <th>科目</th>
                                    <th>出席率</th>
                                </tr>
                            </thead>
                            <tbody>
                                {courseGroups.map((course) => (
                                    <tr
                                        key={course.courseKey}
                                        onClick={() => setSelectedCourse(course)}
                                        style={{ cursor: "pointer" }}
                                    >
                                        <td>
                                            {course.courseName}
                                            {course.slotNames.length > 1 && (
                                                <small>（{course.slotNames.length}限）</small>
                                            )}
                                        </td>
                                        <td>{course.subjectType}</td>
                                        <td>{getAttendancePercentage(course.subjectIds)}%</td>
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
                        {selectedCourse && (
                            <div className="subject-attendance-detail">
                                <h3>{selectedCourse.courseName} 出席歴</h3>
                                {selectedCourse.slotNames.length > 1 && (
                                    <p className="field-hint">
                                        {selectedCourse.slotNames.join(" · ")}
                                    </p>
                                )}

                                <table className="table-layout">
                                    <thead>
                                        <tr>
                                            <th>日程</th>
                                            {selectedCourse.slotNames.length > 1 && <th>限</th>}
                                            <th>ステータス</th>
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {getCourseAttendance(selectedCourse.subjectIds).map(
                                            (record) => (
                                                <tr key={record.id}>
                                                    <td>{record.date}</td>
                                                    {selectedCourse.slotNames.length > 1 && (
                                                        <td>{record.subjects?.name ?? "—"}</td>
                                                    )}
                                                    <td>
                                                        {canEditSelectedCourse &&
                                                        canEditSubject(record.subject_id) ? (
                                                            <select
                                                                className="attendance-edit"
                                                                value={record.status}
                                                                onChange={(e) =>
                                                                    updateAttendance(
                                                                        record.id,
                                                                        e.target.value,
                                                                        record.subject_id
                                                                    )
                                                                }
                                                            >
                                                                {EDITABLE_ATTENDANCE_STATUSES.map(
                                                                    (status) => (
                                                                        <option
                                                                            key={status}
                                                                            value={status}
                                                                        >
                                                                            {status}
                                                                        </option>
                                                                    )
                                                                )}
                                                            </select>
                                                        ) : (
                                                            <span>{record.status}</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        )}
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
    );
}
