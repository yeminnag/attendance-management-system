import { useState, useEffect } from "react";
import { supabase } from "../../supabase.js";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

//utilities imports
import { formatClassSessionTime, formatTodayLabel, getTodayDateString } from "@/utils/dateTimeFunctions.js";
import { getSubjectsForToday } from "@/utils/subjectFunctions.js";
import { ATTENDANCE_STATUS, countsAsPresent, getAttendanceRate } from "@/utils/attendanceFunctions.js";
import { CLASS_SESSION_ACTION_LABELS, getTeacherDisplayLabel } from "@/utils/classSessionFunctions.js";

import "../styles/home.css";

export function Home() {
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [attendance, setAttendance] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [classSessions, setClassSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    const todayDate = getTodayDateString();
    const todayLabel = formatTodayLabel();

    useEffect(() => {
        //DATABASEからデータを取り込み
        async function fetchAll() {
            //ADMINだったら教員のデータが必要じゃないから、それ以外のデータを持ち、ARRAYに入れる
            const requests = [
                supabase.from("subjects").select("*").order("start_time", { ascending: true }),
                supabase.from("students").select("id, name, student_number, email"),
                supabase.from("attendance").select("*"),
            ];

            //ADMINの場合教員のデータも入れる
            if (isAdmin) {
                requests.push(
                    supabase.from("profiles").select("id").eq("role", "teacher"),
                    supabase.from("class_sessions")
                        .select("id, date, started_at, ended_at, status, profiles(name, username), subjects(name)")
                        .order("started_at", { ascending: false })
                        .limit(5)
                );
            }
            
            const results = await Promise.all(requests);

            //ARRAY DESTRUCTIONを行い、変数を設定
            const[{ data: subjectData }, { data: studentData },{ data: attendanceData }] = results; 
            setSubjects(subjectData);
            setStudents(studentData);
            setAttendance(attendanceData);

            if (isAdmin) {
                const { data: teacherData } = results[3];
                const { data: sessionData } = results[4];
                setTeachers(teacherData || []);
                setClassSessions(sessionData || []);
            }
            
            setLoading(false);
        }
        fetchAll();
    }, [isAdmin]);

    const todaySubjects = getSubjectsForToday(subjects);

    
    function getSubjectPercent(subjectId) {
        //attendanceテーブルから適切なデータを取得
        const records = attendance.filter(
            (a) => a.subject_id === subjectId && a.status !== ATTENDANCE_STATUS.SKIPPED
        );
        
        
        const studentIds = [...new Set(records.map((a) => a.student_id))];
        if (studentIds.length === 0) return 0;

        const rates = studentIds.map((studentId) =>
            getAttendanceRate(records.filter((a) => a.student_id === studentId))
        );
        return Math.round(rates.reduce((sum, rate) => sum + rate, 0) / rates.length);
    }

    const todayAttendance = attendance.filter(
        (a) => a.date === todayDate && a.status !== ATTENDANCE_STATUS.SKIPPED
    );
    const todayPresent = todayAttendance.filter((a) => countsAsPresent(a.status)).length;
    const todayTotal = todayAttendance.length;
    const todayRate = todayTotal > 0 ? Math.round((todayPresent / todayTotal) * 100) : null;

    const atRiskStudents = students.map(student => {
        const records = attendance.filter(
            (a) => a.student_id === student.id && a.status !== ATTENDANCE_STATUS.SKIPPED
        );
        if (records.length === 0) return null;
        const pct = getAttendanceRate(records);
        return pct < 80 ? { ...student, pct } : null;
    }).filter(Boolean).sort((a, b) => a.pct - b.pct);

    const recentSessions = [...attendance
        .filter((a) => a.status !== ATTENDANCE_STATUS.SKIPPED)
        .reduce((map, a) => {
            const key = a.subject_id + "|" + a.date;
            if (!map.has(key)) map.set(key, { subject_id: a.subject_id, date: a.date, records: [] });
            map.get(key).records.push(a);
            return map;
        }, new Map()).values()
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5)
     .map(session => {
        const subject = subjects.find(s => s.id === session.subject_id);
        const present = session.records.filter((r) => countsAsPresent(r.status)).length;
        const absent = session.records.filter((r) => r.status === ATTENDANCE_STATUS.ABSENT).length;
        return { ...session, subjectName: subject?.name || "不明", present, absent };
    });


    const chartSubjects = subjects.filter(s => {
        const records = attendance.filter(
            (a) => a.subject_id === s.id && a.status !== ATTENDANCE_STATUS.SKIPPED
        );
        return records.length > 0;
    });

    

    function getStatusClass(subject) {
        const todayRec = attendance.filter(a => a.subject_id === subject.id && a.date === todayDate);
        if (todayRec.length > 0) {
            if (todayRec[0].status === ATTENDANCE_STATUS.SKIPPED) return "status-skipped";
            return "status-ended";
        }
        return "status-upcoming";
    }
    function getStatusLabel(subject) {
        const todayRec = attendance.filter(a => a.subject_id === subject.id && a.date === todayDate);
        if (todayRec.length > 0) {
            if (todayRec[0].status === ATTENDANCE_STATUS.SKIPPED) return "休講";
            return "終了";
        }
        return "予定";
    }

    function getTeacherLabel(session) {
        return getTeacherDisplayLabel(session.profiles);
    }

    if (loading) return <div className="home-loading">読み込み中...</div>;

    return (
        <div className="home-page">
            <div className="home-header">
                <div>
                    <h1>ダッシュボード</h1>
                    <p className="home-date">{todayLabel}</p>
                </div>
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

            <div className="home-grid">
                <div className="home-card">
                    <div className="card-header">
                        <h2>本日のスケジュール</h2>
                        <button className="go-btn" onClick={() => navigate("/teacher/take-attendance")}>出欠確認 →</button>
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
                                {todaySubjects.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.name}</td>
                                        <td>{s.start_time.slice(0,5)} – {s.end_time.slice(0,5)}</td>
                                        <td>{s.type}</td>
                                        <td><span className={`status-badge ${getStatusClass(s)}`}>{getStatusLabel(s)}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="home-card">
                    <div className="card-header"><h2>授業別出席率</h2></div>
                    {chartSubjects.length === 0 ? (
                        <p className="empty-msg">出席データはまだありません</p>
                    ) : (
                        <div className="bar-chart">
                            {chartSubjects.map(s => {
                                const pct = getSubjectPercent(s.id);
                                const color = pct < 80 ? "var(--delete-btn)" : "var(--accent-color)";
                                return (
                                    <div className="bar-row" key={s.id}>
                                        <span className="bar-label">{s.name}</span>
                                        <div className="bar-track">
                                            <div className="bar-fill" style={{ width: `${pct}%`, backgroundColor: color }} />
                                        </div>
                                        <span className="bar-pct" style={{ color }}>{pct}%</span>
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
                    {atRiskStudents.length === 0 ? (
                        <p className="empty-msg">リスクのある学生はいません。</p>
                    ) : (
                        <table className="table-layout home-table">
                            <thead>
                                <tr>
                                    <th>学生</th>
                                    <th>番号</th>
                                    <th>出席率</th>
                                    <th>メール</th>
                                </tr>
                            </thead>
                            <tbody>
                                {atRiskStudents.map(s => (
                                    <tr key={s.id}>
                                        <td>{s.name}</td>
                                        <td>{s.student_number}</td>
                                        <td><span className="risk-pct">{s.pct}%</span></td>
                                        <td>
                                            {s.email
                                                ? <a className="email-link" href={`mailto:${s.email}?subject=出席率警告&body=${encodeURIComponent(
                                                        `${s.name} 様
                                                        現在の出席率は ${s.pct}% となっており、基準である80%を下回っています。
                                                        出席率が低い状態が続くと、成績や単位取得に影響する可能性がありますので、今後の授業には積極的に出席してください。
                                                        ご不明な点がございましたら担当教員までご連絡ください。
                                                        よろしくお願いいたします。`
                                                )}`}>
                                                    送信
                                                  </a>
                                                : <span className="no-email">メールは登録されていません。</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <div className="home-card">
                    <div className="card-header"><h2>最近の出席記録</h2></div>
                    {recentSessions.length === 0 ? (
                        <p className="empty-msg">出席記録はまだありません。</p>
                    ) : (
                        <div className="recent-list">
                            {recentSessions.map((s, i) => (
                                <div className="recent-item" key={i}>
                                    <div className="recent-left">
                                        <span className="recent-subject">{s.subjectName}</span>
                                        <span className="recent-date">{s.date}</span>
                                    </div>
                                    <div className="recent-right">
                                        <span className="pill present">{s.present} 出席</span>
                                        <span className="pill absent">{s.absent} 欠席</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {isAdmin && (
                    <div className="home-card home-card-wide">
                        <div className="card-header">
                            <h2>教員の操作</h2>
                            <button className="go-btn" onClick={() => navigate("/admin/teachers")}>
                                教員管理 →
                            </button>
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
                                                <span>
                                                    {formatClassSessionTime(session.started_at)}
                                                </span>
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
                )}
            </div>
        </div>
    );
}
