import { getAttendanceRate } from "@/utils/attendanceFunctions.js";
import { filterAttendanceBySubjectIds } from "@/utils/subjectGroupFunctions.js";

function escapeCsv(value) {
    const str = String(value ?? "");
    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob(["\uFEFF" + content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

function filterAttendance(attendance, startDate, endDate) {
    let filtered = attendance;
    if (startDate) filtered = filtered.filter((a) => a.date >= startDate);
    if (endDate) filtered = filtered.filter((a) => a.date <= endDate);
    return filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function getAttendancePercentage(records) {
    return getAttendanceRate(records);
}

export function buildAttendanceExport({
    student,
    courseGroups,
    attendance,
    startDate,
    endDate,
}) {
    const filteredAttendance = filterAttendance(attendance, startDate, endDate);

    const summary = courseGroups.map((course) => {
        const subjectRecords = filterAttendanceBySubjectIds(filteredAttendance, course.subjectIds);
        return {
            subjectName: course.courseName,
            subjectType: course.subjectType,
            slotNames: course.slotNames,
            attendanceRate: getAttendancePercentage(subjectRecords),
            recordCount: subjectRecords.length,
        };
    });

    const overallRate =
        summary.length === 0
            ? 0
            : Math.round(summary.reduce((sum, s) => sum + s.attendanceRate, 0) / summary.length);

    const records = filteredAttendance.map((record) => ({
        date: record.date,
        subjectName: record.subjects?.name ?? "",
        courseName: record.subjects?.course_name || record.subjects?.name || "",
        subjectType: record.subjects?.type ?? "",
        status: record.status,
    }));

    return {
        student: {
            name: student.name,
            studentNumber: student.student_number,
        },
        dateRange: {
            start: startDate || null,
            end: endDate || null,
        },
        summary,
        overallRate,
        records,
    };
}

export function downloadAttendanceExport(exportData, format) {
    const { student, summary, overallRate, records } = exportData;
    const baseName = `${student.name}_出席記録`;

    if (format === "json") {
        downloadFile(JSON.stringify(exportData, null, 2), `${baseName}.json`, "application/json");
        return;
    }

    const delimiter = format === "tsv" ? "\t" : ",";
    const lines = [];

    lines.push(["学生名", student.name].join(delimiter));
    lines.push(["学生番号", student.studentNumber ?? ""].join(delimiter));
    lines.push(["総合出席率", `${overallRate}%`].join(delimiter));
    lines.push("");
    lines.push(["科目名", "科目", "出席率", "記録数"].map(escapeCsv).join(delimiter));
    summary.forEach((s) => {
        lines.push(
            [s.subjectName, s.subjectType, `${s.attendanceRate}%`, s.recordCount]
                .map(escapeCsv)
                .join(delimiter)
        );
    });
    lines.push("");
    lines.push(["日付", "授業名", "科目", "ステータス"].map(escapeCsv).join(delimiter));
    records.forEach((r) => {
        lines.push(
            [r.date, r.subjectName, r.subjectType, r.status].map(escapeCsv).join(delimiter)
        );
    });

    const mimeType = format === "tsv" ? "text/tab-separated-values" : "text/csv";
    downloadFile(lines.join("\n"), `${baseName}.${format}`, mimeType);
}
