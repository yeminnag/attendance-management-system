import { supabase } from "../../supabase.js";
import { getTodayWeekday } from "@/utils/dateTimeFunctions.js";

export const SUBJECT_TYPES = ["必修", "選択"];

export function toggleListSelection(list, item) {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

export async function fetchSubjectsWithCounts() {
    return supabase
        .from("subjects")
        .select("*, student_subjects(count)")
        .order("created_at", { ascending: true });
}

export async function fetchSubjectsOrdered() {
    return supabase.from("subjects").select("*").order("start_time", { ascending: true });
}

export async function fetchSubjectNames() {
    return supabase.from("subjects").select("id, name").order("name");
}

export async function createSubject({ name, type, start_time, end_time, days }) {
    return supabase
        .from("subjects")
        .insert({ name, type, start_time, end_time, days })
        .select();
}

export async function updateSubject(subject) {
    return supabase
        .from("subjects")
        .update({
            name: subject.name,
            type: subject.type,
            start_time: subject.start_time,
            end_time: subject.end_time,
            days: subject.days,
        })
        .eq("id", subject.id);
}

export async function deleteSubject(id) {
    return supabase.from("subjects").delete().eq("id", id);
}

export async function hasSubjectTimeConflict({ start_time, end_time, days }) {
    const { data, error } = await supabase
        .from("subjects")
        .select("start_time, end_time, days");

    if (error) throw error;

    return (data ?? []).some((subject) => {
        const hasDayOverlap = days.some((day) => subject.days?.includes(day));
        const hasTimeOverlap = start_time < subject.end_time && end_time > subject.start_time;
        return hasDayOverlap && hasTimeOverlap;
    });
}

export function filterSubjects(subjects, { nameFilter = "", typeFilter = "all", dayFilter = "all" }) {
    return subjects.filter((subject) => {
        if (nameFilter && !subject.name.toLowerCase().includes(nameFilter.toLowerCase())) {
            return false;
        }
        if (typeFilter !== "all" && subject.type !== typeFilter) {
            return false;
        }
        if (dayFilter !== "all" && !subject.days?.includes(dayFilter)) {
            return false;
        }
        return true;
    });
}

export function getSubjectsForToday(subjects, weekday = getTodayWeekday()) {
    return subjects.filter((subject) => subject.days?.includes(weekday));
}
