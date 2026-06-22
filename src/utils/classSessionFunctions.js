export const CLASS_SESSION_ACTION_LABELS = {
    active: "開始",
    ended: "終了",
    skipped: "休講",
};

export function getTeacherDisplayLabel(profile) {
    if (!profile) return "—";
    return profile.username ? `${profile.name} (@${profile.username})` : profile.name;
}
