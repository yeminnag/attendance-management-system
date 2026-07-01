import { useMemo } from "react";
import {
    computeTeacherAnalytics,
    getTeacherSubjectIds,
} from "@/utils/analyticsFunctions.js";
import { TeacherAnalyticsContent } from "@/components/analytics/AnalyticsWidgets.jsx";

export function TeacherAnalyticsPanel({
    teacher,
    attendance,
    studentSubjects,
    onClose,
}) {
    const analytics = useMemo(() => {
        if (!teacher) return null;
        return computeTeacherAnalytics({
            subjectIds: getTeacherSubjectIds(teacher),
            attendance,
            studentSubjects,
        });
    }, [teacher, attendance, studentSubjects]);

    if (!teacher || !analytics) return null;

    const subjectNames = (teacher.teacher_subjects ?? [])
        .map((ts) => ts.subjects?.name)
        .filter(Boolean);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-box analytics-modal" onClick={(event) => event.stopPropagation()}>
                <div className="analytics-modal-header">
                    <div className="title">教員分析</div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        閉じる
                    </button>
                </div>
                <TeacherAnalyticsContent
                    analytics={analytics}
                    teacherName={teacher.name}
                    subjectNames={subjectNames}
                />
            </div>
        </div>
    );
}
