import { createClient } from "@supabase/supabase-js";

const STUDENT_EMAIL_DOMAIN = "@students.internal";

function studentNumberToAuthEmail(studentNumber) {
    return `${String(studentNumber ?? "").trim()}${STUDENT_EMAIL_DOMAIN}`;
}

function getEnv(env = process.env) {
    return {
        supabaseUrl: env.SUPABASE_URL || env.VITE_SUPABASE_URL || "",
        supabaseAnonKey: env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || "",
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || "",
    };
}

export async function runManageStudentAuth({ method, body, authorization, env = process.env }) {
    if (method !== "POST") {
        return { status: 405, body: { error: "Method not allowed" } };
    }

    const { supabaseUrl, supabaseAnonKey, serviceRoleKey } = getEnv(env);

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
        return {
            status: 500,
            body: {
                error:
                    "SUPABASE_SERVICE_ROLE_KEY が未設定です。.env に追加してください（Supabase → Settings → API → service_role）。",
            },
        };
    }

    if (!authorization?.startsWith("Bearer ")) {
        return { status: 401, body: { error: "認証が必要です" } };
    }

    const accessToken = authorization.slice(7);
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });

    const {
        data: { user },
        error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
        return { status: 401, body: { error: "認証が無効です" } };
    }

    const { data: adminProfile, error: profileError } = await userClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError || adminProfile?.role !== "admin") {
        return { status: 403, body: { error: "管理者のみ実行できます" } };
    }

    const { studentId, password } = body ?? {};
    if (!studentId) {
        return { status: 400, body: { error: "studentId が必要です" } };
    }

    if (password !== undefined && password !== null && password !== "" && password.length < 6) {
        return { status: 400, body: { error: "パスワードは6文字以上にしてください" } };
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: student, error: studentError } = await adminClient
        .from("students")
        .select("id, name, student_number")
        .eq("id", studentId)
        .maybeSingle();

    if (studentError || !student) {
        return { status: 404, body: { error: "学生が見つかりません" } };
    }

    if (!student.student_number) {
        return { status: 400, body: { error: "学籍番号が設定されていません" } };
    }

    const email = studentNumberToAuthEmail(student.student_number);
    const hasPassword = Boolean(password);

    const { data: studentProfile, error: studentProfileError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("student_id", studentId)
        .eq("role", "student")
        .maybeSingle();

    if (studentProfileError) {
        return { status: 500, body: { error: studentProfileError.message } };
    }

    if (studentProfile) {
        const authUpdates = { email };
        if (hasPassword) {
            authUpdates.password = password;
        }

        const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
            studentProfile.id,
            authUpdates
        );

        if (authUpdateError) {
            return { status: 500, body: { error: authUpdateError.message } };
        }

        const { error: profileUpdateError } = await adminClient
            .from("profiles")
            .update({ name: student.name, email })
            .eq("id", studentProfile.id);

        if (profileUpdateError) {
            return { status: 500, body: { error: profileUpdateError.message } };
        }

        return { status: 200, body: { ok: true, created: false } };
    }

    if (!hasPassword) {
        return { status: 200, body: { ok: true, created: false, skipped: true } };
    }

    const { error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            role: "student",
            name: student.name,
            student_id: studentId,
        },
    });

    if (createError) {
        return { status: 500, body: { error: createError.message } };
    }

    return { status: 200, body: { ok: true, created: true } };
}

export default async function handler(req, res) {
    const result = await runManageStudentAuth({
        method: req.method,
        body: req.body,
        authorization: req.headers.authorization,
    });

    return res.status(result.status).json(result.body);
}
