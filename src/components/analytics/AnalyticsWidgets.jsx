import { getHeatmapLevel, monthlyTrendBlocks } from "@/utils/analyticsFunctions.js";

export function TeacherAnalyticsContent({ analytics, teacherName, subjectNames = [] }) {
    const {
        avgAttendance,
        lateRate,
        absentRate,
        totalRecords,
        studentCount,
        atRiskStudents,
        monthlyTrend,
    } = analytics;

    return (
        <div className="teacher-analytics">
            <div className="analytics-header">
                <div>
                    <h3>{teacherName}</h3>
                    {subjectNames.length > 0 && (
                        <p className="analytics-subjects">{subjectNames.join("、")}</p>
                    )}
                </div>
                <p className="analytics-meta">
                    学生 {studentCount} 名 · 記録 {totalRecords} 件
                </p>
            </div>

            <div className="analytics-stat-row">
                <div className="analytics-stat">
                    <span className="analytics-stat-label">平均出席率</span>
                    <span
                        className="analytics-stat-value"
                        style={{
                            color:
                                avgAttendance < 80 ? "var(--delete-btn)" : "var(--accent-color)",
                        }}
                    >
                        {totalRecords > 0 ? `${avgAttendance}%` : "—"}
                    </span>
                </div>
                <div className="analytics-stat">
                    <span className="analytics-stat-label">遅刻率</span>
                    <span className="analytics-stat-value">{totalRecords > 0 ? `${lateRate}%` : "—"}</span>
                </div>
                <div className="analytics-stat">
                    <span className="analytics-stat-label">欠席率</span>
                    <span className="analytics-stat-value">{totalRecords > 0 ? `${absentRate}%` : "—"}</span>
                </div>
            </div>

            <div className="analytics-section">
                <h4>出席トレンド（月別）</h4>
                {monthlyTrend.length === 0 ? (
                    <p className="empty-msg">トレンドデータはまだありません。</p>
                ) : (
                    <div className="monthly-trend-list">
                        {monthlyTrend.map((point) => {
                            const color =
                                point.rate < 80 ? "var(--delete-btn)" : "var(--accent-color)";
                            return (
                                <div className="monthly-trend-row" key={point.monthKey}>
                                    <span className="monthly-trend-label">{point.label}</span>
                                    <span
                                        className="monthly-trend-blocks"
                                        style={{ color }}
                                        title={`${point.label}: ${point.rate}%`}
                                    >
                                        {monthlyTrendBlocks(point.rate)}
                                    </span>
                                    <span className="monthly-trend-pct" style={{ color }}>
                                        {point.rate}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="analytics-section">
                <h4>リスクのある学生</h4>
                {atRiskStudents.length === 0 ? (
                    <p className="empty-msg">リスクのある学生はいません。</p>
                ) : (
                    <table className="table-layout home-table">
                        <thead>
                            <tr>
                                <th>学生</th>
                                <th>番号</th>
                                <th>出席率</th>
                            </tr>
                        </thead>
                        <tbody>
                            {atRiskStudents.map((student) => (
                                <tr key={student.id}>
                                    <td>{student.name}</td>
                                    <td>{student.student_number ?? "—"}</td>
                                    <td>
                                        <span className="risk-pct">{student.pct}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export function AttendanceHeatmap({ cells, year, month }) {
    const firstWeekday = new Date(year, month - 1, 1).getDay();
    const offset = firstWeekday === 0 ? 6 : firstWeekday - 1;
    const paddedCells = [
        ...Array.from({ length: offset }, (_, index) => ({ key: `pad-${index}`, pad: true })),
        ...cells.map((cell) => ({ ...cell, key: cell.date })),
    ];

    const summary = summarizeHeatmap(cells);

    return (
        <div className="heatmap-body">
            <div className="attendance-heatmap">
                <div className="heatmap-weekdays">
                    {["月", "火", "水", "木", "金", "土", "日"].map((label) => (
                        <span key={label}>{label}</span>
                    ))}
                </div>
                <div className="heatmap-grid">
                    {paddedCells.map((cell) =>
                        cell.pad ? (
                            <div className="heatmap-cell empty" key={cell.key} />
                        ) : (
                            <div
                                className={`heatmap-cell level-${getHeatmapLevel(cell.rate)}`}
                                key={cell.key}
                                title={
                                    cell.rate === null
                                        ? `${cell.day}日: データなし`
                                        : `${cell.day}日: ${cell.rate}% (${cell.count}件)`
                                }
                            >
                                <span>{cell.day}</span>
                            </div>
                        )
                    )}
                </div>
                <div className="heatmap-legend">
                    <span>低</span>
                    <span className="legend-swatch level-0" />
                    <span className="legend-swatch level-1" />
                    <span className="legend-swatch level-2" />
                    <span className="legend-swatch level-3" />
                    <span className="legend-swatch level-4" />
                    <span>高</span>
                </div>
            </div>

            <aside className="heatmap-summary">
                <div className="heatmap-summary-stat">
                    <span className="heatmap-summary-label">月平均</span>
                    <span
                        className="heatmap-summary-value"
                        style={{
                            color:
                                summary.avg !== null && summary.avg < 80
                                    ? "var(--delete-btn)"
                                    : "var(--accent-color)",
                        }}
                    >
                        {summary.avg !== null ? `${summary.avg}%` : "—"}
                    </span>
                </div>
                <div className="heatmap-summary-stat">
                    <span className="heatmap-summary-label">記録あり</span>
                    <span className="heatmap-summary-value">
                        {summary.daysWithData}日
                    </span>
                </div>
                {summary.lowest && (
                    <div className="heatmap-summary-stat">
                        <span className="heatmap-summary-label">最低</span>
                        <span className="heatmap-summary-value risk-pct">
                            {summary.lowest.day}日 {summary.lowest.rate}%
                        </span>
                    </div>
                )}
                {summary.highest && (
                    <div className="heatmap-summary-stat">
                        <span className="heatmap-summary-label">最高</span>
                        <span className="heatmap-summary-value good-pct">
                            {summary.highest.day}日 {summary.highest.rate}%
                        </span>
                    </div>
                )}
                <div className="heatmap-summary-note">
                    色が濃いほど出席率が高い日です
                </div>
            </aside>
        </div>
    );
}

function summarizeHeatmap(cells) {
    const withData = (cells ?? []).filter((cell) => cell.rate !== null);
    const avg =
        withData.length > 0
            ? Math.round(withData.reduce((sum, cell) => sum + cell.rate, 0) / withData.length)
            : null;

    const lowest = withData.reduce(
        (min, cell) => (!min || cell.rate < min.rate ? cell : min),
        null
    );
    const highest = withData.reduce(
        (max, cell) => (!max || cell.rate > max.rate ? cell : max),
        null
    );

    return {
        avg,
        daysWithData: withData.length,
        lowest,
        highest,
    };
}

export function TeacherComparisonTable({ rows, onSelectTeacher }) {
    if (rows.length === 0) {
        return <p className="empty-msg">教員比較データはまだありません。</p>;
    }

    return (
        <table className="table-layout home-table">
            <thead>
                <tr>
                    <th>教員</th>
                    <th>担当授業</th>
                    <th>平均出席率</th>
                    <th>遅刻率</th>
                    <th>欠席率</th>
                    <th>リスク学生</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr key={row.teacherId}>
                        <td>
                            {onSelectTeacher ? (
                                <button
                                    type="button"
                                    className="link-btn"
                                    onClick={() => onSelectTeacher(row.teacherId)}
                                >
                                    {row.name}
                                </button>
                            ) : (
                                row.name
                            )}
                        </td>
                        <td>{row.subjectNames.join("、")}</td>
                        <td>
                            <span
                                className={row.avgAttendance < 80 ? "risk-pct" : "good-pct"}
                            >
                                {row.avgAttendance}%
                            </span>
                        </td>
                        <td>{row.lateRate}%</td>
                        <td>{row.absentRate}%</td>
                        <td>{row.atRiskCount}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
