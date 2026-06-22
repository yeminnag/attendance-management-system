export const WEEKDAYS = ["月曜", "火曜", "水曜", "木曜", "金曜", "土曜", "日曜"];

export function getTodayWeekday() {
    const label = new Date().toLocaleDateString("ja-JP", { weekday: "long" });
    return label.endsWith("曜日") ? label.slice(0, -1) : label;
}

export function getTodayDateString() {
    return new Date().toISOString().slice(0, 10);
}

export function formatTodayLabel() {
    return new Date().toLocaleDateString().split("/").join(" - ");
}

export function formatClassSessionTime(isoString) {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleString("ja-JP", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function formatTimeRange(startTime, endTime) {
    const start = startTime?.slice(0, 5) ?? "—";
    const end = endTime?.slice(0, 5) ?? "—";
    return `${start} - ${end}`;
}

export function toggleWeekday(days, day) {
    return days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
}
