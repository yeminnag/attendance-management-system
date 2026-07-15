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
    const normalized = normalizeUsername(username);
    const email = usernameToAuthEmail(normalized);

    const { data: byUsername } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("username", normalized)
        .maybeSingle();

    if (byUsername?.role === "teacher") return true;

    const { data: byEmail } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("email", email)
        .maybeSingle();

    return byEmail?.role === "teacher";
}

export async function createTeacherWithAuth({ name, username, password, subjectIds = [] }) {
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return { error: new Error("認証が必要です") };
    }

    let response;
    try {
        response = await fetch("/api/manage-teacher-auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                name,
                username,
                password,
                subjectIds,
            }),
        });
    } catch {
        return {
            error: new Error(
                "教員 API に接続できません。dev サーバーを再起動するか、Vercel にデプロイしてください。"
            ),
        };
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        const message =
            result.error ??
            (response.status === 404
                ? "教員 API が見つかりません。dev サーバーを再起動してください。"
                : "教員の追加に失敗しました");
        return { error: new Error(message) };
    }

    return { data: result, error: null };
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
    const {
        data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
        return { error: new Error("認証が必要です") };
    }

    let response;
    try {
        response = await fetch("/api/manage-teacher-auth", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
                action: "delete",
                teacherId: id,
            }),
        });
    } catch {
        return {
            error: new Error(
                "教員 API に接続できません。dev サーバーを再起動するか、Vercel にデプロイしてください。"
            ),
        };
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
        return {
            error: new Error(result.error ?? "教員の削除に失敗しました"),
        };
    }

    return { error: null };
}
