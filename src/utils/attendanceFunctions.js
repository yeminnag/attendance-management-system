import { supabase } from "../../supabase.js";
import { getTodayDateString } from "@/utils/dateTimeFunctions.js";

export const ATTENDANCE_STATUS = {
    PRESENT: "出席",
    LATE: "遅刻",
    ABSENT: "欠席",
    SKIPPED: "休講",
};

export const EDITABLE_ATTENDANCE_STATUSES = [
    ATTENDANCE_STATUS.PRESENT,
    ATTENDANCE_STATUS.LATE,
    ATTENDANCE_STATUS.ABSENT,
];

export const LATES_PER_ABSENT = 3; // algorithm for attendance

export function countsAsPresent(status) {
    return status === ATTENDANCE_STATUS.PRESENT || status === ATTENDANCE_STATUS.LATE;
}

export function summarizeAttendanceRecords(records) {
    const counted = records.filter((record) => record.status !== ATTENDANCE_STATUS.SKIPPED);
    const total = counted.length;

    if (total === 0) {
        return {
            total: 0,
            present: 0,
            late: 0,
            absent: 0,
            lateAsAbsent: 0,
            remainingLate: 0,
            effectivePresent: 0,
            effectiveAbsent: 0,
            rate: 0,
        };
    }

    const present = counted.filter((record) => record.status === ATTENDANCE_STATUS.PRESENT).length;
    const late = counted.filter((record) => record.status === ATTENDANCE_STATUS.LATE).length;
    const absent = counted.filter((record) => record.status === ATTENDANCE_STATUS.ABSENT).length;
    const lateAsAbsent = Math.floor(late / LATES_PER_ABSENT);
    const remainingLate = late % LATES_PER_ABSENT;

    return {
        total,
        present,
        late,
        absent,
        lateAsAbsent,
        remainingLate,
        effectivePresent: present + remainingLate,
        effectiveAbsent: absent + lateAsAbsent,
        rate: Math.round(((present + remainingLate) / total) * 100),
    };
}

export function getAttendanceRate(records) {
    return summarizeAttendanceRecords(records).rate;
}

function parseTimeOnDate(baseDate, timeStr) {
    const base = new Date(baseDate);
    const [hours, minutes, seconds = 0] = timeStr.split(":").map(Number);
    const result = new Date(base);
    result.setHours(hours, minutes, seconds, 0);
    return result;
}

export function getScheduledClassEnd(subject, referenceDate = new Date()) {
    return parseTimeOnDate(referenceDate, subject.end_time).toISOString();
}

export function resolveAttendanceStatus({
    checkInTime,
    classStartTime,
    trainDelayAtCheckIn = false,
}) {
    if (!checkInTime) return ATTENDANCE_STATUS.ABSENT;

    const minutesAfterStart = (new Date(checkInTime) - new Date(classStartTime)) / 60000;

    if (minutesAfterStart <= 1) return ATTENDANCE_STATUS.PRESENT;
    if (minutesAfterStart <= 20) return ATTENDANCE_STATUS.LATE;
    if (minutesAfterStart <= 30) {
        return trainDelayAtCheckIn ? ATTENDANCE_STATUS.LATE : ATTENDANCE_STATUS.ABSENT;
    }
    return ATTENDANCE_STATUS.ABSENT;
}

export function formatMinutesAfterStart(checkInTime, classStartTime) {
    if (!checkInTime || !classStartTime) return "";
    const minutes = Math.max(
        0,
        Math.round((new Date(checkInTime) - new Date(classStartTime)) / 60000)
    );
    return `${minutes}分`;
}

export async function fetchTodayAttendanceStatus(date = getTodayDateString()) {
    const { data, error } = await supabase
        .from("attendance")
        .select("subject_id, status")
        .eq("date", date);

    if (error) return { endedSubjectIds: [], skippedSubjectIds: [], error };

    const ended = new Set();
    const skipped = new Set();
    const grouped = (data ?? []).reduce((acc, record) => {
        if (!acc[record.subject_id]) acc[record.subject_id] = [];
        acc[record.subject_id].push(record.status);
        return acc;
    }, {});

    for (const [subjectId, statuses] of Object.entries(grouped)) {
        if (statuses.every((s) => s === ATTENDANCE_STATUS.SKIPPED)) {
            skipped.add(subjectId);
        } else {
            ended.add(subjectId);
        }
    }

    return {
        endedSubjectIds: [...ended],
        skippedSubjectIds: [...skipped],
        error: null,
    };
}

export async function fetchStudentsForSubject(subjectId) {
    const { data, error } = await supabase
        .from("student_subjects")
        .select(`
            students(
                id,
                name,
                student_number,
                nearest_station,
                commute_stations,
                commute_lines
            )
        `)
        .eq("subject_id", subjectId);

    if (error) return { students: [], error };

    const students = Object.values(
        (data ?? []).reduce((acc, row) => {
            acc[row.students.id] = acc[row.students.id] || row.students;
            return acc;
        }, {})
    );

    return { students, error: null };
}

export async function upsertActiveClassSession({ teacherId, subjectId, startedAt, date }) {
    return supabase
        .from("class_sessions")
        .upsert(
            {
                teacher_id: teacherId,
                subject_id: subjectId,
                date,
                started_at: startedAt,
                ended_at: null,
                status: "active",
            },
            { onConflict: "subject_id,date" }
        )
        .select("id")
        .single();
}

export async function upsertSkippedClassSession({ teacherId, subjectId, timestamp, date }) {
    return supabase.from("class_sessions").upsert(
        {
            teacher_id: teacherId,
            subject_id: subjectId,
            date,
            started_at: timestamp,
            ended_at: timestamp,
            status: "skipped",
        },
        { onConflict: "subject_id,date" }
    );
}

export async function endClassSession(classSessionId, endedAt) {
    return supabase
        .from("class_sessions")
        .update({ ended_at: endedAt, status: "ended" })
        .eq("id", classSessionId);
}

export function buildAttendanceRecords({
    students,
    checkIns,
    subjectId,
    classStartTime,
    date = getTodayDateString(),
}) {
    return students.map((student) => {
        const checkIn = checkIns[student.id];
        return {
            student_id: student.id,
            subject_id: subjectId,
            date,
            status: resolveAttendanceStatus({
                checkInTime: checkIn?.time,
                classStartTime,
                trainDelayAtCheckIn: checkIn?.trainDelayAtCheckIn,
            }),
        };
    });
}

export async function insertAttendanceRecords(records) {
    if (records.length === 0) return { data: [], error: null };

    return supabase.from("attendance").upsert(records, {
        onConflict: "student_id,subject_id,date",
    });
}

export async function insertSkippedAttendanceForSubject(subjectId, date = getTodayDateString()) {
    const { data, error: studentError } = await supabase
        .from("student_subjects")
        .select("students(id)")
        .eq("subject_id", subjectId);

    if (studentError) return { error: studentError };

    const records = (data ?? []).map((row) => ({
        student_id: row.students.id,
        subject_id: subjectId,
        date,
        status: ATTENDANCE_STATUS.SKIPPED,
    }));

    return insertAttendanceRecords(records);
}

export async function updateAttendanceStatus(attendanceId, status) {
    return supabase.from("attendance").update({ status }).eq("id", attendanceId);
}

export async function fetchStudentAttendance(studentId) {
    return supabase
        .from("attendance")
        .select("*, subjects(name, type, course_name)")
        .eq("student_id", studentId);
}
