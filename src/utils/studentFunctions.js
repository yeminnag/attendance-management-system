import { supabase } from "../../supabase.js";
import { formatStudentAuthError, normalizeStudentNumber, studentNumberToAuthEmail } from "@/utils/studentAuth.js";

export async function fetchAllStudents() {
    return supabase.from("students").select().order("student_number", { ascending: true });
}

export async function createStudent({ name, student_number, email, commutePayload = {} }) {
    return supabase
        .from("students")
        .insert({
            name,
            student_number: normalizeStudentNumber(student_number) || null,
            email,
            ...commutePayload,
        })
        .select()
        .single();
}

export async function isStudentNumberTaken(studentNumber) {
    const normalized = normalizeStudentNumber(studentNumber);
    if (!normalized) return false;

    const { data } = await supabase
        .from("students")
        .select("id")
        .eq("student_number", normalized)
        .maybeSingle();

    return Boolean(data);
}

export async function createStudentAccount({ name, studentNumber, password, studentId }) {
    const normalized = normalizeStudentNumber(studentNumber);

    return supabase.auth.signUp({
        email: studentNumberToAuthEmail(normalized),
        password,
        options: {
            data: {
                name,
                role: "student",
                student_id: studentId,
            },
        },
    });
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
        .select("subject_id, subjects(name, type, course_name)")
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

export async function fetchStudentAuthProfile(studentId) {
    return supabase
        .from("profiles")
        .select("id")
        .eq("student_id", studentId)
        .eq("role", "student")
        .maybeSingle();
}

export async function createStudentLogin({ studentId, name, studentNumber, password }) {
    const { error: apiError } = await manageStudentAuth({ studentId, password });

    if (!apiError) {
        return { error: null, usedFallback: false };
    }

    const canFallback =
        apiError.message.includes("接続できません") ||
        apiError.message.includes("SUPABASE_SERVICE_ROLE_KEY") ||
        apiError.message.includes("Server configuration");

    if (!canFallback) {
        return { error: apiError, usedFallback: false };
    }

    const { data: existingProfile } = await fetchStudentAuthProfile(studentId);
    if (existingProfile) {
        return {
            error: new Error(
                "パスワード更新には SUPABASE_SERVICE_ROLE_KEY が必要です。.env に追加して dev サーバーを再起動してください。"
            ),
            usedFallback: false,
        };
    }

    const { data: authData, error: signUpError } = await createStudentAccount({
        name,
        studentNumber,
        password,
        studentId,
    });

    if (signUpError) {
        return {
            error: new Error(formatStudentAuthError(signUpError.message)),
            usedFallback: true,
        };
    }

    if (!authData.user) {
        return { error: new Error("学生ログインアカウントの作成に失敗しました"), usedFallback: true };
    }

    return { error: null, usedFallback: true };
}

export async function manageStudentAuth({ studentId, password }) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return { error: new Error("認証が必要です") };
    }

    let response;
    try {
        response = await fetch("/api/manage-student-auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                studentId,
                password: password || undefined,
            }),
        });
    } catch {
        return {
            error: new Error(
                "ログイン API に接続できません。Vercel にデプロイ済みか、vercel dev で起動しているか確認してください。"
            ),
        };
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            result.error ??
            (response.status === 404
                ? "ログイン API が見つかりません。dev サーバーを再起動してください。"
                : "ログイン情報の更新に失敗しました");
        return { error: new Error(message) };
    }

    return { data: result, error: null };
}
