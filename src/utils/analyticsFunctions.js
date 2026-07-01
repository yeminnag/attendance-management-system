import { ATTENDANCE_STATUS, getAttendanceRate, summarizeAttendanceRecords } from "@/utils/attendanceFunctions.js";

const AT_RISK_THRESHOLD = 80;
const TREND_MONTHS = 6;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function isCounted(record) {
    return record.status !== ATTENDANCE_STATUS.SKIPPED;
}

export function getTeacherSubjectIds(teacher) {
    return (teacher?.teacher_subjects ?? []).map((ts) => ts.subject_id);
}

export function getStudentsForSubjects(subjectIds, studentSubjects) {
    const idSet = new Set(subjectIds.map(String));
    const studentMap = new Map();

    for (const row of studentSubjects ?? []) {
        if (!idSet.has(String(row.subject_id))) continue;
        const student = row.students;
        if (student?.id) studentMap.set(student.id, student);
    }

    return [...studentMap.values()];
}

export function filterAttendanceForTeacher(subjectIds, attendance) {
    const idSet = new Set(subjectIds.map(String));
    return (attendance ?? []).filter(
        (record) => idSet.has(String(record.subject_id)) && isCounted(record)
    );
}

export function computeTeacherAnalytics({ subjectIds, attendance, students, studentSubjects }) {
    const teacherStudents = getStudentsForSubjects(subjectIds, studentSubjects);
    const studentIdSet = new Set(teacherStudents.map((s) => s.id));
    const records = filterAttendanceForTeacher(subjectIds, attendance).filter((record) =>
        studentIdSet.has(record.student_id)
    );

    const summary = summarizeAttendanceRecords(records);
    const lateRate =
        summary.total > 0 ? Math.round((summary.late / summary.total) * 100) : 0;
    const absentRate =
        summary.total > 0
            ? Math.round(((summary.absent + summary.lateAsAbsent) / summary.total) * 100)
            : 0;

    const atRiskStudents = teacherStudents
        .map((student) => {
            const studentRecords = records.filter((record) => record.student_id === student.id);
            if (studentRecords.length === 0) return null;
            const pct = getAttendanceRate(studentRecords);
            return pct < AT_RISK_THRESHOLD ? { ...student, pct } : null;
        })
        .filter(Boolean)
        .sort((a, b) => a.pct - b.pct);

    const monthlyTrend = buildMonthlyTrend(records);

    return {
        avgAttendance: summary.rate,
        lateRate,
        absentRate,
        totalRecords: summary.total,
        studentCount: teacherStudents.length,
        atRiskStudents,
        monthlyTrend,
    };
}

function buildMonthlyTrend(records) {
    const buckets = new Map();

    for (const record of records) {
        const monthKey = record.date.slice(0, 7);
        if (!buckets.has(monthKey)) {
            buckets.set(monthKey, []);
        }
        buckets.get(monthKey).push(record);
    }

    const sortedMonths = [...buckets.keys()].sort();
    const recentMonths = sortedMonths.slice(-TREND_MONTHS);

    return recentMonths.map((monthKey) => {
        const monthRecords = buckets.get(monthKey) ?? [];
        const rate = getAttendanceRate(monthRecords);
        const [, month] = monthKey.split("-");
        return {
            label: MONTH_LABELS[Number(month) - 1] ?? monthKey,
            monthKey,
            rate,
            count: monthRecords.length,
        };
    });
}

export function monthlyTrendBlocks(rate) {
    return "█".repeat(Math.max(0, Math.round(rate / 10)));
}

export function computeTeacherComparison(teachers, attendance, studentSubjects) {
    return teachers
        .map((teacher) => {
            const subjectIds = getTeacherSubjectIds(teacher);
            const analytics = computeTeacherAnalytics({
                subjectIds,
                attendance,
                studentSubjects,
            });
            const subjectNames = (teacher.teacher_subjects ?? [])
                .map((ts) => ts.subjects?.name)
                .filter(Boolean);

            return {
                teacherId: teacher.id,
                name: teacher.name,
                subjectNames,
                avgAttendance: analytics.avgAttendance,
                lateRate: analytics.lateRate,
                absentRate: analytics.absentRate,
                atRiskCount: analytics.atRiskStudents.length,
            };
        })
        .filter((row) => row.subjectNames.length > 0)
        .sort((a, b) => a.avgAttendance - b.avgAttendance);
}

export function buildMonthlyHeatmap(attendance, year, month) {
    const daysInMonth = new Date(year, month, 0).getDate();
    const cells = [];

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const dayRecords = (attendance ?? []).filter(
            (record) => record.date === dateStr && isCounted(record)
        );

        if (dayRecords.length === 0) {
            cells.push({ date: dateStr, day, rate: null, count: 0 });
            continue;
        }

        cells.push({
            date: dateStr,
            day,
            rate: getAttendanceRate(dayRecords),
            count: dayRecords.length,
        });
    }

    return cells;
}

export function getHeatmapLevel(rate) {
    if (rate === null) return 0;
    if (rate >= 90) return 4;
    if (rate >= 80) return 3;
    if (rate >= 70) return 2;
    return 1;
}
