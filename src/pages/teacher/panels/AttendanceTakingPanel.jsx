import { useAttendanceSession } from "@/context/AttendanceSessionContext.jsx";
import { useTrainDelays } from "@/context/TrainDelayContext.jsx";
import {
    formatMinutesAfterStart,
    resolveAttendanceStatus,
} from "@/utils/attendanceFunctions.js";

export function AttendanceTakingPanel() {
    const { session, toggleCheckIn } = useAttendanceSession();
    const { getStudentDelayInfo } = useTrainDelays();
    const { classStarted, currentSubject, students, checkIns, classStartTime } = session;

    return (
        <>
            {classStarted && currentSubject && (
                <div className="attendance-panel">
                    <h4>{currentSubject.name} . 出席を記録</h4>
                    <ul className="student-attendance-list">
                        {students.map((student) => {
                            const checkIn = checkIns[student.id];
                            const previewStatus = resolveAttendanceStatus({
                                checkInTime: checkIn?.time,
                                classStartTime,
                                trainDelayAtCheckIn: checkIn?.trainDelayAtCheckIn,
                            });
                            const commuteLines = student.commute_lines ?? [];

                            return (
                                <li
                                    key={student.id}
                                    className={checkIn ? "present" : ""}
                                    onClick={() => toggleCheckIn(student.id, getStudentDelayInfo(student))}
                                >
                                    <span>
                                        {student.name}
                                        <small>( {student.student_number} )</small>
                                        {commuteLines.length > 0 && (
                                            <small className="student-commute-lines">
                                                {commuteLines.join(" · ")}
                                            </small>
                                        )}
                                    </span>
                                    <span className="check-in-meta">
                                        {checkIn ? (
                                            <>
                                                {formatMinutesAfterStart(checkIn.time, classStartTime)}
                                                {" · "}
                                                {previewStatus}
                                                {checkIn.trainDelayAtCheckIn &&
                                                    ` · 電遅${
                                                        checkIn.affectedLines?.length
                                                            ? `(${checkIn.affectedLines.join("・")})`
                                                            : ""
                                                    }`}
                                            </>
                                        ) : (
                                            "クリックして出席取り"
                                        )}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </>
    );
}
