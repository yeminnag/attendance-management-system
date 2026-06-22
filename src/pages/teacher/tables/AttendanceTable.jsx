import { useState, useEffect } from "react";

import { useAttendanceSession } from "@/context/AttendanceSessionContext.jsx";

import { useAuth } from "@/context/AuthContext.jsx";

import { formatTimeRange, getTodayDateString } from "@/utils/dateTimeFunctions.js";

import {

    ATTENDANCE_STATUS,

    buildAttendanceRecords,

    endClassSession,

    fetchStudentsForSubject,

    fetchTodayAttendanceStatus,

    getScheduledClassEnd,

    insertAttendanceRecords,

    insertSkippedAttendanceForSubject,

    upsertActiveClassSession,

    upsertSkippedClassSession,

} from "@/utils/attendanceFunctions.js";

import { fetchSubjectsOrdered, getSubjectsForToday } from "@/utils/subjectFunctions.js";



export function AttendanceTable() {

    const { session, sessionRef, startSession, clearSession } = useAttendanceSession();

    const { canEditSubject, user } = useAuth();

    const { classStarted, currentSubject, students, checkIns, classStartTime, classEndTime } = session;



    const [subjects, setSubjects] = useState([]);

    const [skippedSubject, setSkippedSubject] = useState([]);

    const [endedSubjects, setEndedSubjects] = useState([]);

    const todaySubjects = getSubjectsForToday(subjects);



    useEffect(() => {

        loadSubjects();

        loadTodayStatus();

    }, []);



    async function loadSubjects() {

        const { data, error } = await fetchSubjectsOrdered();

        if (error) return alert(error.message);

        setSubjects(data);

    }



    async function loadTodayStatus() {

        const { endedSubjectIds, skippedSubjectIds, error } = await fetchTodayAttendanceStatus();

        if (error) return;

        setEndedSubjects(endedSubjectIds);

        setSkippedSubject(skippedSubjectIds);

    }



    async function startClass(subject) {

        if (!canEditSubject(subject.id)) return;



        const classStartTime = new Date().toISOString();

        const classEndTime = getScheduledClassEnd(subject);

        const today = getTodayDateString();



        const { data: sessionRecord, error: sessionError } = await upsertActiveClassSession({

            teacherId: user.id,

            subjectId: subject.id,

            startedAt: classStartTime,

            date: today,

        });



        if (sessionError) return alert(sessionError.message);



        const { students: enrolledStudents, error } = await fetchStudentsForSubject(subject.id);

        if (error) return alert(error.message);



        startSession({

            subject,

            students: enrolledStudents,

            classStartTime,

            classEndTime,

            classSessionId: sessionRecord.id,

        });

    }



    async function skipClass(subject) {

        if (!canEditSubject(subject.id)) return;



        const today = getTodayDateString();

        const now = new Date().toISOString();



        const { error: sessionError } = await upsertSkippedClassSession({

            teacherId: user.id,

            subjectId: subject.id,

            timestamp: now,

            date: today,

        });



        if (sessionError) return alert(sessionError.message);



        setSkippedSubject((prev) => [...prev, String(subject.id)]);



        const { error } = await insertSkippedAttendanceForSubject(subject.id, today);

        if (error) return alert(error.message);

    }



    async function endClass() {

        const active = sessionRef.current;

        const {

            currentSubject: activeSubject,

            students: enrolledStudents,

            checkIns: activeCheckIns,

            classStartTime: activeStartTime,

            classEndTime: activeEndTime,

            classSessionId,

        } = active;



        if (!activeSubject || !activeStartTime || !activeEndTime) return;



        const records = buildAttendanceRecords({

            students: enrolledStudents,

            checkIns: activeCheckIns,

            subjectId: activeSubject.id,

            classStartTime: activeStartTime,

        });



        const { error } = await insertAttendanceRecords(records);

        if (error) return alert(error.message);



        if (classSessionId) {

            const { error: sessionError } = await endClassSession(

                classSessionId,

                new Date().toISOString()

            );

            if (sessionError) return alert(sessionError.message);

        }



        setEndedSubjects((prev) => [...prev, String(activeSubject.id)]);

        clearSession();

        loadTodayStatus();

        alert("出席を保存しました");

    }



    return (

        <table className="table-layout classes">

            <thead>

                <tr>

                    <th>授業</th>

                    <th>時間</th>

                    <th>科目</th>

                    <th></th>

                </tr>

            </thead>

            <tbody>

                {todaySubjects.length === 0 ? (

                    <tr>

                        <td colSpan="4">今日は授業がありません。</td>

                    </tr>

                ) : (

                    todaySubjects.map((subject) => (

                        <tr

                            key={subject.id}

                            className={

                                endedSubjects.includes(String(subject.id))

                                    ? "class-ended"

                                    : skippedSubject.includes(String(subject.id))

                                    ? "class-skipped"

                                    : ""

                            }

                        >

                            <td>

                                {classStarted && currentSubject?.id === subject.id ? (

                                    <span>

                                        {subject.name}

                                        <span className="live-badge"> ● live</span>

                                    </span>

                                ) : (

                                    subject.name

                                )}

                            </td>

                            <td>{formatTimeRange(subject.start_time, subject.end_time)}</td>

                            <td>{subject.type}</td>

                            <td>

                                {!canEditSubject(subject.id) ? (

                                    <span className="no-action">担当外</span>

                                ) : classStarted && currentSubject?.id === subject.id ? (

                                    <button className="form-btn end" onClick={endClass}>

                                        終了

                                    </button>

                                ) : skippedSubject.includes(String(subject.id)) ? (

                                    <span>休講でした。</span>

                                ) : endedSubjects.includes(String(subject.id)) ? (

                                    <span>終了しました。</span>

                                ) : (

                                    <>

                                        <button

                                            disabled={classStarted}

                                            onClick={() => startClass(subject)}

                                        >

                                            開始

                                        </button>

                                        <button

                                            disabled={classStarted}

                                            onClick={() => skipClass(subject)}

                                        >

                                            休講

                                        </button>

                                    </>

                                )}

                            </td>

                        </tr>

                    ))

                )}

            </tbody>

        </table>

    );

}

