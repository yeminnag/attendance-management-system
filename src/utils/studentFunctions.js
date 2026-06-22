import { supabase } from "../../supabase.js";

export async function fetchAllStudents() {
    return supabase.from("students").select().order("student_number", { ascending: true });
}

export async function createStudent({ name, student_number, email, commutePayload = {} }) {
    return supabase
        .from("students")
        .insert({
            name,
            student_number,
            email,
            ...commutePayload,
        })
        .select()
        .single();
}

export async function updateStudent(id, data) {
    return supabase.from("students").update(data).eq("id", id);
}

export async function deleteStudent(id) {
    return supabase.from("students").delete().eq("id", id);
}

export async function fetchStudentSubjectsWithDetails(studentId) {
    return supabase
        .from("student_subjects")
        .select("subject_id, subjects(name, type)")
        .eq("student_id", studentId)
        .order("subjects(name)", { ascending: true });
}

export async function fetchStudentSubjectIds(studentId) {
    return supabase
        .from("student_subjects")
        .select("subject_id")
        .eq("student_id", studentId);
}

export async function setStudentSubjects(studentId, subjectIds) {
    await supabase.from("student_subjects").delete().eq("student_id", studentId);

    if (subjectIds.length === 0) return { error: null };

    return supabase.from("student_subjects").insert(
        subjectIds.map((subjectId) => ({
            student_id: studentId,
            subject_id: subjectId,
        }))
    );
}

export function mergeSubjectIdsForTeacherUpdate({
    existingSubjectIds,
    editedSubjectIds,
    teacherSubjectIds,
}) {
    const otherSubjects = existingSubjectIds.filter(
        (id) => !teacherSubjectIds.includes(String(id))
    );
    const teacherSubjects = editedSubjectIds.filter((id) =>
        teacherSubjectIds.includes(String(id))
    );
    return [...otherSubjects, ...teacherSubjects];
}
