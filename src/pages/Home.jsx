import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "../../supabase.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";
import {
    AttendanceHeatmap,
    TeacherAnalyticsContent,
    TeacherComparisonTable,
} from "@/components/analytics/AnalyticsWidgets.jsx";
import {
    buildMonthlyHeatmap,
    computeTeacherAnalytics,
    computeTeacherComparison,
} from "@/utils/analyticsFunctions.js";
import { formatClassSessionTime, formatTodayLabel, getTodayDateString } from "@/utils/dateTimeFunctions.js";
import { getSubjectsForToday } from "@/utils/subjectFunctions.js";
import { fetchTeachers } from "@/utils/teacherFunctions.js";
import { ATTENDANCE_STATUS, countsAsPresent, getAttendanceRate } from "@/utils/attendanceFunctions.js";
import { CLASS_SESSION_ACTION_LABELS, getTeacherDisplayLabel } from "@/utils/classSessionFunctions.js";
import { sendRiskStudentNotification } from "@/utils/notificationFunctions.js";

export function Home() {
    const navigate = useNavigate();
    const { isAdmin, subjectIds, profile } = useAuth();

    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [studentSubjects, setStudentSubjects] = useState([]);
    const [classSessions, setClassSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [heatmapMonth, setHeatmapMonth] = useState(() => {
        const now = new Date();
        return { year: now.getFullYear(), month: now.getMonth() + 1 };
    });
    const [sendingRisk, setSendingRisk] = useState({});
    const [sentRisk, setSentRisk] = useState({});
    const [riskError, setRiskError] = useState("");

    const todayDate = getTodayDateString();
    const todayLabel = formatTodayLabel();

    useEffect(() => {
        async function fetchAll() {
            const requests = [
                supabase.from("subjects").select("*").order("start_time", { ascending: true }),
                supabase.from("students").select("id, name, student_number, email"),
                supabase.from("attendance").select("*"),
                supabase
                    .from("student_subjects")
                    .select("subject_id, students(id, name, student_number, email)"),
            ];

            if (isAdmin) {
                requests.push(
                    fetchTeachers(),
                    supabase
                        .from("class_sessions")
                        .select("id, date, started_at, ended_at, status, profiles(name, username), subjects(name)")
                        .order("started_at", { ascending: false })
                        .limit(5)
                );
            }

            const results = await Promise.all(requests);
            const [{ data: subjectData }, { data: studentData }, { data: attendanceData }, { data: enrollmentData }] =
                results;

            setSubjects(subjectData ?? []);
            setStudents(studentData ?? []);
            setAttendance(attendanceData ?? []);
            setStudentSubjects(enrollmentData ?? []);

            if (isAdmin) {
                const { data: teacherData } = results[4];
                const { data: sessionData } = results[5];
                setTeachers(teacherData ?? []);
                setClassSessions(sessionData ?? []);
            }

            setLoading(false);
        }
        fetchAll();
    }, [isAdmin]);

    const todaySubjects = useMemo(() => getSubjectsForToday(subjects), [subjects]);

    const getSubjectPercent = useCallback(
        (subjectId) => {
            const records = attendance.filter(
                (record) =>
                    record.subject_id === subjectId && record.status !== ATTENDANCE_STATUS.SKIPPED
            );
            const studentIds = [...new Set(records.map((record) => record.student_id))];
            if (studentIds.length === 0) return 0;

            const rates = studentIds.map((studentId) =>
                getAttendanceRate(records.filter((record) => record.student_id === studentId))
            );
            return Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length);
        },
        [attendance]
    );

    const todayAttendance = useMemo(
        () =>
            attendance.filter(
                (record) => record.date === todayDate && record.status !== ATTENDANCE_STATUS.SKIPPED
            ),
        [attendance, todayDate]
    );
    const todayPresent = todayAttendance.filter((record) => countsAsPresent(record.status)).length;
    const todayTotal = todayAttendance.length;
    const todayRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : null;

    const atRiskStudents = useMemo(
        () =>
            students
                .map((student) => {
                    const records = attendance.filter(
                        (record) =>
                            record.student_id === student.id &&
                            record.status !== ATTENDANCE_STATUS.SKIPPED
                    );
                    if (records.length === 0) return null;
                    const pct = getAttendanceRate(records);
                    return pct < 80 ? { ...student, pct } : null;
                })
                .filter(Boolean)
                .sort((a, b) => a.pct - b.pct),
        [students, attendance]
    );

    const recentSessions = useMemo(
        () =>
            [...attendance
                .filter((record) => record.status !== ATTENDANCE_STATUS.SKIPPED)
                .reduce((map, record) => {
                    const key = `${record.subject_id}|${record.date}`;
                    if (!map.has(key))
                        map.set(key, { subject_id: record.subject_id, date: record.date, records: [] });
                    map.get(key).records.push(record);
                    return map;
                }, new Map()).values()]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 5)
                .map((session) => {
                    const subject = subjects.find((item) => item.id === session.subject_id);
                    const present = session.records.filter((record) =>
                        countsAsPresent(record.status)
                    ).length;
                    const absent = session.records.filter(
                        (record) => record.status === ATTENDANCE_STATUS.ABSENT
                    ).length;
                    return { ...session, subjectName: subject?.name || "不明", present, absent };
                }),
        [attendance, subjects]
    );

    const chartSubjects = useMemo(
        () =>
            subjects.filter((subject) => {
                const records = attendance.filter(
                    (record) =>
                        record.subject_id === subject.id && record.status !== ATTENDANCE_STATUS.SKIPPED
                );
                return records.length > 0;
            }),
        [subjects, attendance]
    );

    const teacherComparison = useMemo(() => {
        if (!isAdmin) return [];
        return computeTeacherComparison(teachers, attendance, studentSubjects);
    }, [isAdmin, teachers, attendance, studentSubjects]);

    const heatmapCells = useMemo(
        () => buildMonthlyHeatmap(attendance, heatmapMonth.year, heatmapMonth.month),
        [attendance, heatmapMonth]
    );

    const ownTeacherAnalytics = useMemo(() => {
        if (isAdmin || subjectIds.length === 0) return null;
        return computeTeacherAnalytics({
            subjectIds,
            attendance,
            studentSubjects,
        });
    }, [isAdmin, subjectIds, attendance, studentSubjects]);

    function shiftHeatmapMonth(delta) {
        setHeatmapMonth((current) => {
            const date = new Date(current.year, current.month - 1 + delta, 1);
            return { year: date.getFullYear(), month: date.getMonth() + 1 };
        });
    }

    function getStatusClass(subject) {
        const todayRec = attendance.filter((record) => record.subject_id === subject.id && record.date === todayDate);
        if (todayRec.length > 0) {
            if (todayRec[0].status === ATTENDANCE_STATUS.SKIPPED) return "status-skipped";
            return "status-ended";
        }
        return "status-upcoming";
    }

    function getStatusLabel(subject) {
        const todayRec = attendance.filter((record) => record.subject_id === subject.id && record.date === todayDate);
        if (todayRec.length > 0) {
            if (todayRec[0].status === ATTENDANCE_STATUS.SKIPPED) return "休講";
            return "終了";
        }
        return "予定";
    }

    function getTeacherLabel(session) {
        return getTeacherDisplayLabel(session.profiles);
    }

    async function handleSendRiskNotification(student) {
        if (sendingRisk[student.id]) return;

        setRiskError("");
        setSendingRisk((current) => ({ ...current, [student.id]: true }));

        const { error } = await sendRiskStudentNotification({
            studentId: student.id,
            attendancePct: student.pct,
        });

        setSendingRisk((current) => ({ ...current, [student.id]: false }));

        if (error) {
            setRiskError(error.message);
            return;
        }

        setSentRisk((current) => ({ ...current, [student.id]: true }));
    }

    if (loading) return <div className="home-loading">読み込み中...</div>;

    return (
        <div className="home-page">
            <div className="home-header">
                <div>
                    <h1>ダッシュボード</h1>
                    <p className="home-date">{todayLabel}</p>
                </div>
                <button type="button" className="go-btn" onClick={() => navigate("/messages")}>
                    メッセージ →
                </button>
            </div>

            <div className={`stat-cards${isAdmin ? " admin-stats" : ""}`}>
                <div className="stat-card">
                    <span className="stat-label">学生数</span>
                    <span className="stat-value">{students.length}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">授業数</span>
                    <span className="stat-value">{subjects.length}</span>
                </div>
                {isAdmin && (
                    <div className="stat-card">
                        <span className="stat-label">教員数</span>
                        <span className="stat-value">{teachers.length}</span>
                    </div>
                )}
                <div className="stat-card">
                    <span className="stat-label">今日のレート</span>
                    <span className="stat-value">{todayRate !== null ? `${todayRate}%` : "—"}</span>
                </div>
                <div className="stat-card accent">
                    <span className="stat-label">リスクのある学生</span>
                    <span className="stat-value">{atRiskStudents.length}</span>
                </div>
            </div>

            {!isAdmin && ownTeacherAnalytics && (
                <div className="home-card home-card-wide teacher-analytics-card">
                    <div className="card-header">
                        <h2>担当授業の分析</h2>
                    </div>
                    <TeacherAnalyticsContent
                        analytics={ownTeacherAnalytics}
                        teacherName={profile?.name ?? "教員"}
                    />
                </div>
            )}

            <div className="home-grid">
                <div className="home-card">
                    <div className="card-header">
                        <h2>本日のスケジュール</h2>
                        <button className="go-btn" onClick={() => navigate("/teacher/take-attendance")}>
                            出欠確認 →
                        </button>
                    </div>
                    {todaySubjects.length === 0 ? (
                        <p className="empty-msg">本日は授業がありません</p>
                    ) : (
                        <table className="table-layout home-table">
                            <thead>
                                <tr>
                                    <th>授業</th>
                                    <th>時間</th>
                                    <th>科目</th>
                                    <th>ステータス</th>
                                </tr>
                            </thead>
                            <tbody>
                                {todaySubjects.map((subject) => (
                                    <tr key={subject.id}>
                                        <td>{subject.name}</td>
                                        <td>
                                            {subject.start_time.slice(0, 5)} – {subject.end_time.slice(0, 5)}
                                        </td>
                                        <td>{subject.type}</td>
                                        <td>
                                            <span className={`status-badge ${getStatusClass(subject)}`}>
                                                {getStatusLabel(subject)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="home-card">
                    <div className="card-header">
                        <h2>授業別出席率</h2>
                    </div>
                    {chartSubjects.length === 0 ? (
                        <p className="empty-msg">出席データはまだありません</p>
                    ) : (
                        <div className="bar-chart">
                            {chartSubjects.map((subject) => {
                                const pct = getSubjectPercent(subject.id);
                                const color = pct < 80 ? "var(--delete-btn)" : "var(--accent-color)";
                                return (
                                    <div className="bar-row" key={subject.id}>
                                        <span className="bar-label">{subject.name}</span>
                                        <div className="bar-track">
                                            <div
                                                className="bar-fill"
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            />
                                        </div>
                                        <span className="bar-pct" style={{ color }}>
                                            {pct}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="home-card">
                    <div className="card-header">
                        <h2>リスクのある学生</h2>
                    </div>
                    {riskError && <p className="risk-send-error">{riskError}</p>}
                    {atRiskStudents.length === 0 ? (
                        <p className="empty-msg">リスクのある学生はいません。</p>
                    ) : (
                        <table className="table-layout home-table">
                            <thead>
                                <tr>
                                    <th>学生</th>
                                    <th>番号</th>
                                    <th>出席率</th>
                                    <th>通知</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atRiskStudents.map((student) => (
                                    <tr key={student.id}>
                                        <td>{student.name}</td>
                                        <td>{student.student_number}</td>
                                        <td>
                                            <span className="risk-pct">{student.pct}%</span>
                                        </td>
                                        <td>
                                            <button
                                                type="button"
                                                className="risk-send-btn"
                                                onClick={() => handleSendRiskNotification(student)}
                                                disabled={sendingRisk[student.id] || sentRisk[student.id]}
                                            >
                                                {sendingRisk[student.id]
                                                    ? "送信中..."
                                                    : sentRisk[student.id]
                                                      ? "送信済"
                                                      : "送信"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="home-card">
                    <div className="card-header">
                        <h2>最近の出席記録</h2>
                    </div>
                    {recentSessions.length === 0 ? (
                        <p className="empty-msg">出席記録はまだありません。</p>
                    ) : (
                        <div className="recent-list">
                            {recentSessions.map((session, index) => (
                                <div className="recent-item" key={index}>
                                    <div className="recent-left">
                                        <span className="recent-subject">{session.subjectName}</span>
                                        <span className="recent-date">{session.date}</span>
                                    </div>
                                    <div className="recent-right">
                                        <span className="pill present">{session.present} 出席</span>
                                        <span className="pill absent">{session.absent} 欠席</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <>
                        <div className="home-card home-card-wide">
                            <div className="card-header">
                                <h2>教員比較（出席率が低い順）</h2>
                                <button className="go-btn" onClick={() => navigate("/admin/teachers")}>
                                    教員管理 →
                                </button>
                            </div>
                            <TeacherComparisonTable
                                rows={teacherComparison}
                                onSelectTeacher={(teacherId) =>
                                    navigate("/admin/teachers", {
                                        state: { openAnalyticsTeacherId: teacherId },
                                    })
                                }
                            />
                        </div>

                        <div className="home-card home-card-heatmap">
                            <div className="card-header">
                                <h2>月間出席ヒートマップ</h2>
                                <div className="heatmap-nav">
                                    <button type="button" className="go-btn" onClick={() => shiftHeatmapMonth(-1)}>
                                        ←
                                    </button>
                                    <span>
                                        {heatmapMonth.year}年{heatmapMonth.month}月
                                    </span>
                                    <button type="button" className="go-btn" onClick={() => shiftHeatmapMonth(1)}>
                                        →
                                    </button>
                                </div>
                            </div>
                            <AttendanceHeatmap
                                cells={heatmapCells}
                                year={heatmapMonth.year}
                                month={heatmapMonth.month}
                            />
                        </div>

                        <div className="home-card home-card-wide">
                            <div className="card-header">
                                <h2>教員の操作</h2>
                            </div>
                            {classSessions.length === 0 ? (
                                <p className="empty-msg">教員の操作記録はまだありません。</p>
                            ) : (
                                <table className="table-layout home-table">
                                    <thead>
                                        <tr>
                                            <th>教員</th>
                                            <th>授業</th>
                                            <th>操作</th>
                                            <th>日時</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {classSessions.map((session) => (
                                            <tr key={session.id}>
                                                <td>{getTeacherLabel(session)}</td>
                                                <td>{session.subjects?.name ?? "—"}</td>
                                                <td>
                                                    <span className={`action-badge action-${session.status}`}>
                                                        {CLASS_SESSION_ACTION_LABELS[session.status] ?? session.status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span>{formatClassSessionTime(session.started_at)}</span>
                                                    {session.status === "ended" && session.ended_at && (
                                                        <span>
                                                            {" ～ "}
                                                            {formatClassSessionTime(session.ended_at)}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
