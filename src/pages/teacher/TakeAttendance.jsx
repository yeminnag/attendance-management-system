import "@/App.css";
import "../../styles/teacher/take-attendance.css"
import { AttendanceTable } from "./tables/AttendanceTable";
import { AttendancePageHeader } from "./headers/AttendancePageHeader";
import { TrainDelayPanel } from "./panels/TrainDelayPanel";
import { AttendanceTakingPanel } from "./panels/AttendanceTakingPanel";

export function TakeAttendance() {
   return (
        <div className="take-attendance">
            <AttendancePageHeader />
            <div className="take-attendance-layout">
                <div className="take-attendance-main">
                    <AttendanceTable />
                    <AttendanceTakingPanel />
                </div>
                <TrainDelayPanel />
            </div>
        </div>
    );
}
