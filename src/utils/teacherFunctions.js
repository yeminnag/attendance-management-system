import { supabase } from "../../supabase.js";
import { normalizeUsername, usernameToAuthEmail } from "@/utils/teacherAuth.js";

export async function fetchTeachers() {
    return supabase
        .from("profiles")
        .select("id, email, name, role, username, teacher_subjects(subject_id, subjects(name))")
        .eq("role", "teacher")
        .order("name", { ascending: true });
}

export async function isUsernameTaken(username) {
    const { data } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", normalizeUsername(username))
        .maybeSingle();

    return Boolean(data);
}

export async function createTeacherAccount({ name, username, password }) {
    return supabase.auth.signUp({
        email: usernameToAuthEmail(username),
        password,
        options: {
            data: { name, role: "teacher", username: normalizeUsername(username) },
        },
    });
}

export async function assignTeacherSubjects(teacherId, subjectIds) {
    if (subjectIds.length === 0) return { error: null };

    return supabase.from("teacher_subjects").insert(
        subjectIds.map((subjectId) => ({
            teacher_id: teacherId,
            subject_id: subjectId,
        }))
    );
}

export async function updateTeacherProfile(teacherId, { name }) {
    return supabase.from("profiles").update({ name }).eq("id", teacherId);
}

export async function replaceTeacherSubjects(teacherId, subjectIds) {
    await supabase.from("teacher_subjects").delete().eq("teacher_id", teacherId);
    return assignTeacherSubjects(teacherId, subjectIds);
}

export async function deleteTeacherProfile(id) {
    return supabase.from("profiles").delete().eq("id", id);
}
